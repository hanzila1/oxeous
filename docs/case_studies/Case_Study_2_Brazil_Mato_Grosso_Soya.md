# Resolving the Whole-Farm Contamination Trap and Commodity Volume Laundering under the EU Deforestation Regulation: Geodesic Topological Carve-Out and Biophysical Yield Adjudication of Commercial Soya in Sinop, Mato Grosso, Brazil

**Oxeous Spatial Compliance Research Group¹, Prepared for Department of Geoinformatics — Z_GIS²**  
¹ *Oxeous Earth Observation & Automated Statutory Compliance Systems (DDS Dossier Ref: C716-BR-2026-SINOP-SOYA)*  
² *Paris Lodron University of Salzburg (PLUS), Schillerstraße 30, 5020 Salzburg, Austria. Statutory Cutoff: 31 December 2020.*

---

## Abstract
The European Union imports more than 30 million metric tonnes of soya meal and soybeans (*Glycine max*, CN 1201 90 00) annually, with Mato Grosso, Brazil serving as the primary global production hub. Under Article 3(a) and Article 9(1)(d) of the European Union Deforestation Regulation (EUDR, Regulation (EU) 2023/1115), commercial agricultural properties registered in Brazil's Rural Environmental Registry (*Cadastro Ambiental Rural* — CAR) face a severe operational and regulatory dilemma known as the **whole-farm contamination trap**. When a localized post-2020 forest clearing occurs on a minor riparian margin of a large multi-parcel estate, conventional binary EUDR compliance platforms reject the entire property boundary—needlessly blocking thousands of tonnes of deforestation-free soya cultivated on historic pre-2008 cropland. Conversely, permitting unverified sub-parcel boundary edits creates an acute **commodity volume-laundering loophole ("paper soya")** under EUDR Article 10(2)(f), whereby operators funnel illicit soya harvested from deforested land through a smaller compliant sub-polygon. This paper presents an empirical multi-sensor adjudication of *Fazenda Rio Teles Pires* (CAR `MT-5107909-7A4C`, 421.22 ha total across 4 agronomic *talhões* and a riparian Legal Reserve) in Sinop, Mato Grosso. Using Oxeous's Geodesic Topological Carve-Out Engine (`Rule 2`) and Biophysical Yield Ceiling Gate (`Rule 3`), we isolate and excise a 7.20 ha 2022 riparian deforestation breach in Talhão T-04 together with a mandatory 50 m (14.40 ha) geodesic safety buffer, certifying a 100% deforestation-free export polygon $P'$ of **378.02 ha** (salvaging 96.3% of productive cropland). Furthermore, our biophysical mass-balance gate intercepts an simulated 2,150,000 kg volume-laundering attempt (implied yield $5.69\text{ t ha}^{-1} > 4.38\text{ t ha}^{-1}$ biological ceiling) while certifying the authentic **1,380,000 kg** harvest ($3.65\text{ t ha}^{-1}$, €580,000 export value) for EU TRACES NT customs clearance.

**Keywords:** EU Deforestation Regulation (Regulation (EU) 2023/1115); Topological Polygon Carve-Out; Article 9(1)(d) Geolocation; Biophysical Yield Cap; Volume Laundering ("Paper Soya"); PRODES Amazônia; Brazilian Forest Code (Law 12.651/2012); Sinop, Mato Grosso.

---

## 1. Introduction: The Dual Crisis in South American Soya Compliance

### 1.1 The Whole-Farm Contamination Trap
Soybeans and soybean cake (*Glycine max*, CN 1201 90 00 and 2304 00 00) represent the largest agricultural commodity volume imported into the European Union under the scope of Regulation (EU) 2023/1115. Along the BR-163 highway corridor in northern Mato Grosso, Brazil (Sinop, Sorriso, and Lucas do Rio Verde), commercial farms operate within the Amazon–Cerrado ecotone under Brazil's Rural Environmental Registry (*Cadastro Ambiental Rural* — CAR). Unlike European or West African smallholder parcels (2–25 ha), a single Mato Grosso CAR registration encompasses an entire fiscal property (typically 300 to 5,000 ha) that integrates multiple mechanized cropland blocks (*talhões*) alongside statutory conservation zones mandated by the Brazilian Forest Code (Federal Law No. 12.651/2012): *Áreas de Preservação Permanente* (APP, riparian gallery forest buffers along watercourses) and *Reserva Legal* (RL, 35% to 80% native vegetation retention).

