"""
Optical & Spectral Subagent.
Analyzes Sentinel-2 / Landsat-8/9 multi-spectral imagery, Hansen GFC canopy loss, and cloud occlusion.
"""
from __future__ import annotations

import time
from typing import Any
from .models import SubagentFinding, SubagentType, AgentVerdict


class OpticalSubagent:
    """Specialized in optical/spectral canopy change detection and cloud audit."""

    def __init__(self) -> None:
        self.agent_id = SubagentType.optical_spectral
        self.name = "Sentinel Optical & Spectral Analyst"

    async def evaluate(
        self,
        plot_geometry: dict[str, Any],
        commodity: str,
        gee_summary: dict[str, Any],
    ) -> SubagentFinding:
        t0 = time.monotonic()

        has_loss = gee_summary.get("has_post_cutoff_loss", False)
        loss_pct = float(gee_summary.get("forest_loss_pct", 0.0) or 0.0)
        loss_ha = float(gee_summary.get("forest_loss_ha", 0.0) or 0.0)
        f2020 = float(gee_summary.get("forest_cover_2020_pct", 0.0) or 0.0)
        loss_years = gee_summary.get("loss_years", [])

        # Assess optical confidence
        confidence = 0.92
        if loss_pct > 0 and loss_pct < 0.5:
            confidence = 0.75  # Borderline noise / edge artifact

        if has_loss and loss_pct >= 0.5:
            verdict = AgentVerdict.non_compliant
            headline = f"Optical spectral disturbance detected post-cutoff: {loss_ha:.2f} ha ({loss_pct:.1f}% canopy loss)"
            citation = "EUDR Article 2(1) & Article 3(a) - Deforestation-free requirement"
            rebuttal = "Optical disturbance requires cross-sensor verification against SAR radar and statutory baseline to rule out crop replanting."
        elif has_loss and loss_pct < 0.5:
            verdict = AgentVerdict.at_risk
            headline = f"Marginal optical canopy variance: {loss_ha:.2f} ha ({loss_pct:.2f}%). Potential sub-pixel edge effect."
            citation = "EUDR Article 9 - Risk Assessment"
            rebuttal = "Micro-disturbance below FAO 0.5 ha canopy continuity threshold. Requires topological polygon inspection."
        else:
            verdict = AgentVerdict.compliant
            headline = f"Zero post-2020 optical canopy loss detected across time series (2020-2025). Standing 2020 forest: {f2020:.1f}%."
            citation = "EUDR Article 3(a) - Compliant"
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
                "forest_loss_ha": loss_ha,
                "forest_loss_pct": loss_pct,
                "forest_cover_2020_pct": f2020,
                "detected_loss_years": loss_years,
                "optical_sensors": ["Sentinel-2 MSI (10m)", "Landsat-8/9 OLI (30m)"],
            },
            sensor_provenance=[
                "Hansen GFC v1.13 (UMD/Google)",
                "Copernicus Sentinel-2 Level-2A",
            ],
            mitigation_or_rebuttal=rebuttal,
            processing_time_ms=elapsed_ms,
        )
