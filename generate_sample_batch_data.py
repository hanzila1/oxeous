import json
import zipfile
import os

# 1. Ghana Cocoa Smallholder GPS Points (EUDR Art. 9(1)(d) <4ha)
ghana_points = {
    "type": "FeatureCollection",
    "name": "Ghana Juaboso Cocoa Smallholders Batch",
    "features": [
        {
            "type": "Feature",
            "id": "GH-COCOA-01",
            "properties": {
                "id": "GH-COCOA-01",
                "name": "Kofi Mensah Smallholder Plot",
                "farmer": "Kofi Mensah",
                "commodity": "cocoa",
                "country_code": "GH",
                "country_name": "Ghana",
                "area_ha": 1.8,
                "notes": "Smallholder shaded cocoa parcel, Juaboso"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-2.7812, 6.2145]
            }
        },
        {
            "type": "Feature",
            "id": "GH-COCOA-02",
            "properties": {
                "id": "GH-COCOA-02",
                "name": "Abena Osei Organic Farm",
                "farmer": "Abena Osei",
                "commodity": "cocoa",
                "country_code": "GH",
                "country_name": "Ghana",
                "area_ha": 2.2,
                "notes": "Certified organic cocoa smallholder, Sefwi-Wiawso"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-2.7745, 6.2230]
            }
        },
        {
            "type": "Feature",
            "id": "GH-COCOA-03",
            "properties": {
                "id": "GH-COCOA-03",
                "name": "Kwame Boateng Sourcing Plot",
                "farmer": "Kwame Boateng",
                "commodity": "cocoa",
                "country_code": "GH",
                "country_name": "Ghana",
                "area_ha": 1.5,
                "notes": "Family-run agroforestry cocoa plot"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-2.7890, 6.2088]
            }
        },
        {
            "type": "Feature",
            "id": "GH-COCOA-04",
            "properties": {
                "id": "GH-COCOA-04",
                "name": "Akua Sarpong Shade Cocoa",
                "farmer": "Akua Sarpong",
                "commodity": "cocoa",
                "country_code": "GH",
                "country_name": "Ghana",
                "area_ha": 2.8,
                "notes": "Canopy shade native trees cocoa parcel"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-2.7680, 6.2310]
            }
        },
        {
            "type": "Feature",
            "id": "GH-COCOA-05",
            "properties": {
                "id": "GH-COCOA-05",
                "name": "Yaw Asante Cooperative Member",
                "farmer": "Yaw Asante",
                "commodity": "cocoa",
                "country_code": "GH",
                "country_name": "Ghana",
                "area_ha": 1.9,
                "notes": "Kuapa Kokoo cooperative supplier"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-2.7950, 6.2190]
            }
        },
        {
            "type": "Feature",
            "id": "GH-COCOA-06",
            "properties": {
                "id": "GH-COCOA-06",
                "name": "Efua Appiah Forest Margin Parcel",
                "farmer": "Efua Appiah",
                "commodity": "cocoa",
                "country_code": "GH",
                "country_name": "Ghana",
                "area_ha": 2.4,
                "notes": "Monitored smallholder border parcel"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-2.7620, 6.2050]
            }
        }
    ]
}

# 2. CSV Cooperative Farm Registry (Lat/Lng tabular spreadsheet)
csv_content = """Plot_ID,Farmer_Name,Latitude,Longitude,Commodity,Declared_Area_Ha,Country_Code,Region
CI-SML-101,Amadou Coulibaly,5.8012,-6.6245,cocoa,1.8,CI,Bas-Sassandra (Soubre)
CI-SML-102,Fatou Traore,5.7845,-6.6090,cocoa,2.1,CI,Bas-Sassandra (Soubre)
CI-SML-103,Ibrahim Kone,5.8150,-6.6380,rubber,3.4,CI,Nawa Region
GH-SML-201,Emmanuel Antwi,6.2145,-2.7812,cocoa,1.7,GH,Western North (Juaboso)
GH-SML-202,Grace Mensah,6.2280,-2.7690,cocoa,2.0,GH,Western North (Sefwi)
ID-SML-301,Budi Santoso,0.3120,102.1450,palm_oil,2.5,ID,Riau Province (Siak)
ID-SML-302,Siti Rahayu,0.2980,102.1620,rubber,2.0,ID,Riau Province (Pelalawan)
CO-SML-401,Carlos Rodriguez,5.0680,-75.5170,coffee,1.6,CO,Caldas (Chinchina)
"""

