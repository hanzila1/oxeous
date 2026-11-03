"""
Multi-Agent Spatial Verification Engine Models.
Defines schemas for specialized EUDR subagents and the Supervisor Consensus.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class SubagentType(str, Enum):
    optical_spectral = "optical_spectral"
    sar_radar = "sar_radar"
    statutory_legal = "statutory_legal"
    cadastral_protected_areas = "cadastral_protected_areas"
    topological_geometry = "topological_geometry"
    biophysical_yield = "biophysical_yield"


class AgentVerdict(str, Enum):
    compliant = "COMPLIANT"
    non_compliant = "NON_COMPLIANT"
    at_risk = "AT_RISK"
    exempt_art2_5 = "EXEMPT_ART2_5"
    inconclusive = "INCONCLUSIVE"


class SubagentFinding(BaseModel):
    """Structured audit finding from a single specialized spatial subagent."""
    agent_id: SubagentType
    agent_name: str
    verdict: AgentVerdict
    confidence_score: float = Field(ge=0.0, le=1.0)
    headline: str
    statutory_citation: str
    evidence_metrics: dict[str, Any] = Field(default_factory=dict)
    sensor_provenance: list[str] = Field(default_factory=list)
    mitigation_or_rebuttal: Optional[str] = None
    processing_time_ms: int = 0


class SupervisorConsensus(BaseModel):
    """Final consensus synthesized by the Chief Compliance Supervisor Agent."""
    consensus_verdict: AgentVerdict
    composite_risk_score: float = Field(ge=0.0, le=100.0)
    unanimous: bool = False
    conflict_detected: bool = False
    conflict_resolution_narrative: str
    supplier_perjury_detected: bool = False
    subagent_findings: list[SubagentFinding] = Field(default_factory=list)
    cryptographic_audit_hash: str
    model_foundation: str = "NASA-IBM Prithvi-EO 2.0 + Granite-3 / Gemini Multi-Agent Spatial Orchestrator"
    carveout_recommended: bool = False
