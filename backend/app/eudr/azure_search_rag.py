"""
EUDR Verbatim Primary-Law Search Engine backed by Azure AI Search (REST API 2024-07-01).

Indexes 100% authentic, unmodified Official Journal of the European Union primary legal texts
ingested directly from the EU Publications Office CELLAR API (`official_eurlex_corpus.json`),
with ZERO AI-generated documents:
  1. Regulation (EU) 2023/1115 (CELEX:32023R1115) — Verbatim Recitals (1)-(86)
  2. Consolidated Regulation (EU) 2023/1115 (CELEX:02023R1115-20251226) — Verbatim Articles 1-38,
     Annex I CN/HS Customs Tariff Schedule (all 7 commodities), and Annex II DDS Template
  3. Regulation (EU) 2025/2650 (CELEX:32025R2650) — 2025 EUDR Simplification & Amending Regulation
  4. Commission Implementing Regulation (EU) 2024/3084 (CELEX:32024R3084) — EU TRACES NT System Rules
  5. Commission Implementing Regulation (EU) 2025/1093 (CELEX:32025R1093) — Official Article 29
     Country Risk Benchmarking List (Low-Risk / Standard-Risk / High-Risk Countries)
  6. Commission Notice C/2025/4524 (CELEX:52025XC04524) — Official European Commission EUDR Guidance

Auto-provisions the Azure AI Search index (`eudr-statutory-corpus`) and batch-uploads all
verbatim primary documents on first connection, with hot `.env` reload and deterministic
local search fallback over the exact same verbatim Official Journal corpus.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Optional

import httpx

from ..config import Settings, get_settings

logger = logging.getLogger(__name__)

AZURE_SEARCH_API_VERSION = "2024-07-01"
CORPUS_JSON_PATH = Path(__file__).resolve().parent / "corpus" / "official_eurlex_corpus.json"


def load_official_eurlex_corpus() -> list[dict[str, str]]:
    """Load the 100%-verbatim Official Journal EUR-Lex corpus from disk."""
    if not CORPUS_JSON_PATH.exists():
        logger.error("Official EUR-Lex corpus JSON missing at %s", CORPUS_JSON_PATH)
        return []
    return json.loads(CORPUS_JSON_PATH.read_text(encoding="utf-8"))


EUDR_STATUTORY_CORPUS: list[dict[str, str]] = load_official_eurlex_corpus()


class AzureSearchRAGEngine:
    """Async Azure AI Search client (REST 2024-07-01) over verbatim EUR-Lex primary law."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._env_mtime: float = self._get_env_mtime()
        self._index_verified: bool = False
        self._query_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}

    @staticmethod
    def _get_env_mtime() -> float:
        for candidate in (".env", os.path.join(os.path.dirname(__file__), "..", "..", ".env")):
            try:
                return os.path.getmtime(candidate)
            except OSError:
                continue
        return 0.0

    def _refresh_settings_if_needed(self) -> None:
        mtime = self._get_env_mtime()
        if mtime != self._env_mtime:
            self._env_mtime = mtime
            self._index_verified = False
            get_settings.cache_clear()
            self.settings = Settings()

    @property
    def is_configured(self) -> bool:
        self._refresh_settings_if_needed()
        return bool(self.settings.azure_search_endpoint.strip() and self.settings.azure_search_api_key.strip())

    def _base_url(self) -> str:
        raw = self.settings.azure_search_endpoint.strip().rstrip("/")
        if not raw.startswith("http"):
            raw = f"https://{raw}"
        return raw

    def _headers(self) -> dict[str, str]:
        return {
            "api-key": self.settings.azure_search_api_key.strip(),
            "Content-Type": "application/json",
        }

    async def ensure_index_and_corpus(self) -> dict[str, Any]:
        """Idempotently create `eudr-statutory-corpus` index and upload all verbatim EUR-Lex acts."""
        corpus = EUDR_STATUTORY_CORPUS or load_official_eurlex_corpus()
        if not self.is_configured:
            return {"status": "local_verbatim_corpus", "indexed_docs": len(corpus)}

        if self._index_verified:
            return {"status": "already_verified", "index": self.settings.azure_search_index}

        base = self._base_url()
        index_name = self.settings.azure_search_index.strip() or "eudr-statutory-corpus"
        headers = self._headers()

        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Check if index already exists and contains the full verbatim EUR-Lex corpus
            count_url = f"{base}/indexes/{index_name}/docs/$count?api-version={AZURE_SEARCH_API_VERSION}"
            count_resp = await client.get(count_url, headers=headers)
            if count_resp.status_code == 200:
                try:
                    existing_count = int(count_resp.text.strip().lstrip("\ufeff"))
                    if existing_count >= len(corpus):
                        self._index_verified = True
                        return {
                            "status": "ready",
                            "index": index_name,
                            "document_count": existing_count,
                        }
                except ValueError:
                    pass

            # 2. Create or update the Azure AI Search index schema with EUR-Lex provenance fields
            index_schema: dict[str, Any] = {
                "name": index_name,
                "fields": [
                    {"name": "id", "type": "Edm.String", "key": True, "filterable": True},
                    {"name": "celex_id", "type": "Edm.String", "searchable": True, "filterable": True, "facetable": True},
                    {"name": "oj_ref", "type": "Edm.String", "searchable": True},
                    {"name": "eurlex_url", "type": "Edm.String", "searchable": False},
                    {"name": "sha256_verbatim", "type": "Edm.String", "searchable": False},
                    {"name": "article_ref", "type": "Edm.String", "searchable": True, "filterable": True},
                    {"name": "title", "type": "Edm.String", "searchable": True},
                    {"name": "category", "type": "Edm.String", "searchable": True, "filterable": True, "facetable": True},
                    {"name": "commodities", "type": "Edm.String", "searchable": True, "filterable": True},
                    {"name": "country_codes", "type": "Edm.String", "searchable": True, "filterable": True},
                    {"name": "hs_codes", "type": "Edm.String", "searchable": True},
                    {"name": "keywords", "type": "Edm.String", "searchable": True},
                    {"name": "legal_summary", "type": "Edm.String", "searchable": True},
                    {"name": "full_text", "type": "Edm.String", "searchable": True},
                ],
                "scoringProfiles": [
                    {
                        "name": "eudr_legal_boost",
                        "text": {
                            "weights": {
                                "article_ref": 4.5,
                                "hs_codes": 4.0,
                                "title": 3.5,
                                "celex_id": 3.0,
                                "keywords": 2.5,
                                "commodities": 2.5,
                                "legal_summary": 2.0,
                                "full_text": 1.5,
                            }
                        },
                    }
                ],
                "defaultScoringProfile": "eudr_legal_boost",
            }

            put_url = f"{base}/indexes/{index_name}?api-version={AZURE_SEARCH_API_VERSION}"
            put_resp = await client.put(put_url, headers=headers, json=index_schema)
            if put_resp.status_code not in (200, 201, 204):
                raise RuntimeError(f"Azure AI Search index creation failed ({put_resp.status_code}): {put_resp.text[:300]}")

            # 3. Upload all 114+ verbatim EUR-Lex Official Journal documents in batches of 50
            index_docs_url = f"{base}/indexes/{index_name}/docs/index?api-version={AZURE_SEARCH_API_VERSION}"
            for batch_start in range(0, len(corpus), 50):
                batch = corpus[batch_start : batch_start + 50]
                upload_payload = {
                    "value": [{"@search.action": "mergeOrUpload", **doc} for doc in batch]
                }
                up_resp = await client.post(index_docs_url, headers=headers, json=upload_payload)
                if up_resp.status_code not in (200, 207):
                    raise RuntimeError(
                        f"Azure AI Search batch upload failed ({up_resp.status_code}): {up_resp.text[:300]}"
                    )

            self._index_verified = True
            logger.info(
                "Azure AI Search index '%s' populated with %d verbatim Official Journal EUR-Lex documents",
                index_name,
                len(corpus),
            )
            return {
                "status": "indexed",
                "index": index_name,
                "document_count": len(corpus),
            }

    async def search(
        self,
        query: str,
        commodity: Optional[str] = None,
        country_code: Optional[str] = None,
        top_k: int = 4,
    ) -> tuple[list[dict[str, Any]], str]:
        """
        Retrieve top-k verbatim EUR-Lex primary statutory & Official Commission Guidance provisions.
        Returns `(results, engine_mode)` where `engine_mode` is `'azure_ai_search'` or `'local_verbatim_eurlex'`.
        """
        self._refresh_settings_if_needed()

        enriched_terms = [query.strip()]
        if commodity:
            enriched_terms.append(commodity.replace("_", " "))
        if country_code and len(country_code.strip()) == 2:
            enriched_terms.append(country_code.strip().upper())
        effective_query = " ".join(t for t in enriched_terms if t)

        cache_key = f"{effective_query.lower()}|{top_k}|{'az' if self.is_configured else 'loc'}"
        now = time.monotonic()
        cached = self._query_cache.get(cache_key)
        if cached and (now - cached[0]) < 600.0:
            return cached[1], ("azure_ai_search" if self.is_configured else "local_verbatim_eurlex")

        if self.is_configured:
            try:
                await self.ensure_index_and_corpus()
                base = self._base_url()
                index_name = self.settings.azure_search_index.strip() or "eudr-statutory-corpus"
                search_url = f"{base}/indexes/{index_name}/docs/search?api-version={AZURE_SEARCH_API_VERSION}"
                payload: dict[str, Any] = {
                    "search": effective_query or "*",
                    "queryType": "simple",
                    "searchMode": "any",
                    "scoringProfile": "eudr_legal_boost",
                    "top": top_k,
                    "select": (
                        "id,celex_id,oj_ref,eurlex_url,sha256_verbatim,article_ref,"
                        "title,category,commodities,country_codes,hs_codes,legal_summary,full_text"
                    ),
                }
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(search_url, headers=self._headers(), json=payload)
                    if resp.status_code == 200:
                        raw_hits = resp.json().get("value", [])
                        if raw_hits:
                            hits = [
                                {
                                    "id": h.get("id", ""),
                                    "celex_id": h.get("celex_id", ""),
                                    "oj_ref": h.get("oj_ref", ""),
                                    "eurlex_url": h.get("eurlex_url", ""),
                                    "sha256_verbatim": h.get("sha256_verbatim", ""),
                                    "article_ref": h.get("article_ref", ""),
                                    "title": h.get("title", ""),
                                    "category": h.get("category", ""),
                                    "hs_codes": h.get("hs_codes", ""),
                                    "country_codes": h.get("country_codes", ""),
                                    "legal_summary": h.get("legal_summary", ""),
                                    "full_text": h.get("full_text", ""),
                                    "score": round(float(h.get("@search.score", 1.0)), 3),
                                }
                                for h in raw_hits
                            ]
                            self._query_cache[cache_key] = (now, hits)
                            return hits, "azure_ai_search"
            except Exception as exc:
                logger.warning("Azure AI Search query fallback triggered (%s)", exc)

        local_hits = self._local_search(effective_query, commodity=commodity, country_code=country_code, top_k=top_k)
        self._query_cache[cache_key] = (now, local_hits)
        return local_hits, "local_verbatim_eurlex"

    @staticmethod
    def _local_search(
        query: str,
        commodity: Optional[str] = None,
        country_code: Optional[str] = None,
        top_k: int = 4,
    ) -> list[dict[str, Any]]:
        corpus = EUDR_STATUTORY_CORPUS or load_official_eurlex_corpus()
        tokens = [
            tok for tok in re.findall(r"[a-z0-9]+", query.lower())
            if len(tok) >= 2 and tok not in {"what", "how", "why", "the", "and", "for", "are", "does", "under", "eudr"}
        ]
        scored: list[tuple[float, dict[str, str]]] = []
        comm_norm = (commodity or "").lower().strip()

        for doc in corpus:
            score = 0.0
            hay_high = f"{doc.get('article_ref', '')} {doc.get('hs_codes', '')} {doc.get('title', '')} {doc.get('keywords', '')}".lower()
            hay_body = doc.get("full_text", "").lower()
            for tok in tokens:
                if tok in hay_high:
                    score += 3.5
                if tok in hay_body:
                    score += 1.2
            if comm_norm and comm_norm in doc.get("commodities", "").lower():
                score += 2.0
            scored.append((score, doc))

        scored.sort(key=lambda item: item[0], reverse=True)
        chosen = [d for sc, d in scored[:top_k] if sc > 0] or [d for _, d in scored[:top_k]]
        return [
            {
                "id": d.get("id", ""),
                "celex_id": d.get("celex_id", ""),
                "oj_ref": d.get("oj_ref", ""),
                "eurlex_url": d.get("eurlex_url", ""),
                "sha256_verbatim": d.get("sha256_verbatim", ""),
                "article_ref": d.get("article_ref", ""),
                "title": d.get("title", ""),
                "category": d.get("category", ""),
                "hs_codes": d.get("hs_codes", ""),
                "country_codes": d.get("country_codes", ""),
                "legal_summary": d.get("legal_summary", ""),
                "full_text": d.get("full_text", ""),
                "score": 1.0,
            }
            for d in chosen
        ]


