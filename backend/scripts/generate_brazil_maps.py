import os
import urllib.request
import ee

ee.Initialize(project="ee-hanzilabinyounasai")

# Sourcing plot coordinates: [-55.50, -12.80] to [-55.40, -12.70] (12,321 ha commercial plot)
aoi_geom = ee.Geometry.Polygon([[
    [-55.50, -12.80],
    [-55.40, -12.80],
    [-55.40, -12.70],
    [-55.50, -12.70],
    [-55.50, -12.80]
]])

# Context bounding box (matching 1200x960 1.25 aspect ratio)
context_geom = ee.Geometry.Polygon([[
    [-55.57, -12.86],
    [-55.33, -12.86],
    [-55.33, -12.64],
    [-55.57, -12.64],
    [-55.57, -12.86]
]])

# 1. Base Sentinel-2 RGB Mosaic (2023 dry season cloud-free)
s2_img = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(context_geom)
          .filterDate("2023-06-01", "2023-10-31")
          .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))
          .median())

s2_vis = s2_img.visualize(bands=["B4", "B3", "B2"], min=300, max=2800)
s2_dim = s2_img.visualize(bands=["B4", "B3", "B2"], min=600, max=4500)

# 2. Hansen GFC Post-2020 Loss (Strictly Clipped to Cadastral AOI Boundary)
hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
loss = hansen.select("lossyear")
# lossyear >= 21 is post-2020, clipped strictly to aoi_geom
post2020_loss = loss.gte(21).clip(aoi_geom).selfMask()
loss_vis = post2020_loss.visualize(palette=["#ef4444"])

# 3. Natural Forest Baseline 2020 (Nature Trace 10m, Clipped to AOI)
nat_forest = ee.ImageCollection(
    "projects/nature-trace/assets/forest_typology/natural_forest_2020_v1_0_collection"
).mosaic().select("B0")
nat_forest_masked = nat_forest.updateMask(nat_forest.gt(25)).clip(aoi_geom)
nat_forest_vis = nat_forest_masked.visualize(
    min=25, max=250,
    palette=["#ca8a04", "#84cc16", "#22c55e", "#15803d"]
)

# 4. AOI Yellow Outline
aoi_outline = (ee.Image().byte()
               .paint(ee.FeatureCollection([ee.Feature(aoi_geom)]), color=1, width=3)
               .visualize(palette=["#facc15"]))

# Composite 1: Sentinel-2 + Post-2020 Loss + Yellow AOI
comp1 = ee.ImageCollection([s2_vis, loss_vis, aoi_outline]).mosaic()

# Composite 2: Dimmed S2 + Natural Forest 10m + Yellow AOI
comp2 = ee.ImageCollection([s2_dim, nat_forest_vis, aoi_outline]).mosaic()

# Fetch Thumbnails
url1 = comp1.getThumbURL({
    "region": context_geom,
    "dimensions": "1200x960",
    "format": "png"
})

url2 = comp2.getThumbURL({
    "region": context_geom,
    "dimensions": "1200x960",
    "format": "png"
})

print("Thumbnail 1 URL:", url1)
print("Thumbnail 2 URL:", url2)

os.makedirs("reports/assets_hd", exist_ok=True)
out1 = os.path.abspath("reports/assets_hd/brazil_soya_loss.png")
out2 = os.path.abspath("reports/assets_hd/brazil_soya_natural_forest.png")

urllib.request.urlretrieve(url1, out1)
urllib.request.urlretrieve(url2, out2)

print(f"Saved Brazil maps: {out1} ({os.path.getsize(out1):,} bytes), {out2} ({os.path.getsize(out2):,} bytes)")