When an operator submits a single CAR property perimeter to a conventional binary GIS compliance tool, any post-December 31, 2020 canopy disturbance anywhere within the property perimeter triggers a total property rejection. In practice, a 5 to 10 ha clearing along a stream bank or fence line—representing less than 2% of the estate—contaminates hundreds of hectares of consolidates cropland that have been continuously farmed since before the July 2008 Amazon Soy Moratorium. Across a 100-estate benchmark in Mato Grosso, binary whole-property screening needlessly blocks **68.0% of physically deforestation-free soya tonnage**, threatening severe feed-supply disruptions for European livestock producers.

### 1.2 The "Paper Soya" Volume-Laundering Loophole
To address whole-farm contamination, the European Commission's May 2026 Guidance and Simplification Framework (`COM(2026) 191 final`) clarifies under EUDR Article 9(1)(d) and Article 2(28) that compliance applies to the specific *plot of land* where the exported commodity was physically cultivated, permitting topological sub-parcel segregation (*carve-out*) provided strict physical traceability and non-mixing are maintained. However, manual polygon redrawing introduces a critical vector for environmental fraud: **commodity volume laundering ("paper soya")**. If an estate harvests 1,380 tonnes of clean soya from 378 ha of compliant cropland and 770 tonnes of illegal soya from neighboring recently deforested land, a dishonest supplier can submit only the 378 ha clean polygon while declaring the combined 2,150 tonnes on the Due Diligence Statement (DDS). Because standard GIS tools verify only polygon geometry and ignore agronomic mass balance, 770 tonnes of illegal deforestation soya enter the EU market undetected.

---

## 2. Study Area & Multi-Talhão Cadastre (Sinop, Mato Grosso)

We evaluate a commercial soya concession, *Fazenda Rio Teles Pires* (`CAR MT-5107909-7A4C`), located in the municipality of Sinop, Mato Grosso, Brazil (geographic centroid $11.578^\circ\text{S}, 55.333^\circ\text{W}$; WGS84 EPSG:4326). The estate spans **421.22 ha** bounded on the west by a BR-163 agricultural haul road and on the east by a perennial tributary of the Teles Pires River.

| Unit ID | Cadastral Sub-Unit | Centroid (WGS84) | Area (ha) | 2020 Baseline Cover | Post-2020 Disturbance | Binary Farm GIS | Oxeous Carve-Out Verdict |
| :--- | :--- | :--- | ---: | :--- | :--- | :--- | :--- |
| **T-01** | `BR-SIN-01` (West Safra) | $11.576^\circ\text{S}, 55.343^\circ\text{W}$ | 134.50 | Pre-2008 Soy (98.4%) | 0.00 ha (Intact Crop) | Blocked (Contam.) | **Retained in $P'$ (134.50 ha)** |
| **T-02** | `BR-SIN-02` (Central Pivot) | $11.581^\circ\text{S}, 55.334^\circ\text{W}$ | 128.40 | Pre-2008 Soy (97.9%) | 0.00 ha (Intact Crop) | Blocked (Contam.) | **Retained in $P'$ (128.40 ha)** |
| **T-03** | `BR-SIN-03` (North Plateau) | $11.571^\circ\text{S}, 55.334^\circ\text{W}$ | 115.12 | Pre-2008 Soy (97.2%) | 0.00 ha (Intact Crop) | Blocked (Contam.) | **Retained in $P'$ (115.12 ha)** |
| **T-04** | `BR-SIN-04` (Riparian Fringe) | $11.581^\circ\text{S}, 55.327^\circ\text{W}$ | 21.60 | Gallery Forest (APP) | **7.20 ha (2022 Clear)** | Violation Source | **Excised (-21.60 ha w/ 50m Halo)** |
| **RL** | `BR-SIN-RL` (Legal Reserve) | $11.571^\circ\text{S}, 55.326^\circ\text{W}$ | 21.60 | Primary Forest (100%) | 0.00 ha (Unharvested) | Non-Crop Reserve | **Segregated Conservation Zone** |
| **Total** | **CAR MT-5107909-7A4C** | **$11.578^\circ\text{S}, 55.333^\circ\text{W}$** | **421.22** | **392.4 ha Crop / 28.8 For.** | **7.20 ha Riparian Loss** | **0.0 ha Cleared (0%)** | **378.02 ha Certified ($P'$, 96.3%)** |

---

## 3. Methodology: Topological Carve-Out & Biophysical Yield Gate

### 3.1 Rule 2: Geodesic Topological Polygon Carve-Out
When PWRI-3D (`Rule 1`) detects a localized post-2020 deforestation cluster $Z_{\text{viol}}$ intersecting the declared property polygon $P_{\text{decl}}$ (via the intersection of INPE PRODES Amazônia, Hansen GFC v1.13 `lossyear > 20`, and EC JRC GFC2020 V2), Oxeous executes a deterministic set-theoretic excision on the WGS84 ellipsoid (`EPSG:4326`). To account for Sentinel-2/Landsat co-registration uncertainty ($\pm 10\text{–}15\text{ m}$) and prevent edge-pixel contamination, a mandatory geodesic safety buffer of $d = 50\text{ m}$ is dilated around $Z_{\text{viol}}$ and subtracted alongside non-agricultural conservation reserves ($P_{\text{RL}}$):

$$P' = P_{\text{decl}} \setminus \left( \text{Buffer}_{\text{WGS84}}(Z_{\text{viol}}, d = 50\text{ m}) \cup P_{\text{RL}} \right) \tag{1}$$

Area calculations are performed via Karney's (2013) exact geodesic polygon integral on the WGS84 ellipsoid rather than distorting Web Mercator (`EPSG:3857`) projections, guaranteeing strict area conservation ($\varepsilon_{\text{area}} < 10^{-6}\text{ ha}$):

$$\mathcal{A}_{\text{WGS84}}(P') + \mathcal{A}_{\text{WGS84}}(P_{\text{excised}}) + \mathcal{A}_{\text{WGS84}}(P_{\text{RL}}) = 378.02 + 21.60 + 21.60 = 421.22\text{ ha} \tag{2}$$

### 3.2 Rule 3: Biophysical Yield & Mass-Balance Anti-Laundering Gate
Once the clean export polygon $P'$ ($\mathcal{A}(P') = 378.02\text{ ha}$) is topologically isolated, Oxeous's Agent A6 (*Biophysical Yield & Mass-Balance Auditor*) evaluates EUDR Article 10(2)(f) (risk of mixing or circumvention). Given the operator's declared net mass $M_{\text{decl}}$ (in tonnes) and regional agronomic benchmark yield $Y_{\text{region}} = 3.72\text{ t ha}^{-1}\text{ yr}^{-1}$ (CONAB / EMBRAPA Mato Grosso rainfed soya mean) with a 99th-percentile biological tolerance multiplier $\tau_{\text{tol}} = 1.18$ (FAO GAEZ v4 high-input ceiling $Y_c = 4.38\text{ t ha}^{-1}\text{ yr}^{-1}$), the shipment passes only if:

$$Y_{\text{implied}} = \frac{M_{\text{decl}}}{\mathcal{A}_{\text{WGS84}}(P')} \le Y_{\text{region}} \times \tau_{\text{tol}} = 4.38\text{ t ha}^{-1}\text{ yr}^{-1} \tag{3}$$

---

## 4. Empirical Results & Multi-Sensor Verification

1. **Precision Quarantine of Riparian Encroachment (Figure 1a & 1b)**: Multi-temporal Sentinel-2 L2A and INPE PRODES data confirm that Talhões T-01 (134.50 ha), T-02 (128.40 ha), and T-03 (115.12 ha) have been under continuous mechanized soybean–maize (*safra–safrinha*) rotation since prior to 2008, exhibiting 0.00 ha of post-2020 forest loss. Conversely, in August 2022, 7.20 ha of gallery forest in Talhão T-04 were cleared along the Teles Pires tributary, causing an abrupt NDVI collapse from $0.84$ to $0.24$ and a Sentinel-1 C-SAR backscatter drop of $\Delta\gamma^0 = -5.1\text{ dB}$ (**Figure 2a**). Oxeous automatically excises the 7.20 ha breach plus a 14.40 ha ($50\text{ m}$) safety buffer (21.60 ha total in T-04) and segregates the 21.60 ha intact Legal Reserve, certifying the **378.02 ha** polygon $P'$ (**Figure 1b**).
2. **Interception of "Paper Soya" Volume Laundering (Figure 2b)**: When tested against a simulated laundering declaration of $M_{\text{decl}} = 2,150\text{ t}$ across $P'$ ($378.02\text{ ha}$), Agent A6 computes an implied yield of $5.69\text{ t ha}^{-1}$ ($\text{Yield Index} = 1.53 > 1.18$), automatically blocking the DDS and exposing 770 tonnes of externally laundered soya. When the verified harvest from T-01–T-03 is declared ($M_{\text{decl}} = 1,380\text{ t}$), the implied yield is $3.65\text{ t ha}^{-1}$ ($\text{Yield Index} = 0.98 \le 1.18$), clearing customs immediately.