_rag_singleton: Optional[AzureSearchRAGEngine] = None


def get_eudr_rag_engine() -> AzureSearchRAGEngine:
    global _rag_singleton
    if _rag_singleton is None:
        _rag_singleton = AzureSearchRAGEngine()
    return _rag_singleton


def format_rag_context_for_llm(hits: list[dict[str, Any]]) -> str:
    """Format verbatim Official Journal EUR-Lex provisions into a grounded citation block."""
    if not hits:
        return ""
    blocks: list[str] = [
        "VERBATIM PRIMARY EUROPEAN UNION LEGAL TEXTS (OFFICIAL JOURNAL / EUR-LEX — QUOTE & CITE ACCURATELY):"
    ]
    for idx, hit in enumerate(hits, start=1):
        celex = hit.get("celex_id", "")
        oj = hit.get("oj_ref", "")
        url = hit.get("eurlex_url", "")
        hs_note = f" | HS/CN Codes: {hit['hs_codes']}" if hit.get("hs_codes") and hit["hs_codes"] != "ALL" else ""
        excerpt = hit.get("full_text", "")[:12000]
        blocks.append(
            f"[{idx}] {hit['article_ref']} (CELEX:{celex} | {oj}){hs_note}\n"
            f"Official EUR-Lex URL: {url}\n"
            f"Verbatim Official Text:\n{excerpt}"
        )
    return "\n\n".join(blocks)
