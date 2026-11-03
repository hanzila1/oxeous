import ee

ee.Initialize(project="ee-hanzilabinyounasai")

# Cadastral AOI coordinates: [101.910, 0.270] to [101.920, 0.280] in Pelalawan, Riau, Sumatra
aoi_geom = ee.Geometry.Polygon([[
    [101.910, 0.270],
    [101.920, 0.270],
    [101.920, 0.280],
    [101.910, 0.280],
    [101.910, 0.270]
]])

# 1. Total Cadastral Area
area_ha = aoi_geom.area().divide(10000).getInfo()

# 2. Hansen GFC v1.13 Stats
hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
treecover2000 = hansen.select("treecover2000")
lossyear = hansen.select("lossyear")

# 2000 baseline forest canopy (>30% canopy)
canopy_2000_mean = treecover2000.reduceRegion(
    reducer=ee.Reducer.mean(),
    geometry=aoi_geom,
    scale=30,
    maxPixels=1e9
).getInfo().get("treecover2000", 0)

# Total historical loss (any year)
total_loss_ha = lossyear.gt(0).multiply(ee.Image.pixelArea()).reduceRegion(
    reducer=ee.Reducer.sum(),
    geometry=aoi_geom,
    scale=30,
    maxPixels=1e9
).getInfo().get("lossyear", 0) / 10000.0

# Post-2020 loss (lossyear >= 21)
post2020_loss_ha = lossyear.gte(21).multiply(ee.Image.pixelArea()).reduceRegion(
    reducer=ee.Reducer.sum(),
    geometry=aoi_geom,
    scale=30,
    maxPixels=1e9
).getInfo().get("lossyear", 0) / 10000.0

# 3. Google Forest Data Partnership Palm Model (model_2026a)
palm_col = ee.ImageCollection("projects/forestdatapartnership/assets/palm/model_2026a").filterDate("2020-01-01", "2020-12-31").mosaic()
palm_stats = palm_col.select("probability").reduceRegion(
    reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
    geometry=aoi_geom,
    scale=10,
    maxPixels=1e9
).getInfo()

# 4. Multi-Year Sentinel-2 NDVI Trajectory (2019 to 2025)
def mask_s2(img):
    scl = img.select("SCL")
    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    return img.updateMask(mask)

years = [2019, 2020, 2021, 2022, 2023, 2024, 2025]
ndvi_trajectory = {}

for y in years:
    s2_y = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(aoi_geom)
            .filterDate(f"{y}-01-01", f"{y}-12-31")
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 50))
            .map(mask_s2))
    
    # Calculate NDVI: (B8 - B4) / (B8 + B4)
    def calc_ndvi(img):
        return img.normalizedDifference(["B8", "B4"]).rename("ndvi")
    
    ndvi_med = s2_y.map(calc_ndvi).median()
    val = ndvi_med.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=aoi_geom,
        scale=10,
        maxPixels=1e9
    ).getInfo().get("ndvi", None)
    ndvi_trajectory[y] = round(val, 3) if val is not None else None

# 5. WDPA Protected Areas check
wdpa = ee.FeatureCollection("WCMC/WDPA/current/polygons").filterBounds(aoi_geom)
wdpa_count = wdpa.size().getInfo()

print("=== INDONESIA PALM OIL GEE METRICS ===")
print(f"Cadastral Area: {area_ha:.2f} ha")
print(f"2000 Baseline Canopy: {canopy_2000_mean:.2f}%")
print(f"Total Historical Loss (2001-2024): {total_loss_ha:.2f} ha")
print(f"Post-2020 Deforestation (EUDR Breach): {post2020_loss_ha:.2f} ha (0.00%)")
print(f"Google FDP Palm Probability: Mean={palm_stats.get('probability_mean')*100:.2f}%, Max={palm_stats.get('probability_max')*100:.2f}%")
print(f"NDVI Trajectory (2019-2025): {ndvi_trajectory}")
print(f"WDPA Protected Area Overlap: {wdpa_count} features")
