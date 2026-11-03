import os
import urllib.request
import ee

ee.Initialize(project="ee-hanzilabinyounasai")

# Let's inspect (0.26N, 102.19E) and (0.27N, 102.18E)
test_cells = [
    {
        "id": "cell_A_026_10219",
        "name": "Pelalawan Peat Frontier A (26.62 ha loss, 37.2% palm)",
        "coords": [102.190, 0.260, 102.200, 0.270],
        "context": [102.175, 0.248, 102.215, 0.280]
    },
    {
        "id": "cell_B_027_10218",
        "name": "Pelalawan Peat Frontier B (18.93 ha loss, 44.1% palm)",
        "coords": [102.180, 0.270, 102.190, 0.280],
        "context": [102.165, 0.258, 102.205, 0.290]
    }
]

hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
loss = hansen.select("lossyear")
palm_col = ee.ImageCollection("projects/forestdatapartnership/assets/palm/model_2026a").filterDate("2020-01-01", "2020-12-31").mosaic()
palm_prob = palm_col.select("probability")

def mask_s2(img):
    scl = img.select("SCL")
    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    return img.updateMask(mask)

for c in test_cells:
    aoi = ee.Geometry.Polygon([[
        [c["coords"][0], c["coords"][1]],
        [c["coords"][2], c["coords"][1]],
        [c["coords"][2], c["coords"][3]],
        [c["coords"][0], c["coords"][3]],
        [c["coords"][0], c["coords"][1]]
    ]])
    ctx = ee.Geometry.Polygon([[
        [c["context"][0], c["context"][1]],
        [c["context"][2], c["context"][1]],
        [c["context"][2], c["context"][3]],
        [c["context"][0], c["context"][3]],
        [c["context"][0], c["context"][1]]
    ]])

    s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(ctx)
          .filterDate("2022-01-01", "2024-12-31")
          .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
          .map(mask_s2)
          .median())
    
    s2_vis = s2.visualize(bands=["B4", "B3", "B2"], min=200, max=2200)
    loss_vis = loss.gte(21).clip(aoi).selfMask().visualize(palette=["#ef4444"])
    palm_vis = palm_prob.updateMask(palm_prob.gt(0.35)).clip(aoi).visualize(
        min=0.35, max=1.0,
        palette=["#fef08a", "#86efac", "#22c55e", "#15803d"]
    )
    aoi_line = (ee.Image().byte()
                .paint(ee.FeatureCollection([ee.Feature(aoi)]), color=1, width=3)
                .visualize(palette=["#facc15"]))

    comp1 = ee.ImageCollection([s2_vis, loss_vis, aoi_line]).mosaic()
    comp2 = ee.ImageCollection([s2.visualize(bands=["B4", "B3", "B2"], min=300, max=3000), palm_vis, aoi_line]).mosaic()

    out1 = os.path.abspath(f"reports/assets_hd/test_{c['id']}_loss.png")
    out2 = os.path.abspath(f"reports/assets_hd/test_{c['id']}_palm.png")

    u1 = comp1.getThumbURL({'region': ctx, 'dimensions': '600x480', 'format': 'png'})
    u2 = comp2.getThumbURL({'region': ctx, 'dimensions': '600x480', 'format': 'png'})

    urllib.request.urlretrieve(u1, out1)
    urllib.request.urlretrieve(u2, out2)
    print(f"Downloaded test previews for {c['id']}")
