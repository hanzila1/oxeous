import ee

ee.Initialize(project="ee-hanzilabinyounasai")

aoi = ee.Geometry.Polygon([[
    [102.190, 0.260],
    [102.200, 0.260],
    [102.200, 0.270],
    [102.190, 0.270],
    [102.190, 0.260]
]])

area_ha = aoi.area().divide(10000).getInfo()

# Hansen GFC
hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
lossyear = hansen.select("lossyear")
treecover2000 = hansen.select("treecover2000")

canopy_2000 = treecover2000.reduceRegion(
    reducer=ee.Reducer.mean(), geometry=aoi, scale=30, maxPixels=1e9
).getInfo().get("treecover2000", 0)

# Total loss any year
total_loss_ha = lossyear.gt(0).multiply(ee.Image.pixelArea()).reduceRegion(
    reducer=ee.Reducer.sum(), geometry=aoi, scale=30, maxPixels=1e9
).getInfo().get("lossyear", 0) / 10000.0

# Post-2020 loss (2021-2024)
post2020_loss_ha = lossyear.gte(21).multiply(ee.Image.pixelArea()).reduceRegion(
    reducer=ee.Reducer.sum(), geometry=aoi, scale=30, maxPixels=1e9
).getInfo().get("lossyear", 0) / 10000.0

# Loss by year post-cutoff
loss_by_year = {}
for yr, code in [(2021, 21), (2022, 22), (2023, 23), (2024, 24)]:
    ha = lossyear.eq(code).multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(), geometry=aoi, scale=30, maxPixels=1e9
    ).getInfo().get("lossyear", 0) / 10000.0
    loss_by_year[yr] = round(ha, 2)

# Google FDP Palm Model
palm_col = ee.ImageCollection("projects/forestdatapartnership/assets/palm/model_2026a").filterDate("2020-01-01", "2020-12-31").mosaic()
palm_stats = palm_col.select("probability").reduceRegion(
    reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
    geometry=aoi, scale=10, maxPixels=1e9
).getInfo()

# Sentinel-2 NDVI Trajectory
def mask_s2(img):
    scl = img.select("SCL")
    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    return img.updateMask(mask)

years = [2019, 2020, 2021, 2022, 2023, 2024, 2025]
ndvi_trajectory = {}

for y in years:
    s2_y = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(aoi)
            .filterDate(f"{y}-01-01", f"{y}-12-31")
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 50))
            .map(mask_s2))
    def calc_ndvi(img):
        return img.normalizedDifference(["B8", "B4"]).rename("ndvi")
    ndvi_med = s2_y.map(calc_ndvi).median()
    val = ndvi_med.reduceRegion(
        reducer=ee.Reducer.mean(), geometry=aoi, scale=10, maxPixels=1e9
    ).getInfo().get("ndvi", None)
    ndvi_trajectory[y] = round(val, 3) if val is not None else None

print("=== REAL NON-COMPLIANT PALM METRICS (CELL A) ===")
print(f"Area: {area_ha:.2f} ha")
print(f"2000 Baseline Canopy: {canopy_2000:.2f}%")
print(f"Total Historical Loss (2001-2024): {total_loss_ha:.2f} ha")
print(f"Post-2020 Deforestation: {post2020_loss_ha:.2f} ha ({(post2020_loss_ha/area_ha)*100:.2f}%)")
print(f"Loss by year: {loss_by_year}")
print(f"Palm Stats: {palm_stats}")
print(f"NDVI Trajectory: {ndvi_trajectory}")
