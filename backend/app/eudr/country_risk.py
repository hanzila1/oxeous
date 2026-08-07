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

# Countries with HIGH deforestation risk for EUDR commodities
# (documented significant deforestation in regulated supply chains)
HIGH_RISK_COUNTRIES: set[str] = {
    # Tropical deforestation hotspots
    "BR",  # Brazil (Amazon, Cerrado)
    "ID",  # Indonesia (palm oil, rubber, timber)
    "MY",  # Malaysia (palm oil)
    "PG",  # Papua New Guinea
    "CD",  # DR Congo
    "GH",  # Ghana (cocoa)
    "CI",  # Côte d'Ivoire (cocoa)
    "CM",  # Cameroon (cocoa, rubber)
    "NG",  # Nigeria
    "MG",  # Madagascar
    "PH",  # Philippines
    "LA",  # Laos
    "KH",  # Cambodia
    "MM",  # Myanmar
    "CO",  # Colombia (coffee, cattle)
    "PE",  # Peru (coca, cattle)
    "BO",  # Bolivia
    "PY",  # Paraguay (soya, cattle)
    "AR",  # Argentina (soya — Gran Chaco)
}

# Countries with LOW deforestation risk (high governance, verified low deforestation)
LOW_RISK_COUNTRIES: set[str] = {
    "DE", "FR", "NL", "BE", "DK", "SE", "NO", "FI", "AT", "CH",
    "GB", "IE", "NZ", "AU", "CA", "US",  # governance + forest monitoring
    "JP", "KR",
}

# Commodity-specific risk multipliers
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
    code = country_code.upper()
    if code in HIGH_RISK_COUNTRIES:
        return EUDRCountryRisk.high
    if code in LOW_RISK_COUNTRIES:
        return EUDRCountryRisk.low
    return EUDRCountryRisk.standard


def get_commodity_risk_factors(
    commodity: str,
    country_code: str,
    area_ha: float | None,
) -> list[str]:
    """Return a list of human-readable risk factor descriptions."""
    factors: list[str] = []
    country_risk = get_country_risk(country_code)

    if country_risk == EUDRCountryRisk.high:
        factors.append(
            f"{country_code} is classified as HIGH deforestation risk for {commodity} supply chains"
        )
    elif country_risk == EUDRCountryRisk.standard:
        factors.append(
            f"{country_code} is classified as STANDARD risk — satellite verification required"
        )

    weights = COMMODITY_RISK_WEIGHTS.get(commodity, {})
    if country_code in weights:
        w = weights[country_code]
        if w >= 2.0:
            factors.append(
                f"{commodity.replace('_', ' ').title()} from {country_code} is a documented high-risk "
                f"commodity-country combination (Global Forest Watch)"
            )

    if area_ha and area_ha > 4.0:
        factors.append(
            f"Plot area {area_ha:.1f} ha — large plots require enhanced due diligence"
        )

    return factors
