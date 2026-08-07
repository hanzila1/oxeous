"""
GraniteClient — thin abstraction over Ollama (local) and watsonx.ai (production).
Handles tool-calling prompt construction, response parsing, and one retry on bad output.
"""
from __future__ import annotations

import json
import re
import logging
from typing import Any, Optional

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

# ── System prompt template ────────────────────────────────────────────────────

SYSTEM_PROMPT_TEMPLATE = """You are Oxeous, an AI assistant for satellite Earth observation analysis.
Your ONLY job is to:
1. Extract the user's intent and return a structured JSON tool_call.
2. When given validated analysis results, explain ONLY those results — never invent data.

RULES:
- Never make up statistics, locations, or dates.
- Always output a JSON object wrapped in <tool_call>...</tool_call> tags.
- If you cannot determine the analysis type, use "true_color_imagery" as a safe default.
- Dates must be ISO format (YYYY-MM-DD).

AVAILABLE TOOLS:
{tool_definitions}

OUTPUT FORMAT — always return exactly this JSON inside <tool_call> tags:
<tool_call>
{{
  "tool_name": "<one of the tool names above>",
  "parameters": {{
    "location": "<human-readable location>",
    "bbox": [minLng, minLat, maxLng, maxLat],
    "current_period": {{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}},
    "comparison_period": {{"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}},
    "preferred_product": "<product name>"
  }}
}}
</tool_call>
"""

EXPLANATION_SYSTEM_PROMPT = """You are Oxeous, an Earth observation AI. You are given validated satellite analysis results.
Write a concise, factual 2-3 sentence explanation of the results.
RULES:
- Only reference facts in the provided statistics and provenance — never add extra claims.
- Do not speculate about causes.
- Mention the data source and acquisition dates.
- Write for a non-expert audience.
"""


class GraniteClient:
    """Unified Granite LLM client (Ollama or watsonx.ai)."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._http = httpx.AsyncClient(timeout=60.0)

    async def aclose(self) -> None:
        await self._http.aclose()

    # ── Public API ────────────────────────────────────────────────────────────

    async def extract_intent(
        self,
        prompt: str,
        conversation_history: list[dict[str, str]],
        tool_definitions: list[dict[str, Any]],
        viewport_hint: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Send the user prompt and conversation history to Granite.
        Returns a parsed dict with {tool_name, parameters}.
        Retries once on parse failure.
        """
        system = SYSTEM_PROMPT_TEMPLATE.format(
            tool_definitions=json.dumps(tool_definitions, indent=2)
        )

        messages = [
            *conversation_history[-6:],  # keep last 3 turns
            {"role": "user", "content": self._enrich_prompt(prompt, viewport_hint)},
        ]

        for attempt in range(2):
            raw = await self._generate(system, messages)
            parsed = self._parse_tool_call(raw)
            if parsed:
                return parsed
            logger.warning("Granite tool-call parse failed on attempt %d", attempt + 1)
            # Add correction feedback for the retry
            messages.append({"role": "assistant", "content": raw})
            messages.append({
                "role": "user",
                "content": "Your response could not be parsed. Please output ONLY a valid <tool_call>...</tool_call> JSON block.",
            })

        raise GraniteParseError("Granite failed to produce a valid tool_call after 2 attempts")

    async def generate_explanation(
        self,
        tool_result: dict[str, Any],
    ) -> str:
        """Generate a data-backed explanation from validated analysis results."""
        prompt = (
            f"Explain these satellite analysis results:\n{json.dumps(tool_result, indent=2)}"
        )
        return await self._generate(EXPLANATION_SYSTEM_PROMPT, [{"role": "user", "content": prompt}])

    # ── Private helpers ───────────────────────────────────────────────────────

    def _enrich_prompt(self, prompt: str, viewport: Optional[dict[str, Any]]) -> str:
        if viewport:
            return (
                f"{prompt}\n\n[Context: map viewport center={viewport.get('center')}, "
                f"zoom={viewport.get('zoom')}, bbox={viewport.get('bbox')}]"
            )
        return prompt

    async def _generate(self, system: str, messages: list[dict[str, str]]) -> str:
        if self.settings.granite_deployment == "watsonx":
            return await self._watsonx_generate(system, messages)
        return await self._ollama_generate(system, messages)

    async def _ollama_generate(self, system: str, messages: list[dict[str, str]]) -> str:
        payload = {
            "model": self.settings.granite_model,
            "messages": [{"role": "system", "content": system}, *messages],
            "stream": False,
            "options": {"temperature": 0.0, "num_predict": 512},
        }
        resp = await self._http.post(
            f"{self.settings.granite_ollama_url}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["message"]["content"]

    async def _watsonx_generate(self, system: str, messages: list[dict[str, str]]) -> str:
        """watsonx.ai text generation via IBM Cloud REST API."""
        token = await self._get_watsonx_token()
        combined_prompt = f"<|system|>\n{system}\n" + "\n".join(
            f"<|{m['role']}|>\n{m['content']}" for m in messages
        ) + "\n<|assistant|>"

        payload = {
            "model_id": "ibm/granite-3-8b-instruct",
            "input": combined_prompt,
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": 512,
                "temperature": 0.0,
            },
            "project_id": self.settings.watsonx_project_id,
        }
        resp = await self._http.post(
            f"{self.settings.watsonx_url}/ml/v1/text/generation",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            params={"version": "2024-05-01"},
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["results"][0]["generated_text"]

    async def _get_watsonx_token(self) -> str:
        resp = await self._http.post(
            "https://iam.cloud.ibm.com/identity/token",
            data={
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": self.settings.watsonx_api_key,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()["access_token"]

    @staticmethod
    def _parse_tool_call(text: str) -> Optional[dict[str, Any]]:
        """Extract and parse the <tool_call>...</tool_call> JSON block."""
        match = re.search(r"<tool_call>\s*(\{.*?})\s*</tool_call>", text, re.DOTALL)
        if not match:
            # Fallback: look for raw JSON object in the response
            match = re.search(r"\{[^{}]*\"tool_name\"[^{}]*\}", text, re.DOTALL)
        if not match:
            return None
        try:
            return json.loads(match.group(1) if "<tool_call>" in text else match.group(0))
        except json.JSONDecodeError:
            return None


class GraniteParseError(RuntimeError):
    pass
