"""
Trajectory Logger — captures every agent step to a JSON file.
Required deliverable: agent trajectories showing instructions → tool calls → results.
"""
from __future__ import annotations

import json
import os
import time
import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

TRAJECTORY_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "trajectories")


class TrajectoryLogger:
    """Records a full agent trajectory for one request."""

    def __init__(self, request_id: str, agent_name: str = "oxeous-eudr-agent") -> None:
        self.request_id = request_id
        self.agent_name = agent_name
        self.started_at = datetime.utcnow().isoformat() + "Z"
        self.steps: list[dict[str, Any]] = []
        self._step_index = 0

    def log_instruction(self, system_prompt: str, user_input: str) -> None:
        """Log the initial agent instructions and user input."""
        self.steps.append({
            "step": self._next(),
            "type": "instruction",
            "timestamp": _now(),
            "system_prompt_excerpt": system_prompt[:300] + "..." if len(system_prompt) > 300 else system_prompt,
            "user_input": user_input,
        })

    def log_tool_call(self, tool_name: str, parameters: dict[str, Any]) -> None:
        """Log when the agent calls a tool."""
        self.steps.append({
            "step": self._next(),
            "type": "tool_call",
            "timestamp": _now(),
            "tool_name": tool_name,
            "parameters": parameters,
        })

    def log_tool_result(self, tool_name: str, result: dict[str, Any], duration_ms: int = 0) -> None:
        """Log the tool's response back to the agent."""
        self.steps.append({
            "step": self._next(),
            "type": "tool_result",
            "timestamp": _now(),
            "tool_name": tool_name,
            "duration_ms": duration_ms,
            "result_summary": _summarize(result),
        })

    def log_llm_decision(self, decision: str, reasoning: str) -> None:
        """Log the LLM's decision after reviewing tool results."""
        self.steps.append({
            "step": self._next(),
            "type": "llm_decision",
            "timestamp": _now(),
            "decision": decision,
            "reasoning": reasoning,
        })

    def log_human_checkpoint(self, reason: str, required: bool) -> None:
        """Log whether human review was triggered."""
        self.steps.append({
            "step": self._next(),
            "type": "human_checkpoint",
            "timestamp": _now(),
            "reason": reason,
            "human_review_required": required,
        })

    def log_final_output(self, output: dict[str, Any]) -> None:
        """Log the final agent output."""
        self.steps.append({
            "step": self._next(),
            "type": "final_output",
            "timestamp": _now(),
            "risk_level": output.get("overall_risk"),
            "risk_score": output.get("risk_score"),
            "has_deforestation": output.get("has_deforestation"),
            "dds_generated": output.get("dds_id") is not None,
        })

    def save(self) -> str:
        """Write trajectory to JSON file. Returns file path."""
        os.makedirs(TRAJECTORY_DIR, exist_ok=True)
        trajectory = {
            "request_id": self.request_id,
            "agent_name": self.agent_name,
            "started_at": self.started_at,
            "completed_at": datetime.utcnow().isoformat() + "Z",
            "total_steps": len(self.steps),
            "steps": self.steps,
        }
        path = os.path.join(TRAJECTORY_DIR, f"{self.request_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(trajectory, f, indent=2, default=str)
        logger.info("Trajectory saved: %s", path)
        return path

    def _next(self) -> int:
        self._step_index += 1
        return self._step_index


def _now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _summarize(result: dict[str, Any]) -> dict[str, Any]:
    """Return the FULL RAW DATA so the user can verify everything!"""
    summary = {}
    for k, v in result.items():
        if isinstance(v, list) and len(v) > 20:
            summary[k] = f"[{len(v)} items (too large to display)]"
        else:
            summary[k] = v
    return summary
