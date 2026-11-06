"""
GEE Tile Server - Real satellite map tiles for frontend rendering
=================================================================
Uses ee.Image.getMapId() to generate XYZ tile URLs that MapLibre
can consume directly. These are REAL pixel-level GEE outputs, not
statistics or thumbnails.

Each function returns a tile_url like:
  https://earthengine.googleapis.com/v1/projects/ee-hanzilabinyounasai/maps/MAPID/tiles/{z}/{x}/{y}

These URLs expire after ~24h (fine for demo/hackathon).
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

GEE_PROJECT = "ee-hanzilabinyounasai"
_initialized = False


def _init() -> bool:
    global _initialized
    if _initialized:
        return True
    try:
        import ee
        ee.Initialize(project=GEE_PROJECT)
        _initialized = True
        return True
    except Exception as exc:
        logger.warning("GEE tile server init failed: %s", exc)
        return False


def _safe_tile_url(image, vis_params: dict) -> str | None:
    """Get a real XYZ tile URL from a GEE image."""
    try:
        import ee
        map_id = image.getMapId(vis_params)
        return map_id["tile_fetcher"].url_format
    except Exception as exc:
        logger.warning("getMapId failed: %s", exc)
        return None


def _to_ee_geometry(geometry: dict | None = None, bbox: tuple[float, float, float, float] | None = None) -> Any:
    """Safely convert GeoJSON geometry dict or bbox to ee.Geometry."""
    import ee
    if geometry is not None:
        try:
            if isinstance(geometry, dict):
                if geometry.get("type") == "FeatureCollection" and geometry.get("features"):
                    return ee.FeatureCollection(geometry).geometry()
                if geometry.get("type") == "Feature" and "geometry" in geometry:
                    return ee.Geometry(geometry["geometry"])
                if "type" in geometry and "coordinates" in geometry:
                    return ee.Geometry(geometry)
            return ee.Geometry(geometry)
        except Exception as exc:
            logger.warning("Failed to parse ee.Geometry from geometry dict: %s", exc)
    if bbox is not None:
        try:
            return ee.Geometry.Rectangle([bbox[0], bbox[1], bbox[2], bbox[3]])
        except Exception as exc:
            logger.warning("Failed to parse ee.Geometry from bbox: %s", exc)
    return None


def _clip_image(img: Any, bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> Any:
    """Guarantee final GEE image is clipped strictly to exact polygon geometry (or bbox)."""
    region = _to_ee_geometry(geometry, bbox)
    if region is not None:
        try:
            return img.clip(region)
        except Exception as exc:
            logger.warning("img.clip(region) failed: %s", exc)
    return img



# -- 1. Hansen GFC v1.13 2025 - Tree Cover 2020 -------------------------------

def get_hansen_treecover_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    Hansen GFC v1.13 - treecover2000 band.
    Shows forest cover percentage (0-100%) → black to green gradient.
    This is the 2020 baseline for EUDR compliance.
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
        treecover = hansen.select("treecover2000")
        treecover = _clip_image(treecover, bbox, geometry)
        url = _safe_tile_url(treecover, {
            "min": 0, "max": 100,
            "palette": ["000000", "004400", "008800", "00cc00", "00ff00"],
        })
        return {
            "available": bool(url),
            "tile_url": url,
            "label": "Hansen GFC · Tree Cover 2020 Baseline",
            "dataset": "UMD/hansen/global_forest_change_2025_v1_13",
            "band": "treecover2000",
            "legend": {"title": "Tree Cover %", "colormap": "Greens", "min": 0, "max": 100, "units": "%"},
        }
    except Exception as exc:
        logger.warning("Hansen treecover tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


# -- 2. Hansen GFC v1.13 2025 - Post-2020 Forest Loss ------------------------

def get_hansen_loss_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    Hansen GFC v1.13 - lossyear band filtered to post-2020 only (EUDR relevant).
    Yellow = 2021, Orange = 2022-2023, Red = 2024-2025.
    This is THE primary EUDR deforestation evidence layer.
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
        lossyear = hansen.select("lossyear")
        post_cutoff_loss = lossyear.updateMask(lossyear.gt(20))
        post_cutoff_loss = _clip_image(post_cutoff_loss, bbox, geometry)
        url = _safe_tile_url(post_cutoff_loss, {
            "min": 21, "max": 25,
            "palette": ["ffff00", "ffa500", "ff6600", "ff0000", "8b0000"],
        })
        return {
            "available": bool(url),
            "tile_url": url,
            "label": "Hansen GFC · Post-2020 Forest Loss (EUDR Relevant)",
            "dataset": "UMD/hansen/global_forest_change_2025_v1_13",
            "band": "lossyear > 20",
            "legend": {
                "title": "Hansen Forest Loss (30m)",
                "classes": [
                    {"label": "Standing Forest Baseline (Dec 2020)", "color": "#315F50"},
                    {"label": "Post-2020 Forest Loss (EUDR Art. 3(a) Violation)", "color": "#F04444"},
                ],
            },
        }
    except Exception as exc:
        logger.warning("Hansen loss tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


# -- 3. Natural Forests 2020 - Probability Map --------------------------------

def get_natural_forest_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    Nature Trace Natural Forest Probability 2020 (10m).
    White→green gradient: higher = more likely natural forest.
    Built specifically to support EUDR compliance.
    Pixel value / 250 = probability (as per dataset spec).
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        col = ee.ImageCollection(
            "projects/nature-trace/assets/forest_typology/natural_forest_2020_v1_0_collection"
        ).mosaic().select("B0")
        # Mask zero-probability pixels (ocean/no-data)
        masked = col.updateMask(col.neq(0))
        masked = _clip_image(masked, bbox, geometry)
        url = _safe_tile_url(masked, {
            "min": 0, "max": 250,
            "palette": ["ffffff", "d4edda", "74c476", "238b45", "00441b"],
        })
        # Binary threshold layer (threshold = 0.52 * 250 = 130)
        binary = col.gte(130).updateMask(col.gte(130))
        binary = _clip_image(binary, bbox, geometry)
        url_binary = _safe_tile_url(binary, {"palette": ["008080"]})
        return {
            "available": bool(url),
            "tile_url": url,
            "tile_url_binary": url_binary,
            "label": "Natural Forests 2020 · Probability (10m)",
            "dataset": "projects/nature-trace/assets/forest_typology/natural_forest_2020_v1_0_collection",
            "legend": {
                "title": "Natural Forest Probability",
                "colormap": "Greens",
                "min": 0, "max": 1, "units": "probability",
            },
        }
    except Exception as exc:
        logger.warning("Natural forest tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


# -- 4. Forest Typology 2020 - 6-Class Classification ------------------------

def get_forest_typology_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    Forest Typology (ForTy) 2020 v1.0 - argmax class per pixel.
    6 classes:
      1=Primary Forest (dark green)
      2=Naturally Regenerating (light green)
      3=Planted Forest (blue)
      4=Plantation Forest (pink)
      5=Tree Crops & Agroforestry (orange)
      6=Other land (yellow)
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        dataset = ee.ImageCollection(
            "projects/nature-trace/assets/forest_typology/forest_typology_2020_v1_0_collection"
        ).mosaic()
        # Compute argmax class as per dataset documentation
        b5 = ee.Image(250).subtract(dataset.select([0, 1, 2, 3, 4]).reduce("sum"))
        classified = dataset.addBands(b5).toArray().arrayArgmax().arrayGet([0]).add(1)
        # Mask non-forest areas (class 6 = other land)
        masked = classified.updateMask(classified.lt(6))
        masked = _clip_image(masked, bbox, geometry)
        url = _safe_tile_url(masked, {
            "min": 1, "max": 5,
            "palette": ["1B7837", "7FBF7B", "1D91C0", "E65FA9", "E6AB02"],
        })
        return {
            "available": bool(url),
            "tile_url": url,
            "label": "Forest Typology 2020 · Classification (10m)",
            "dataset": "projects/nature-trace/assets/forest_typology/forest_typology_2020_v1_0_collection",
            "legend": {
                "title": "Forest Type",
                "classes": [
                    {"label": "Primary Forest", "color": "#1B7837"},
                    {"label": "Naturally Regenerating", "color": "#7FBF7B"},
                    {"label": "Planted Forest", "color": "#1D91C0"},
                    {"label": "Plantation Forest", "color": "#E65FA9"},
                    {"label": "Tree Crops & Agroforestry", "color": "#E6AB02"},
                ],
            },
        }
    except Exception as exc:
        logger.warning("Forest typology tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


# -- 5. WRI Drivers of Forest Loss 2001-2025 ----------------------------------

def get_wri_drivers_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    WRI/Google DeepMind - Dominant driver of tree cover loss 2001-2025.
    7 classes:
      1=Permanent Agriculture (orange)
      2=Hard Commodities (salmon)
      3=Shifting Cultivation (yellow)
      4=Logging (olive)
      5=Wildfire (brown)
      6=Settlements & Infrastructure (purple)
      7=Other Natural Disturbances (dark blue)
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        drivers = ee.Image(
            "projects/landandcarbon/assets/wri_gdm_drivers_forest_loss_1km/v1_3_2001_2025"
        ).select("classification")
        drivers = _clip_image(drivers, bbox, geometry)
        url = _safe_tile_url(drivers, {
            "min": 1, "max": 7,
            "palette": ["E39D29", "E58074", "e9d700", "51a44e", "895128", "a354a0", "3a209a"],
        })
        return {
            "available": bool(url),
            "tile_url": url,
            "label": "WRI/DeepMind · Drivers of Forest Loss 2001-2025 (1km)",
            "dataset": "projects/landandcarbon/assets/wri_gdm_drivers_forest_loss_1km/v1_3_2001_2025",
            "legend": {
                "title": "Dominant Driver of Forest Loss",
                "classes": [
                    {"label": "Permanent Agriculture", "color": "#E39D29"},
                    {"label": "Hard Commodities", "color": "#E58074"},
                    {"label": "Shifting Cultivation", "color": "#e9d700"},
                    {"label": "Logging", "color": "#51a44e"},
                    {"label": "Wildfire", "color": "#895128"},
                    {"label": "Settlements & Infrastructure", "color": "#a354a0"},
                    {"label": "Other Natural Disturbances", "color": "#3a209a"},
                ],
            },
        }
    except Exception as exc:
        logger.warning("WRI drivers tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


# -- 6. ESA WorldCover 2020 v100 (10m) -----------------------------------------

def get_esa_worldcover_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    ESA WorldCover 2020 v100 (10m) - Land cover classification at EUDR cutoff date (Dec 31, 2020).
    11 discrete classes remapped for clean visualization.
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        esa = ee.ImageCollection("ESA/WorldCover/v100").mosaic().select("Map")
        classes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100]
        remapped = esa.remap(classes, list(range(len(classes))))
        remapped = _clip_image(remapped, bbox, geometry)
        palette = [
            "006400", "ffbb22", "ffff4c", "f096ff", "fa0000",
            "b4b4b4", "f0f0f0", "0064c8", "0096a0", "00cf75", "fae6a0"
        ]
        url = _safe_tile_url(remapped, {
            "min": 0, "max": 10,
            "palette": palette,
        })
        return {
            "available": bool(url),
            "tile_url": url,
            "label": "ESA WorldCover 2020 · Land Cover Baseline (10m)",
            "dataset": "ESA/WorldCover/v100",
            "band": "Map",
            "legend": {
                "title": "Land Cover (2020 Baseline)",
                "classes": [
                    {"label": "Tree cover", "color": "#006400"},
                    {"label": "Shrubland", "color": "#ffbb22"},
                    {"label": "Grassland", "color": "#ffff4c"},
                    {"label": "Cropland", "color": "#f096ff"},
                    {"label": "Built-up", "color": "#fa0000"},
                    {"label": "Bare / sparse", "color": "#b4b4b4"},
                    {"label": "Snow and ice", "color": "#f0f0f0"},
                    {"label": "Water", "color": "#0064c8"},
                    {"label": "Wetland", "color": "#0096a0"},
                    {"label": "Mangroves", "color": "#00cf75"},
                    {"label": "Moss / lichen", "color": "#fae6a0"},
                ],
            },
        }
    except Exception as exc:
        logger.warning("ESA WorldCover tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


# -- 7. Commodity Presence Maps 2026a (Google / Forest Data Partnership) -------
COMMODITY_TILE_CONFIG = {
    "cocoa":    ("projects/forestdatapartnership/assets/cocoa/model_2026a",   0.50, "2020", "white,#6f4e37"),
    "coffee":   ("projects/forestdatapartnership/assets/coffee/model_2026a",  0.95, "2020", "white,#3d2b1f"),
    "palm_oil": ("projects/forestdatapartnership/assets/palm/model_2026a",    0.47, "2020", "white,#228b22"),
    "rubber":   ("projects/forestdatapartnership/assets/rubber/model_2026a",  0.35, "2020", "white,#708090"),
}

COMMODITY_NAMES = {
    "cocoa": "Cocoa", "coffee": "Coffee",
    "palm_oil": "Palm Oil", "rubber": "Rubber",
}


def get_commodity_tiles(commodity: str, bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    Forest Data Partnership 2025 - commodity probability map.
    Returns actual pixel-level probability of commodity presence.
    Available for: cocoa, coffee, palm_oil, rubber.
    """
    if not _init():
        return {"available": False}
    config = COMMODITY_TILE_CONFIG.get(commodity.lower())
    if not config:
        return {"available": False, "note": f"No commodity map for {commodity}"}

    asset_path, threshold, year, palette = config
    try:
        import ee
        col = ee.ImageCollection(asset_path).filterDate(
            f"{year}-01-01", f"{year}-12-31"
        ).mosaic()
        # Show probabilities above threshold masked
        masked = col.updateMask(col.gt(threshold))
        masked = _clip_image(masked, bbox, geometry)
        url = _safe_tile_url(masked, {
            "min": threshold, "max": 1.0,
            "palette": palette.split(","),
        })
        name = COMMODITY_NAMES.get(commodity.lower(), commodity)
        return {
            "available": bool(url),
            "tile_url": url,
            "label": f"{name} Probability Map 2023 (FDP 2025, 10m)",
            "dataset": asset_path,
            "threshold": threshold,
            "legend": {
                "title": f"{name} Probability",
                "colormap": "Browns",
                "min": threshold, "max": 1.0, "units": "probability",
            },
        }
    except Exception as exc:
        logger.warning("Commodity tiles failed (%s): %s", commodity, exc)
        return {"available": False, "error": str(exc)}


