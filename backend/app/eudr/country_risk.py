"""
EUDR country risk classification.

EC will publish the official country benchmarking list; until then we use
a reasonable approximation based on Global Forest Watch data and forest-risk
commodity supply chains.

Sources:
- Global Forest Watch / World Resources Institute supply chain risk data
- EU Joint Research Centre deforestation risk maps
- Forest Declaration Assessment 2023
"""
from __future__ import annotations

from .models import EUDRCountryRisk

# Statutory Country Risk Classification under Commission Implementing Regulation (EU) 2025/1093:
# Only countries specifically listed by the European Commission are high-risk or low-risk.
# Any country not listed defaults to STANDARD RISK under Article 29.

# Official High-Risk Tier (4 countries designated by EC Implementing Regulation 2025/1093):
HIGH_RISK_COUNTRIES: set[str] = {
    "BY",  # Belarus
    "MM",  # Myanmar
    "KP",  # North Korea (DPRK)
    "RU",  # Russia
}

# Official Low-Risk Tier (~140 countries including all EU Member States, OECD partners):
LOW_RISK_COUNTRIES: set[str] = {
    # EU-27
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    # European non-EU / EEA / EFTA
    "CH", "NO", "IS", "LI", "GB",
    # Key global low-risk trading partners designated by EC
    "US", "CA", "AU", "NZ", "JP", "KR", "SG", "IL", "CL", "UY",
}

# Jurisdictions with high tropical deforestation pressure (used for contextual DD guidance, NOT statutory High Risk)
TROPICAL_DEFORESTATION_HOTSPOTS: set[str] = {
    "BR", "ID", "MY", "PG", "CD", "GH", "CI", "CM", "NG", "MG",
    "PH", "LA", "KH", "CO", "PE", "BO", "PY", "AR",
}

# Commodity-specific risk multipliers (supply chain landscape pressure)
COMMODITY_RISK_WEIGHTS: dict[str, dict[str, float]] = {
    # commodity → {country: risk_multiplier}
    "cocoa":    {"GH": 2.0, "CI": 2.0, "CM": 1.8, "NG": 1.5},
    "palm_oil": {"ID": 2.5, "MY": 2.0, "PG": 1.8, "CO": 1.5},
    "soya":     {"BR": 2.0, "PY": 1.8, "AR": 1.5, "BO": 1.5},
    "cattle":   {"BR": 2.0, "CO": 1.5, "PE": 1.5, "BO": 1.5},
    "wood":     {"BR": 1.8, "ID": 1.8, "CD": 2.0, "MM": 2.0, "LA": 1.8},
    "rubber":   {"ID": 1.5, "MY": 1.5, "LA": 1.8, "KH": 1.8},
    "coffee":   {"BR": 1.2, "CO": 1.2, "CI": 1.5, "CD": 1.8},
}


def get_country_risk(country_code: str) -> EUDRCountryRisk:
    """Return statutory EUDR Country Risk tier per Commission Implementing Regulation (EU) 2025/1093."""
    code = country_code.upper()
    if code in HIGH_RISK_COUNTRIES:
        return EUDRCountryRisk.high
    if code in LOW_RISK_COUNTRIES:
        return EUDRCountryRisk.low
    # Standard risk is the legal default tier for all other countries (including BR, ID, GH, CI, CO, PE)
    return EUDRCountryRisk.standard


def get_commodity_risk_factors(
    commodity: str,
    country_code: str,
    area_ha: float | None,
) -> list[str]:
    """Return a list of human-readable risk factor descriptions adhering to EUDR Article 10."""
    factors: list[str] = []
    country_risk = get_country_risk(country_code)
    code = country_code.upper()

    if country_risk == EUDRCountryRisk.high:
        factors.append(
            f"Statutory Risk: {code} is designated HIGH-RISK under EU Regulation 2025/1093 - enhanced competent authority checks (9%) apply"
        )
    elif country_risk == EUDRCountryRisk.low:
        factors.append(
            f"Statutory Risk: {code} is designated LOW-RISK under EU Regulation 2025/1093 - simplified due diligence eligible (Article 13)"
        )
    else:
        factors.append(
            f"Statutory Risk: {code} is STANDARD-RISK (default EUDR tier) - full 3-step due diligence required"
        )

    if code in TROPICAL_DEFORESTATION_HOTSPOTS:
        factors.append(
            f"Landscape Context: {code} is an active tropical deforestation monitoring corridor - multi-sensor satellite verification mandatory"
        )

    weights = COMMODITY_RISK_WEIGHTS.get(commodity, {})
    if code in weights:
        w = weights[code]
        if w >= 2.0:
            factors.append(
                f"Supply Chain Sensitivity: {commodity.replace('_', ' ').title()} in {code} has documented commodity-driven conversion risks (FAO / WRI)"
            )

    if area_ha and area_ha > 4.0:
        factors.append(
            f"Statutory Geometry: Plot area {area_ha:.1f} ha exceeds 4 ha threshold - full polygon boundary required under EUDR Article 9(1)(d)"
        )

    if area_ha and area_ha >= 20.0:
        factors.append(
            f"Production Scale: Large commercial production footprint ({area_ha:.1f} ha) triggers enhanced monitoring and multi-point audit verification"
        )

    return factors
