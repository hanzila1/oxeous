import ee

ee.Initialize(project="ee-hanzilabinyounasai")

hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
lossyear = hansen.select("lossyear")

palm_col = ee.ImageCollection("projects/forestdatapartnership/assets/palm/model_2026a").filterDate("2020-01-01", "2020-12-31")
palm_mosaic = palm_col.select("probability").mosaic()

# Let's test a fine grid around (0.27 to 0.30 N, 102.16 to 102.22 E) in Pelalawan/Kampar buffer
grid = []
for lat_i in [0.26, 0.27, 0.28, 0.29, 0.30]:
    for lon_i in [102.16, 102.17, 102.18, 102.19, 102.20]:
        grid.append((lon_i, lat_i))

for lon, lat in grid:
    geom = ee.Geometry.Polygon([[
        [lon, lat],
        [lon + 0.01, lat],
        [lon + 0.01, lat + 0.01],
        [lon, lat + 0.01],
        [lon, lat]
    ]])

    post2020_loss_mask = lossyear.gte(21).And(lossyear.lte(24))
    post2020_loss_ha = post2020_loss_mask.multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=geom,
        scale=30,
        maxPixels=1e9
    ).getInfo().get("lossyear", 0) / 10000.0

    stats = palm_mosaic.reduceRegion(
        reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
        geometry=geom,
        scale=10,
        maxPixels=1e9
    ).getInfo()

    mean_p = stats.get("probability_mean", 0)
    max_p = stats.get("probability_max", 0)
    area = geom.area().divide(10000).getInfo()

    if post2020_loss_ha > 5.0 and max_p > 0.70:
        print(f"Cell ({lat:.2f}N, {lon:.2f}E): Area={area:.2f}ha, Post-2020 Loss={post2020_loss_ha:.2f}ha ({(post2020_loss_ha/area)*100:.1f}%), Palm Mean={mean_p*100:.1f}%, Peak={max_p*100:.1f}%")
