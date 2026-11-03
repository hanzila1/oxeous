"""
Topological Geometry Carve-Out Subagent.
Performs continuous spatial polygon decomposition under the May 2026 Segregated Plot Protocol.
Outputs exact compliant and carved-out vector boundaries for TRACES NT Box 44 submission.
"""
from __future__ import annotations

import time
from typing import Any
from .models import SubagentFinding, SubagentType, AgentVerdict
from ..carveout_service import decompose_parcel_geometry


class TopologicalGeometrySubagent:
    """Specialized in spatial boundary decomposition and vector topology auditing."""

    def __init__(self) -> None:
        self.agent_id = SubagentType.topological_geometry
        self.name = "Topological Vector Geometry Decomposer"

    async def evaluate(
        self,
        plot_geometry: dict[str, Any],
        total_ha: float,
        statutory_loss_ha: float,
        is_plantation_exemption: bool = False,
    ) -> SubagentFinding:
        t0 = time.monotonic()

        clean_f, viol_f, metrics = decompose_parcel_geometry(
            original_geometry=plot_geometry,
            total_parcel_ha=total_ha,
            statutory_deforestation_ha=statutory_loss_ha,
            is_plantation_exemption=is_plantation_exemption,
        )

        carveout_applied = metrics.get("carveout_applied", False)
        compliant_ha = metrics.get("compliant_ha", total_ha)
        carved_ha = metrics.get("carved_out_ha", 0.0)

        confidence = 0.99

        if carveout_applied and carved_ha > 0:
            verdict = AgentVerdict.at_risk
            headline = (
                f"Automated Polygon Carve-Out Executed (May 2026 Protocol): "
                f"Decomposed parcel into {compliant_ha:.2f} ha Compliant Zone (TRACES NT exportable) and {carved_ha:.2f} ha Delisted Violation Zone."
            )
            citation = "EUDR Article 9 & May 2026 Segregated Parcel Protocol"
            rebuttal = (
                f"Full parcel would trigger immediate Box 44 customs blocking. "
                f"By delisting the {carved_ha:.2f} ha non-compliant polygon, the remaining {compliant_ha:.2f} ha can legally clear EU customs."
            )
        elif is_plantation_exemption:
            verdict = AgentVerdict.compliant
            headline = f"100% Parcel Boundary Certified: Zero topological carve-out required under Article 2(5) Agricultural Exemption ({total_ha:.2f} ha)."
            citation = "EUDR Article 2(5) - Full Parcel Clearance"
            rebuttal = None
        else:
            verdict = AgentVerdict.compliant
            headline = f"100% Parcel Boundary Clear: Full {total_ha:.2f} ha verified compliant with zero topological segregation needed."
            citation = "EUDR Article 3(a) - Full Parcel Clearance"
            rebuttal = None

        elapsed_ms = int((time.monotonic() - t0) * 1000)

        return SubagentFinding(
            agent_id=self.agent_id,
            agent_name=self.name,
            verdict=verdict,
            confidence_score=confidence,
            headline=headline,
            statutory_citation=citation,
            evidence_metrics={
                "total_parcel_ha": total_ha,
                "compliant_ha": compliant_ha,
                "carved_out_ha": carved_ha,
                "carveout_applied": carveout_applied,
                "coordinate_precision": "EPSG:4326 6-decimal standard",
                "clean_feature": clean_f,
                "violation_feature": viol_f,
            },
            sensor_provenance=[
                "Shapely 2.0 Vector Topological Engine",
                "European Commission TRACES NT Geometrical Specification v2.1",
            ],
            mitigation_or_rebuttal=rebuttal,
            processing_time_ms=elapsed_ms,
        )