# -- 8. EC JRC GFC2020 (Official EU Forest Baseline 10m) ----------------------

def get_jrc_gfc2020_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    European Commission Joint Research Centre (JRC) Global Forest Cover 2020 (10m).
    Official EU reference baseline dataset for Regulation (EU) 2023/1115.
    Band 'Map' == 1 represents forest standing at Dec 31, 2020.
    Uses high-contrast vibrant electric emerald green (#00FF88) so it strongly stands
    out against dark green satellite imagery.
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        jrc = ee.Image("JRC/GFC2020/V4").select("Map")
        forest_only = jrc.updateMask(jrc.eq(1))
        forest_only = _clip_image(forest_only, bbox, geometry)
        url = _safe_tile_url(forest_only, {
            "min": 1, "max": 1,
            "palette": ["00FF88"],
        })
        return {
            "available": bool(url),
            "tile_url": url,
            "label": "EC JRC GFC2020 · Official EU Forest Baseline (10m)",
            "dataset": "JRC/GFC2020/V4",
            "band": "Map == 1",
            "legend": {
                "title": "EC JRC Forest 2020 (10m)",
                "classes": [{"label": "EU Baseline Forest (Dec 31, 2020)", "color": "#00FF88"}],
            },
        }
    except Exception as exc:
        logger.warning("JRC tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


# -- 9. WUR/WRI RADD Sentinel-1 Radar Disturbance Alerts (10m) ----------------

def get_radd_alerts_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    Wageningen University / WRI RADD Sentinel-1 Radar Disturbance Alerts (10m).
    All-weather cloud-penetrating radar disturbance monitoring.
    Alert values: 2 = unconfirmed disturbance, 3 = confirmed disturbance.
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        radd_col = ee.ImageCollection("projects/radar-wur/raddalert/v1") \
            .filter(ee.Filter.listContains("system:band_names", "Alert")) \
            .select(["Alert"])
        radd = radd_col.mosaic()
        alerts = radd.updateMask(radd.gte(2))
        alerts = _clip_image(alerts, bbox, geometry)
        url = _safe_tile_url(alerts, {
            "min": 2, "max": 3,
            "palette": ["ff8800", "ff0000"],
        })
        return {
            "available": bool(url),
            "tile_url": url,
            "label": "WUR/WRI RADD · Sentinel-1 Radar Disturbance Alerts (10m)",
            "dataset": "projects/radar-wur/raddalert/v1",
            "band": "Alert",
            "legend": {
                "title": "Sentinel-1 Radar Alerts (10m)",
                "classes": [
                    {"label": "Unconfirmed Radar Disturbance", "color": "#ff8800"},
                    {"label": "High-Confidence Radar Disturbance", "color": "#ff0000"},
                ],
            },
        }
    except Exception as exc:
        logger.warning("RADD alert tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


# -- 10. UNEP-WCMC WDPA Protected Areas ----------------------------------------

def get_protected_areas_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    UNEP-WCMC World Database on Protected Areas (WDPA).
    Legality constraint layer for EUDR Article 3(b).
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        pa = ee.FeatureCollection("WCMC/WDPA/current/polygons")
        img = ee.Image().byte().paint(pa, 1)
        img = _clip_image(img, bbox, geometry)
        url = _safe_tile_url(img, {
            "min": 1, "max": 1,
            "palette": ["dc2626"],
        })
        return {
            "available": bool(url),
            "tile_url": url,
            "label": "UNEP-WCMC · WDPA Protected Areas (GEE)",
            "dataset": "WCMC/WDPA/current/polygons",
            "legend": {
                "title": "Protected Areas (WDPA)",
                "classes": [{"label": "Designated Protected Area", "color": "#dc2626"}],
            },
        }
    except Exception as exc:
        logger.warning("WDPA protected areas tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


def get_pwri_intersection_tiles(bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> dict[str, Any]:
    """
    Pixel-Wise Raster Intersection (PWRI-3D 5-Class Partition):
    Multi-sensor spatial intersection between post-2020 Hansen loss, JRC GFC2020 V4 statutory forest,
    and ESA WorldCover 10m non-agronomic mask:
      - Emerald Green (#2E9E6F): Verified Clean Export Land (Art. 3(a) Compliant)
      - Amber (#FFB703): Agricultural Plantation Replanting / Crop Rotation (EUDR Art. 2(5) exempt)
      - Royal Blue (#3B82C4): Sustainable Commercial Silviculture Rotation (EUDR Art. 2(3)/2(7) exempt)
      - Crimson Red (#E63946): Statutory Deforestation (EUDR Art. 3(a) violation on standing 2020 forest)
      - Slate Grey (#64748B): Non-Agronomic / Urban / Water / No-Data (Excluded from agricultural capacity)
    """
    if not _init():
        return {"available": False}
    try:
        import ee
        hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
        treecover = hansen.select("treecover2000")
        lossyear  = hansen.select("lossyear")
        loss      = hansen.select("loss")
        post_cutoff = lossyear.gt(20).And(loss.eq(1)).And(treecover.gte(30))

        jrc_img = ee.Image("JRC/GFC2020/V4")
        jrc_forest = jrc_img.select("Map").unmask(0).eq(1)

        statutory_deforest = post_cutoff.And(jrc_forest)
        replanting = post_cutoff.And(jrc_forest.Not())

        wc_map = ee.ImageCollection("ESA/WorldCover/v200").first().select("Map").unmask(0)
        non_agronomic = (
            wc_map.eq(50).Or(wc_map.eq(60)).Or(wc_map.eq(70)).Or(wc_map.eq(80))
            .And(jrc_forest.Not()).And(post_cutoff.Not())
        )

        inter_vis = ee.ImageCollection([
            ee.Image(1).updateMask(non_agronomic).visualize(palette=['#64748B']),
            ee.Image(1).updateMask(replanting).visualize(palette=['#FFB703']),
            ee.Image(1).updateMask(statutory_deforest).visualize(palette=['#E63946']),
        ]).mosaic()

        inter_vis = _clip_image(inter_vis, bbox, geometry)
        url = _safe_tile_url(inter_vis, {})
        return {
            "available": bool(url),
            "tile_url": url,
            "label": "PWRI-3D · 5-Class Statutory Land Partition (10m)",
            "dataset": "UMD/hansen/global_forest_change_2025_v1_13 ∩ JRC/GFC2020/V4 ∩ ESA/WorldCover/v200",
            "legend": {
                "title": "PWRI-3D 5-Class Land Partition",
                "classes": [
                    {"label": "Clean Compliant Land (Art. 3a)", "color": "#2E9E6F"},
                    {"label": "Plantation Replanting (Art. 2(5) Exempt)", "color": "#FFB703"},
                    {"label": "Sustainable Silviculture (Art. 2(3) Exempt)", "color": "#3B82C4"},
                    {"label": "Statutory Deforestation (Art. 3a Violation)", "color": "#E63946"},
                    {"label": "Non-Agronomic / Urban / Water / No-Data", "color": "#64748B"},
                ],
            },
        }
    except Exception as exc:
        logger.warning("PWRI intersection tiles failed: %s", exc)
        return {"available": False, "error": str(exc)}


# -- Master: Generate all map layers for a plot --------------------------------

def get_all_map_layers(commodity: str, bbox: tuple[float, float, float, float] | None = None, geometry: dict | None = None) -> list[dict[str, Any]]:
    """
    Generate ALL GEE map tile URLs for a given commodity assessment.
    These are REAL XYZ tile URLs from GEE that MapLibre renders as raster layers.
    """
    layers = []

    # 0. PWRI Statutory Deforestation Intersection (Core EUDR Map Algebra)
    pwri = get_pwri_intersection_tiles(bbox=bbox, geometry=geometry)
    if pwri.get("available") and pwri.get("tile_url"):
        layers.append({
            "id": "gee-pwri-intersection",
            "label": pwri["label"],
            "tile_url": pwri["tile_url"],
            "visible": True,
            "opacity": 1.0,
            "legend": pwri["legend"],
            "dataset": pwri.get("dataset", ""),
            "layer_type": "intersection",
        })

    # 1. Hansen Post-2020 Loss (primary EUDR layer - available in panel)
    loss = get_hansen_loss_tiles(bbox=bbox, geometry=geometry)
    if loss.get("available") and loss.get("tile_url"):
        layers.append({
            "id": "gee-hansen-loss",
            "label": loss["label"],
            "tile_url": loss["tile_url"],
            "visible": False,
            "opacity": 1.0,
            "legend": loss["legend"],
            "dataset": loss.get("dataset", ""),
            "layer_type": "hansen_loss",
        })

    # 2. EC JRC GFC2020 (Official European Commission Baseline 10m)
    jrc = get_jrc_gfc2020_tiles(bbox=bbox, geometry=geometry)
    if jrc.get("available") and jrc.get("tile_url"):
        layers.append({
            "id": "gee-jrc-gfc2020",
            "label": jrc["label"],
            "tile_url": jrc["tile_url"],
            "visible": False,
            "opacity": 0.85,
            "legend": jrc["legend"],
            "dataset": jrc.get("dataset", ""),
            "layer_type": "jrc_gfc2020",
        })

    # 3. WUR/WRI RADD Sentinel-1 Radar Alerts (All-weather 10m near-real-time)
    radd = get_radd_alerts_tiles(bbox=bbox, geometry=geometry)
    if radd.get("available") and radd.get("tile_url"):
        layers.append({
            "id": "gee-radd-alerts",
            "label": radd["label"],
            "tile_url": radd["tile_url"],
            "visible": False,
            "opacity": 1.0,
            "legend": radd["legend"],
            "dataset": radd.get("dataset", ""),
            "layer_type": "radd_alerts",
        })

    # 2. Hansen Tree Cover 2020 (baseline context)
    tc = get_hansen_treecover_tiles(bbox=bbox, geometry=geometry)
    if tc.get("available") and tc.get("tile_url"):
        layers.append({
            "id": "gee-hansen-treecover",
            "label": tc["label"],
            "tile_url": tc["tile_url"],
            "visible": True,
            "opacity": 1.0,
            "legend": tc["legend"],
            "dataset": tc.get("dataset", ""),
            "layer_type": "hansen_treecover",
        })

    # 3. ESA WorldCover 2020 (10m Land Cover Baseline at EUDR cutoff)
    esa = get_esa_worldcover_tiles(bbox=bbox, geometry=geometry)
    if esa.get("available") and esa.get("tile_url"):
        layers.append({
            "id": "gee-esa-worldcover",
            "label": esa["label"],
            "tile_url": esa["tile_url"],
            "visible": True,
            "opacity": 1.0,
            "legend": esa["legend"],
            "dataset": esa.get("dataset", ""),
            "layer_type": "esa_worldcover",
        })

    # 4. WRI / DeepMind Drivers of Forest Loss
    dr = get_wri_drivers_tiles(bbox=bbox, geometry=geometry)
    if dr.get("available") and dr.get("tile_url"):
        layers.append({
            "id": "gee-wri-drivers",
            "label": dr["label"],
            "tile_url": dr["tile_url"],
            "visible": True,
            "opacity": 1.0,
            "legend": dr["legend"],
            "dataset": dr.get("dataset", ""),
            "layer_type": "wri_drivers",
        })

    # 5. Natural Forests 2020
    nf = get_natural_forest_tiles(bbox=bbox, geometry=geometry)
    if nf.get("available") and nf.get("tile_url"):
        layers.append({
            "id": "gee-natural-forest",
            "label": nf["label"],
            "tile_url": nf["tile_url"],
            "visible": False,
            "opacity": 1.0,
            "legend": nf["legend"],
            "dataset": nf.get("dataset", ""),
            "layer_type": "natural_forest",
        })

    # 6. Forest Typology 2020
    ft = get_forest_typology_tiles(bbox=bbox, geometry=geometry)
    if ft.get("available") and ft.get("tile_url"):
        layers.append({
            "id": "gee-forest-typology",
            "label": ft["label"],
            "tile_url": ft["tile_url"],
            "visible": False,
            "opacity": 1.0,
            "legend": ft["legend"],
            "dataset": ft.get("dataset", ""),
            "layer_type": "forest_typology",
        })

    # 7. Commodity map (if available for this commodity)
    cm = get_commodity_tiles(commodity, bbox=bbox, geometry=geometry)
    if cm.get("available") and cm.get("tile_url"):
        layers.append({
            "id": f"gee-commodity-{commodity}",
            "label": cm["label"],
            "tile_url": cm["tile_url"],
            "visible": False,
            "opacity": 1.0,
            "legend": cm["legend"],
            "dataset": cm.get("dataset", ""),
            "layer_type": "commodity_map",
        })

    # 8. UNEP-WCMC Protected Areas (Article 3b legality check)
    pa = get_protected_areas_tiles(bbox=bbox, geometry=geometry)
    if pa.get("available") and pa.get("tile_url"):
        layers.append({
            "id": "gee-protected-areas",
            "label": pa["label"],
            "tile_url": pa["tile_url"],
            "visible": False,
            "opacity": 0.8,
            "legend": pa["legend"],
            "dataset": pa.get("dataset", ""),
            "layer_type": "protected_areas",
        })

    return layers


# -- 11. Sentinel-2 10m Annual Time-Series Timelapse (2020 Cutoff -> 2025) -----

def get_sentinel2_timelapse(
    bbox: tuple[float, float, float, float] | None = None,
    geometry: dict | None = None,
    years: list[int] | None = None,
) -> dict[str, Any]:
    """
    Generate cloud-masked 10m Sentinel-2 (COPERNICUS/S2_SR_HARMONIZED) annual composites
    strictly clipped inside the plot polygon for EUDR visual cross-verification (2020-2025).
    Returns both True-Color RGB (B4/B3/B2) and False-Color NIR Vegetation (B8/B4/B3) XYZ tiles
    and plot-framed thumbnail URLs for each year.
    """
    target_years = years or [2020, 2021, 2022, 2023, 2024, 2025]
    year_labels = {
        2020: "2020 · Statutory Cutoff (Dec 31, 2020)",
        2021: "2021 · Post-Cutoff Year 1",
        2022: "2022 · Post-Cutoff Year 2",
        2023: "2023 · Post-Cutoff Year 3",
        2024: "2024 · Post-Cutoff Year 4",
        2025: "2025 · Present Verification",
    }

    if not _init():
        return {
            "available": False,
            "frames": [
                {
                    "year": y,
                    "label": year_labels.get(y, f"{y} Composite"),
                    "is_cutoff": y == 2020,
                    "rgb_tile_url": None,
                    "nir_tile_url": None,
                    "rgb_thumb_url": None,
                    "nir_thumb_url": None,
                    "sensor": "Sentinel-2 L2A (10m)",
                }
                for y in target_years
            ],
        }

    try:
        import ee
        from concurrent.futures import ThreadPoolExecutor

        region = _to_ee_geometry(geometry, bbox)
        if region is None and bbox:
            region = ee.Geometry.Rectangle([bbox[0], bbox[1], bbox[2], bbox[3]])

        # Buffered bounding box for thumbnail framing around the clipped plot
        thumb_region = region.bounds().buffer(120).bounds() if region is not None else None

        def _build_year_frame(yr: int) -> dict[str, Any]:
            try:
                start_d = f"{yr}-01-01"
                end_d = f"{yr}-12-31" if yr < 2025 else "2026-11-01"

                col = (
                    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                    .filterDate(start_d, end_d)
                )
                if region is not None:
                    col = col.filterBounds(region)

                # Filter low-cloud scenes and apply SCL cloud/shadow mask
                def _mask_s2_clouds(img):
                    scl = img.select("SCL")
                    # Mask cloud shadow (3), medium/high cloud (8, 9), thin cirrus (10)
                    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10))
                    return img.updateMask(mask)

                clean_col = col.filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 45)).map(_mask_s2_clouds)
                # Fallback to unmasked median if tropical cloud cover leaves empty pixels
                fallback_img = col.median()
                composite = clean_col.median().unmask(fallback_img)

                # Strict clip inside the plot polygon so timelapse sticks inside the plot on the map
                clipped = _clip_image(composite, bbox, geometry)

                rgb_vis_params = {"bands": ["B4", "B3", "B2"], "min": 180, "max": 2600, "gamma": 1.25}
                nir_vis_params = {"bands": ["B8", "B4", "B3"], "min": 250, "max": 4200, "gamma": 1.15}

                rgb_tile_url = _safe_tile_url(clipped, rgb_vis_params)
                nir_tile_url = _safe_tile_url(clipped, nir_vis_params)

                # Generate plot-clipped thumbnail with subtle dark context outside the plot
                rgb_thumb_url = None
                nir_thumb_url = None
                if thumb_region is not None:
                    try:
                        bg_rgb = composite.visualize(**rgb_vis_params).multiply(0.32)
                        fg_rgb = clipped.visualize(**rgb_vis_params)
                        framed_rgb = ee.ImageCollection([bg_rgb.byte(), fg_rgb.byte()]).mosaic()
                        rgb_thumb_url = framed_rgb.getThumbURL({
                            "region": thumb_region,
                            "dimensions": 420,
                            "format": "png",
                        })

                        bg_nir = composite.visualize(**nir_vis_params).multiply(0.32)
                        fg_nir = clipped.visualize(**nir_vis_params)
                        framed_nir = ee.ImageCollection([bg_nir.byte(), fg_nir.byte()]).mosaic()
                        nir_thumb_url = framed_nir.getThumbURL({
                            "region": thumb_region,
                            "dimensions": 420,
                            "format": "png",
                        })
                    except Exception:
                        pass

                return {
                    "year": yr,
                    "label": year_labels.get(yr, f"{yr} Composite"),
                    "is_cutoff": yr == 2020,
                    "rgb_tile_url": rgb_tile_url,
                    "nir_tile_url": nir_tile_url,
                    "rgb_thumb_url": rgb_thumb_url,
                    "nir_thumb_url": nir_thumb_url,
                    "sensor": "Sentinel-2 L2A (10m Cloud-Free Composite)",
                }
            except Exception as yr_exc:
                logger.warning("Sentinel-2 timelapse frame %s failed: %s", yr, yr_exc)
                return {
                    "year": yr,
                    "label": year_labels.get(yr, f"{yr} Composite"),
                    "is_cutoff": yr == 2020,
                    "rgb_tile_url": None,
                    "nir_tile_url": None,
                    "rgb_thumb_url": None,
                    "nir_thumb_url": None,
                    "sensor": "Sentinel-2 L2A (10m)",
                }

        with ThreadPoolExecutor(max_workers=6) as pool:
            frames = list(pool.map(_build_year_frame, target_years))

        frames.sort(key=lambda f: f["year"])
        has_any = any(f.get("rgb_tile_url") or f.get("rgb_thumb_url") for f in frames)
        return {
            "available": has_any,
            "resolution_m": 10,
            "dataset": "COPERNICUS/S2_SR_HARMONIZED",
            "frames": frames,
        }
    except Exception as exc:
        logger.warning("Sentinel-2 timelapse generation failed: %s", exc)
        return {"available": False, "error": str(exc), "frames": []}
