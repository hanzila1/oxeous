import ee

ee.Initialize(project="ee-hanzilabinyounasai")

# Candidate parcels in Riau oil palm estates (Pelalawan / Siak)
candidates = [
    {
        "name": "Pelalawan Estate Block A (0.385N, 101.825E)",
        "coords": [101.820, 0.380, 101.830, 0.390] # ~120 ha
    },
    {
        "name": "Siak Estate Block B (0.720N, 101.620E)",
        "coords": [101.615, 0.715, 101.625, 0.725]
    },
    {
        "name": "Kampar North Estate Block C (0.450N, 101.450E)",
        "coords": [101.445, 0.445, 101.455, 0.455]
    },
    {
        "name": "Pelalawan South Estate Block D (0.280N, 101.900E)",
        "coords": [101.895, 0.275, 101.905, 0.285]
    }
]

hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
treecover2000 = hansen.select("treecover2000")
lossyear = hansen.select("lossyear")

palm_col = ee.ImageCollection("projects/forestdatapartnership/assets/palm/model_2026a").filterDate("2020-01-01", "2020-12-31")
palm_mosaic = palm_col.select("probability").mosaic()

for c in candidates:
    min_lon, min_lat, max_lon, max_lat = c["coords"]
    geom = ee.Geometry.Polygon([[
        [min_lon, min_lat],
        [max_lon, min_lat],
        [max_lon, max_lat],
        [min_lon, max_lat],
        [min_lon, min_lat]
    ]])
    area_ha = geom.area().divide(10000).getInfo()
    
    # Palm probability stats
    palm_stats = palm_mosaic.reduceRegion(
        reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
        geometry=geom,
        scale=10,
        maxPixels=1e9
    ).getInfo()

    # Hansen post-2020 loss (>20)
    post2020_loss_mask = lossyear.gte(21).And(lossyear.lte(24))
    post2020_area_ha = post2020_loss_mask.multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=geom,
        scale=30,
        maxPixels=1e9
    ).getInfo().get("lossyear", 0) / 10000.0

    # Total loss any year
    any_loss_area_ha = lossyear.gt(0).multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=geom,
        scale=30,
        maxPixels=1e9
    ).getInfo().get("lossyear", 0) / 10000.0

    print(f"--- {c['name']} ---")
    print(f"Area: {area_ha:.2f} ha")
    print(f"Palm Stats: {palm_stats}")
    print(f"Post-2020 Deforestation: {post2020_area_ha:.2f} ha")
    print(f"Total Loss Any Year: {any_loss_area_ha:.2f} ha")
    print()
