import os
import urllib.request
import ee

ee.Initialize(project="ee-hanzilabinyounasai")

# Cadastral AOI coordinates: [100.507, 6.810] to [100.517, 6.820] (~122.77 ha parcel in Sadao, Songkhla, Thailand)
aoi_geom = ee.Geometry.Polygon([[
    [100.507, 6.810],
    [100.517, 6.810],
    [100.517, 6.820],
    [100.507, 6.820],
    [100.507, 6.810]
]])

# Context bounding box (matching 1200x960 1.25 aspect ratio around the parcel)
context_geom = ee.Geometry.Polygon([[
    [100.492, 6.798],
    [100.532, 6.798],
    [100.532, 6.832],
    [100.492, 6.832],
    [100.492, 6.798]
]])

# 1. Base Sentinel-2 RGB Mosaic (Cloud-masked across multi-temporal stack for 0% cloud occlusion)
def mask_s2(img):
    scl = img.select("SCL")
    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    return img.updateMask(mask)

s2_col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(context_geom)
          .filterDate("2022-01-01", "2024-06-30")
          .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40))
          .map(mask_s2))

s2_clean = s2_col.median()
s2_vis = s2_clean.visualize(bands=["B4", "B3", "B2"], min=200, max=2200)
s2_dim = s2_clean.visualize(bands=["B4", "B3", "B2"], min=400, max=3800)

# 2. Hansen GFC Post-2020 Deforestation (Strictly Clipped to AOI)
hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
loss = hansen.select("lossyear")
post2020_loss = loss.gte(21).clip(aoi_geom).selfMask()
loss_vis = post2020_loss.visualize(palette=["#ef4444"])

# 3. Google Forest Data Partnership 10m Rubber Model (model_2026a)
# Official GEE palette: min: 0.35, max: 1.0, palette: white to sapphire blue
rubber_col = ee.ImageCollection("projects/forestdatapartnership/assets/rubber/model_2026a").filterDate("2020-01-01", "2020-12-31").mosaic()
rubber_prob = rubber_col.select("probability")
rubber_masked = rubber_prob.updateMask(rubber_prob.gt(0.35)).clip(aoi_geom)
rubber_vis = rubber_masked.visualize(
    min=0.35, max=1.0,
    palette=["#ffffff", "#60a5fa", "#2563eb", "#1d4ed8", "#0000ff"]
)

# 4. AOI Yellow Perimeter Outline
aoi_outline = (ee.Image().byte()
               .paint(ee.FeatureCollection([ee.Feature(aoi_geom)]), color=1, width=3)
               .visualize(palette=["#facc15"]))

# Composite 1: Clean Sentinel-2 + Post-2020 Loss + Yellow AOI
comp1 = ee.ImageCollection([s2_vis, loss_vis, aoi_outline]).mosaic()

# Composite 2: Dimmed S2 + Rubber Heatmap (Official GEE Blue Palette) + Yellow AOI
comp2 = ee.ImageCollection([s2_dim, rubber_vis, aoi_outline]).mosaic()

# Fetch HD 1200x960 thumbnails
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

print("Thumbnail 1 URL (Clean Loss Map):", url1)
print("Thumbnail 2 URL (Clean Rubber Map):", url2)

os.makedirs("reports/assets_hd", exist_ok=True)
out1 = os.path.abspath("reports/assets_hd/thailand_rubber_loss.png")
out2 = os.path.abspath("reports/assets_hd/thailand_rubber_presence.png")

urllib.request.urlretrieve(url1, out1)
urllib.request.urlretrieve(url2, out2)

print(f"[OK] Saved Crystal-Clear Thailand Rubber maps: {out1} ({os.path.getsize(out1):,} bytes), {out2} ({os.path.getsize(out2):,} bytes)")
