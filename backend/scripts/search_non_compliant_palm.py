import ee

ee.Initialize(project="ee-hanzilabinyounasai")

hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13")
lossyear = hansen.select("lossyear")
treecover = hansen.select("treecover2000")

palm_col = ee.ImageCollection("projects/forestdatapartnership/assets/palm/model_2026a").filterDate("2020-01-01", "2020-12-31")
palm_mosaic = palm_col.select("probability").mosaic()

# Let's search across known palm oil expansion frontiers in Riau / Central Kalimantan:
# Riau peatland edges: Indragiri Hilir (-0.2 to -0.6, 102.5 to 103.2), Kampar/Pelalawan (0.1 to 0.5, 101.9 to 102.5),
# Rokan Hilir (1.5 to 2.1, 100.4 to 101.2)
search_points = [
    # Indragiri Hilir peat frontier
    (102.85, -0.35), (102.90, -0.38), (102.95, -0.40), (103.00, -0.42),
    (102.75, -0.25), (102.80, -0.28), (102.82, -0.30), (102.88, -0.32),
    # Pelalawan / Kampar Peninsula buffer
    (102.20, 0.35), (102.25, 0.38), (102.30, 0.40), (102.35, 0.42),
    (102.15, 0.25), (102.18, 0.28), (102.22, 0.30), (102.26, 0.32),
    # Rokan Hilir expansion
    (100.85, 1.85), (100.90, 1.90), (100.95, 1.95), (101.00, 2.00),
    (100.75, 1.75), (100.80, 1.80), (100.82, 1.82), (100.88, 1.84)
]

print("Scanning for high-impact palm expansion & deforestation frontiers...")
candidates = []

for lon, lat in search_points:
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

    if 10.0 <= post2020_loss_ha <= 60.0:  # significant post-2020 clear-cut
        palm_stats = palm_mosaic.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
            geometry=geom,
            scale=10,
            maxPixels=1e9
        ).getInfo()
        mean_palm = palm_stats.get("probability_mean", 0)
        max_palm = palm_stats.get("probability_max", 0)
        
        # We want presence of palm (e.g. max > 70% or mean > 25%)
        if max_palm > 0.65:
            area_ha = geom.area().divide(10000).getInfo()
            candidates.append({
                "lon": lon, "lat": lat,
                "area_ha": area_ha,
                "post2020_loss_ha": post2020_loss_ha,
                "mean_palm": mean_palm,
                "max_palm": max_palm
            })
            print(f"[CANDIDATE] ({lat:.3f}N, {lon:.3f}E): Area={area_ha:.2f}ha, Post-2020 Deforestation={post2020_loss_ha:.2f}ha ({(post2020_loss_ha/area_ha)*100:.1f}%), Palm Peak={max_palm*100:.1f}%, Mean={mean_palm*100:.1f}%")

print(f"Total strong non-compliant candidates: {len(candidates)}")