# 3. Mixed Batch (2 Polygons + 3 Points in Riau, Indonesia)
indonesia_mixed = {
    "type": "FeatureCollection",
    "name": "Riau Province Agroforestry Batch",
    "features": [
        {
            "type": "Feature",
            "id": "ID-ESTATE-POLY-01",
            "properties": {
                "id": "ID-ESTATE-POLY-01",
                "name": "Siak Agro Plantation Block A (Polygon)",
                "commodity": "palm_oil",
                "country_code": "ID",
                "country_name": "Indonesia",
                "area_ha": 8.4
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [102.140, 0.310],
                    [102.148, 0.310],
                    [102.148, 0.302],
                    [102.140, 0.302],
                    [102.140, 0.310]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "ID-ESTATE-POLY-02",
            "properties": {
                "id": "ID-ESTATE-POLY-02",
                "name": "Pelalawan Rubber Estate (Polygon)",
                "commodity": "rubber",
                "country_code": "ID",
                "country_name": "Indonesia",
                "area_ha": 6.2
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [102.155, 0.295],
                    [102.162, 0.295],
                    [102.162, 0.288],
                    [102.155, 0.288],
                    [102.155, 0.295]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "ID-SML-PT-03",
            "properties": {
                "id": "ID-SML-PT-03",
                "name": "Agus Wijaya Smallholder Palm Point",
                "commodity": "palm_oil",
                "country_code": "ID",
                "country_name": "Indonesia",
                "area_ha": 2.1
            },
            "geometry": {
                "type": "Point",
                "coordinates": [102.1350, 0.3180]
            }
        },
        {
            "type": "Feature",
            "id": "ID-SML-PT-04",
            "properties": {
                "id": "ID-SML-PT-04",
                "name": "Dewi Lestari Rubber Farm Point",
                "commodity": "rubber",
                "country_code": "ID",
                "country_name": "Indonesia",
                "area_ha": 1.7
            },
            "geometry": {
                "type": "Point",
                "coordinates": [102.1700, 0.3040]
            }
        },
        {
            "type": "Feature",
            "id": "ID-SML-PT-05",
            "properties": {
                "id": "ID-SML-PT-05",
                "name": "Hendra Pratama Mixed Agroforestry Point",
                "commodity": "palm_oil",
                "country_code": "ID",
                "country_name": "Indonesia",
                "area_ha": 2.4
            },
            "geometry": {
                "type": "Point",
                "coordinates": [102.1520, 0.3250]
            }
        }
    ]
}

# 4. Google Earth KML
kml_content = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Oxeous Sample Smallholder Cooperatives</name>
    <description>EUDR Due Diligence Batch Sample</description>
    <Placemark>
      <name>Finca El Mirador Coffee (Polygon)</name>
      <description>commodity: coffee, area: 4.8 ha, country: CO</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -75.522,5.072,0
              -75.516,5.072,0
              -75.516,5.066,0
              -75.522,5.066,0
              -75.522,5.072,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    <Placemark>
      <name>Mateo Vargas Smallholder Coffee Pin</name>
      <description>commodity: coffee, area: 1.8 ha, country: CO</description>
      <Point>
        <coordinates>-75.5120,5.0780,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Lucia Gomez Organic Micro-Lot</name>
      <description>commodity: coffee, area: 2.2 ha, country: CO</description>
      <Point>
        <coordinates>-75.5280,5.0610,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>
"""

# Destination folders
folders = [
    os.path.join("sample_test_plots", "batch"),
    os.path.join("frontend", "public", "samples")
]

for folder in folders:
    os.makedirs(folder, exist_ok=True)
    
    # Write GeoJSON
    with open(os.path.join(folder, "smallholders_ghana_cocoa_points.geojson"), "w", encoding="utf-8") as f:
        json.dump(ghana_points, f, indent=2)
        
    with open(os.path.join(folder, "mixed_portfolio_indonesia.geojson"), "w", encoding="utf-8") as f:
        json.dump(indonesia_mixed, f, indent=2)
        
    # Write CSV
    with open(os.path.join(folder, "cooperative_farm_registry.csv"), "w", encoding="utf-8") as f:
        f.write(csv_content)
        
    # Write KML
    with open(os.path.join(folder, "google_earth_smallholder_farms.kml"), "w", encoding="utf-8") as f:
        f.write(kml_content)
        
    # Create ZIP archive containing all of them
    zip_path = os.path.join(folder, "multi_plot_batch_sample.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        zipf.writestr("smallholders_ghana_cocoa_points.geojson", json.dumps(ghana_points, indent=2))
        zipf.writestr("mixed_portfolio_indonesia.geojson", json.dumps(indonesia_mixed, indent=2))
        zipf.writestr("cooperative_farm_registry.csv", csv_content)
        zipf.writestr("google_earth_smallholder_farms.kml", kml_content)

print("Generated sample batch files successfully in both sample_test_plots/batch/ and frontend/public/samples/")

