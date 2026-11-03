import ee

ee.Initialize(project="ee-hanzilabinyounasai")

hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
lossyear = hansen.select("lossyear")

palm_col = ee.ImageCollection("projects/forestdatapartnership/assets/palm/model_2026a").filterDate("2020-01-01", "2020-12-31")
palm_mosaic = palm_col.select("probability").mosaic()

# Let's test established plantation centers in Riau / North Sumatra:
# Indragiri Hulu (0.4-0.6 S, 102.3-102.5 E), Pelalawan (0.1-0.3 N, 101.8-102.1 E), Asahan (2.8-3.0 N, 99.5-99.7 E)
centers = [
    # Pelalawan / Siak grids
    (101.88, 0.26), (101.89, 0.25), (101.91, 0.27), (101.92, 0.29), (101.95, 0.30),
    (101.85, 0.22), (101.86, 0.20), (101.88, 0.21), (101.90, 0.23), (101.92, 0.24),
    # Rokan Hulu / Kampar grids
    (100.80, 0.85), (100.82, 0.87), (100.85, 0.90), (100.88, 0.92), (100.90, 0.95),
    # North Sumatra mature estates (Asahan / Labuhanbatu)
    (99.65, 2.85), (99.70, 2.90), (99.75, 2.95), (99.80, 2.65), (99.85, 2.70),
    (100.05, 1.95), (100.10, 2.00), (100.15, 2.05), (100.20, 2.10)
]

print("Searching for zero-loss mature palm parcels...")
found = []

for lon, lat in centers:
    # 0.01 deg x 0.01 deg is ~110m x 110m * 10 = ~123 ha
    geom = ee.Geometry.Polygon([[
        [lon, lat],
        [lon + 0.01, lat],
        [lon + 0.01, lat + 0.01],
        [lon, lat + 0.01],
        [lon, lat]
    ]])

    post2020_loss_mask = lossyear.gte(21).And(lossyear.lte(24))
    post2020_area_ha = post2020_loss_mask.multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=geom,
        scale=30,
        maxPixels=1e9
    ).getInfo().get("lossyear", 0) / 10000.0

    if post2020_area_ha < 0.05:  # effectively 0
        stats = palm_mosaic.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=geom,
            scale=10,
            maxPixels=1e9
        ).getInfo()
        mean_prob = stats.get("probability_mean", 0)
        max_prob = stats.get("probability_max", 0)
        if mean_prob > 0.70:
            area_ha = geom.area().divide(10000).getInfo()
            found.append({
                "lon": lon, "lat": lat,
                "area_ha": area_ha,
                "post2020_ha": post2020_area_ha,
                "mean_palm": mean_prob,
                "max_palm": max_prob
            })
            print(f"[FOUND] ({lat:.3f}N, {lon:.3f}E): Area={area_ha:.2f}ha, Post-2020 Loss={post2020_area_ha:.2f}ha, Palm Mean={mean_prob*100:.1f}%, Peak={max_prob*100:.1f}%")

print(f"Total zero-loss high-palm candidates found: {len(found)}")
