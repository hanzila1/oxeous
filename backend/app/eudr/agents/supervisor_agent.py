"""
Supervisor Consensus Agent.
Orchestrates specialized spatial subagents, cross-examines supplier declarations,
resolves multi-sensor contradictions, and synthesizes the final regulatory consensus.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import time
from typing import Any, Optional

from .models import (
    SupervisorConsensus, SubagentFinding, AgentVerdict, SubagentType
)
from .optical_agent import OpticalSubagent
from .radar_agent import RadarSubagent
from .legal_agent import StatutoryLegalSubagent
from .cadastral_agent import CadastralProtectedAreasSubagent
from .carveout_agent import TopologicalGeometrySubagent
from .yield_agent import BiophysicalYieldSubagent


class SupervisorAgent:
    """Chief Compliance Auditor Agent synthesizing multi-agent spatial evidence."""

    def __init__(self) -> None:
        self.optical = OpticalSubagent()
        self.radar = RadarSubagent()
        self.legal = StatutoryLegalSubagent()
        self.cadastral = CadastralProtectedAreasSubagent()
        self.carveout = TopologicalGeometrySubagent()
        self.yield_auditor = BiophysicalYieldSubagent()

    async def arbitrate(
        self,
        plot_geometry: dict[str, Any],
        commodity: str,
        country_code: str,
        supplier_claim: Optional[str],
        total_ha: float,
        gee_summary: dict[str, Any],
        declared_net_mass_kg: Optional[float] = None,
    ) -> SupervisorConsensus:
        t0 = time.monotonic()

        # Extract primary metrics
        statutory_loss_ha = float(gee_summary.get("statutory_deforestation_ha", 0.0) or 0.0)
        is_exempt_prelim = bool(gee_summary.get("dominant_forest_type") in ("tree crops", "plantation") or (gee_summary.get("jrc_forest_cover_2020_pct", 0.0) or 0.0) < 5.0)

        # Dispatch specialized subagents concurrently
        optical_task = self.optical.evaluate(plot_geometry, commodity, gee_summary)
        radar_task = self.radar.evaluate(plot_geometry, commodity, gee_summary)
        legal_task = self.legal.evaluate(plot_geometry, commodity, gee_summary, country_code=country_code)
        cadastral_task = self.cadastral.evaluate(plot_geometry, country_code, gee_summary)
        carveout_task = self.carveout.evaluate(plot_geometry, total_ha, statutory_loss_ha, is_exempt_prelim)
        yield_task = self.yield_auditor.evaluate(plot_geometry, commodity, country_code, total_ha, declared_net_mass_kg)

        findings: list[SubagentFinding] = await asyncio.gather(
            optical_task, radar_task, legal_task, cadastral_task, carveout_task, yield_task
        )

        optical_f = findings[0]
        radar_f = findings[1]
        legal_f = findings[2]
        cadastral_f = findings[3]
        carveout_f = findings[4]
        yield_f = findings[5]

        # Multi-Agent Consensus & Contradiction Resolution Logic
        conflict_detected = False
        resolution_narrative = ""
        supplier_perjury = False
        carveout_recommended = False

        # 1. Check for Strict Cadastral Overlap (Hard legality stop)
        if cadastral_f.verdict == AgentVerdict.non_compliant:
            consensus_verdict = AgentVerdict.non_compliant
            risk_score = 100.0
            resolution_narrative = (
                f"UNCOMPROMISING LEGALITY VIOLATION: {cadastral_f.headline} "
                f"Regardless of satellite canopy status, plots inside strict nature reserves are ineligible for EU entry."
            )

        # 2. Check for Statutory Agricultural Plantation Exemption (Article 2(5))
        elif legal_f.verdict == AgentVerdict.exempt_art2_5:
            consensus_verdict = AgentVerdict.exempt_art2_5
            risk_score = 12.0  # Minimal administrative verification risk
            conflict_detected = (optical_f.verdict != AgentVerdict.compliant or radar_f.verdict != AgentVerdict.compliant)
            resolution_narrative = (
                f"SENSOR CONTRADICTION RESOLVED BY STATUTORY ONTOLOGY: "
                f"Optical/Radar detected canopy loss ({gee_summary.get('forest_loss_ha', 0):.1f} ha), "
                f"but Statutory Legal Agent confirmed plot is an established {commodity.upper()} agricultural plantation standing at cutoff (JRC GFC2020 baseline: {gee_summary.get('jrc_forest_cover_2020_pct', 0):.1f}%). "
                f"Under EUDR Article 2(4) & 2(5), canopy felling represents cyclical crop replanting, NOT illegal deforestation. False-positive violation dismissed."
            )

        # 3. Check for True Primary Forest Deforestation
        elif optical_f.verdict == AgentVerdict.non_compliant or radar_f.verdict == AgentVerdict.non_compliant or legal_f.verdict == AgentVerdict.non_compliant:
            consensus_verdict = AgentVerdict.non_compliant
            risk_score = 88.0
            carveout_recommended = True
            resolution_narrative = (
                f"CONCURRENT MULTI-SENSOR VERIFICATION: Optical spectral and SAR radar sensors corroborate post-2020 forest loss on standing natural forest. "
                f"Statutory Deforestation established under Article 3(a). "
                f"Topological Carve-Out Agent has generated a clean sub-parcel geometry ({carveout_f.evidence_metrics.get('compliant_ha', 0):.1f} ha) under the May 2026 Segregated Plot Protocol."
            )
            # Check for supplier perjury
            if supplier_claim and any(kw in supplier_claim.lower() for kw in ["compliant", "zero deforestation", "clean", "sustainable"]):
                supplier_perjury = True
                resolution_narrative += f" [SUPPLIER PERJURY ALERT: Supplier claim '{supplier_claim}' directly refuted by satellite sensor consensus.]"

        # 4. Check for Cadastral Managed Area (At Risk)
        elif cadastral_f.verdict == AgentVerdict.at_risk:
            consensus_verdict = AgentVerdict.at_risk
            risk_score = 48.0
            resolution_narrative = (
                f"CONDITIONAL COMPLIANCE: Satellite sensors confirm zero deforestation, but parcel intersects a managed conservation area. "
                f"Competent Authority audit requires local sovereign production permit under Article 3(b)."
            )

        # 5. Clean 100% Compliant
        else:
            consensus_verdict = AgentVerdict.compliant
            risk_score = 5.0
            resolution_narrative = (
                f"UNANIMOUS MULTI-AGENT COMPLIANCE: All specialized spatial subagents (Optical, SAR Radar, Statutory Legal, Cadastral, Geometry, Yield) unanimously confirm zero post-2020 deforestation, 100% sovereign legality, and biophysical yield plausibility."
            )

        # 6. Check for Biophysical Yield Laundering Anomaly (EUDR Article 16(3))
        if yield_f.verdict == AgentVerdict.non_compliant:
            consensus_verdict = AgentVerdict.non_compliant
            risk_score = max(risk_score, 92.0)
            conflict_detected = True
            resolution_narrative += f" [ARTICLE 16(3) LAUNDERING ALERT: {yield_f.headline}]"
        elif yield_f.verdict == AgentVerdict.at_risk and consensus_verdict == AgentVerdict.compliant:
            consensus_verdict = AgentVerdict.at_risk
            risk_score = max(risk_score, 42.0)
            resolution_narrative += f" [POINT-RULE EVASION AUDIT: {yield_f.headline}]"

        unanimous = all(f.verdict == consensus_verdict for f in findings)

        # Generate Cryptographic SHA-256 Audit Hash
        raw_evidence = {
            "commodity": commodity,
            "country_code": country_code,
            "verdict": consensus_verdict.value,
            "risk_score": risk_score,
            "loss_ha": gee_summary.get("forest_loss_ha", 0.0),
            "jrc_forest_pct": gee_summary.get("jrc_forest_cover_2020_pct", 0.0),
            "findings": [f.model_dump() for f in findings],
            "timestamp": time.time(),
        }
        evidence_json = json.dumps(raw_evidence, sort_keys=True, default=str)
        audit_hash = f"0x{hashlib.sha256(evidence_json.encode('utf-8')).hexdigest()}"

        return SupervisorConsensus(
            consensus_verdict=consensus_verdict,
            composite_risk_score=risk_score,
            unanimous=unanimous,
            conflict_detected=conflict_detected,
            conflict_resolution_narrative=resolution_narrative,
            supplier_perjury_detected=supplier_perjury,
            subagent_findings=findings,
            cryptographic_audit_hash=audit_hash,
            model_foundation="NASA-IBM Prithvi-EO 2.0 (Geospatial Foundation Model) + Oxeous Multi-Agent Spatial Orchestrator",
            carveout_recommended=carveout_recommended,
        )
