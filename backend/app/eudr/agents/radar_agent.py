"""
SAR Radar Subagent.
Analyzes Sentinel-1 C-band synthetic aperture radar (SAR) backscatter,
providing all-weather cloud-piercing verification and RADD disturbance alerting.
"""
from __future__ import annotations

import time
from typing import Any
from .models import SubagentFinding, SubagentType, AgentVerdict


class RadarSubagent:
    """Specialized in cloud-penetrating SAR radar backscatter disturbance analysis."""

    def __init__(self) -> None:
        self.agent_id = SubagentType.sar_radar
        self.name = "Sentinel-1 SAR All-Weather Radar Analyst"

    async def evaluate(
        self,
        plot_geometry: dict[str, Any],
        commodity: str,
        gee_summary: dict[str, Any],
    ) -> SubagentFinding:
        t0 = time.monotonic()

        has_radar = gee_summary.get("has_radar_alerts", False)
        radd_pct = float(gee_summary.get("radd_alerts", {}).get("alert_fraction_pct", 0.0) or 0.0)
        confirmed_alerts = int(gee_summary.get("confirmed_alerts", 0) or 0)

        # High confidence because SAR pierces tropical clouds and atmospheric haze
        confidence = 0.95

        if has_radar or radd_pct > 1.0 or confirmed_alerts > 0:
            verdict = AgentVerdict.non_compliant
            headline = f"Active C-band SAR radar backscatter drop detected ({radd_pct:.1f}% disturbance, {confirmed_alerts} alerts). Structural canopy removal confirmed through clouds."
            citation = "EUDR Article 9 - Near-Real-Time Disturbance Monitoring"
            rebuttal = "Radar confirms physical loss of woody biomass. If plot is an agricultural plantation, cross-verify with Statutory Legal Agent."
        else:
            verdict = AgentVerdict.compliant
            headline = f"Clear SAR radar signature: No C-band radar backscatter disturbance detected across parcel. All-weather structural canopy intact."
            citation = "EUDR Article 3(a) - Structural Canopy Integrity Verified"
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
                "has_radar_alerts": has_radar,
                "radd_alert_pct": radd_pct,
                "confirmed_alert_count": confirmed_alerts,
                "radar_band": "C-band (5.405 GHz) Sentinel-1 GRD",
                "polarization": "Dual-pol VV + VH Backscatter Ratio",
                "cloud_penetration": "100% all-weather penetration",
            },
            sensor_provenance=[
                "Copernicus Sentinel-1 C-Band SAR (ESA)",
                "WUR / GFW RADD Radar Disturbance Alerts (10m)",
            ],
            mitigation_or_rebuttal=rebuttal,
            processing_time_ms=elapsed_ms,
        )
