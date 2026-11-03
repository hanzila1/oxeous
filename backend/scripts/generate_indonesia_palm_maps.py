import os
import urllib.request
import ee

ee.Initialize(project="ee-hanzilabinyounasai")

# Cadastral AOI coordinates: [102.190, 0.260] to [102.200, 0.270] (~123.64 ha in Pelalawan Peatland Frontier, Riau, Sumatra)
aoi_geom = ee.Geometry.Polygon([[
    [102.190, 0.260],
    [102.200, 0.260],
    [102.200, 0.270],
    [102.190, 0.270],
    [102.190, 0.260]
]])

# Context bounding box (matching 1200x960 1.25 aspect ratio around the parcel)
context_geom = ee.Geometry.Polygon([[
    [102.175, 0.248],
    [102.215, 0.248],
    [102.215, 0.280],
    [102.175, 0.280],
    [102.175, 0.248]
]])

# 1. Base Sentinel-2 RGB Mosaic (Cloud-masked across multi-temporal stack for 0% cloud occlusion)
def mask_s2(img):
    scl = img.select("SCL")
    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    return img.updateMask(mask)

s2_col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(context_geom)
          .filterDate("2022-01-01", "2024-12-31")
          .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 35))
          .map(mask_s2))

s2_clean = s2_col.median()
# Bright, vibrant visual enhancement for tropical peatland landscape
s2_vis = s2_clean.visualize(bands=["B4", "B3", "B2"], min=200, max=2200)
s2_dim = s2_clean.visualize(bands=["B4", "B3", "B2"], min=300, max=3000)

# 2. Hansen GFC Post-2020 Deforestation (Strictly Clipped to AOI)
hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
loss = hansen.select("lossyear")
post2020_loss = loss.gte(21).clip(aoi_geom).selfMask()
loss_vis = post2020_loss.visualize(palette=["#ef4444"])

# 3. Google Forest Data Partnership 10m Palm Model (model_2026a)
# High-contrast vibrant emerald green gradient
palm_col = ee.ImageCollection("projects/forestdatapartnership/assets/palm/model_2026a").filterDate("2020-01-01", "2020-12-31").mosaic()
palm_prob = palm_col.select("probability")
palm_masked = palm_prob.updateMask(palm_prob.gt(0.35)).clip(aoi_geom)
palm_vis = palm_masked.visualize(
    min=0.35, max=1.0,
    palette=["#fef08a", "#86efac", "#22c55e", "#15803d"]
)

# 4. AOI Yellow Perimeter Outline
aoi_outline = (ee.Image().byte()
               .paint(ee.FeatureCollection([ee.Feature(aoi_geom)]), color=1, width=3)
               .visualize(palette=["#facc15"]))

# Composite 1: Sentinel-2 + Post-2020 Deforestation + Yellow Boundary
map1 = ee.ImageCollection([s2_vis, loss_vis, aoi_outline]).mosaic()

# Composite 2: Sentinel-2 Base + Google FDP Palm Density + Yellow Boundary
map2 = ee.ImageCollection([s2_dim, palm_vis, aoi_outline]).mosaic()

out_dir = os.path.abspath('reports/assets_hd')
os.makedirs(out_dir, exist_ok=True)

out1 = os.path.join(out_dir, 'indonesia_palm_loss.png')
out2 = os.path.join(out_dir, 'indonesia_palm_presence.png')

print("Fetching Map 1: Sentinel-2 + Hansen GFC Post-2020 Deforestation (1200x960)...")
url1 = map1.getThumbURL({
    'region': context_geom,
    'dimensions': '1200x960',
    'format': 'png'
})
urllib.request.urlretrieve(url1, out1)
print(f"[OK] Downloaded: {out1} ({os.path.getsize(out1):,} bytes)")

print("Fetching Map 2: Google FDP 10m Palm Canopy Density (1200x960)...")
url2 = map2.getThumbURL({
    'region': context_geom,
    'dimensions': '1200x960',
    'format': 'png'
})
urllib.request.urlretrieve(url2, out2)
print(f"[OK] Downloaded: {out2} ({os.path.getsize(out2):,} bytes)")
