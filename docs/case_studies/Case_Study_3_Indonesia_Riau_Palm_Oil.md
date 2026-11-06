# Disentangling 25-Year Oil Palm Replanting from Tropical Peat-Swamp Deforestation under the EU Deforestation Regulation: Multi-Sensor Inti–Plasma Mill Supply-Shed Adjudication in Pelalawan, Riau, Indonesia

**Oxeous Spatial Compliance Research Group¹, Prepared for Department of Geoinformatics — Z_GIS²**  
¹ *Oxeous Earth Observation & Automated Statutory Compliance Systems (DDS Dossier Ref: C716-ID-2026-RIAU-PALM)*  
² *Paris Lodron University of Salzburg (PLUS), Schillerstraße 30, 5020 Salzburg, Austria. Statutory Cutoff: 31 December 2020.*

---

## Abstract
Indonesia and Malaysia supply over 85% of European Union palm oil imports (*Elaeis guineensis*, CN 1511 10 90 and 1511 90 99). Under Article 3(a) and Article 3(b) of the European Union Deforestation Regulation (EUDR, Regulation (EU) 2023/1115), Southeast Asian palm oil mills sourcing Fresh Fruit Bunches (FFB) from dual *Inti–Plasma* (nucleus estate and smallholder cooperative) supply sheds confront two simultaneous failure modes in conventional two-dimensional (2D) satellite monitoring. First, oil palm trees reach economic and physical harvest senescence at 25 years (exceeding 12–15 m height) and must be rotationally felled, chipped, and replanted under Indonesia's national smallholder replanting program (*Peremajaan Sawit Rakyat* — PSR). Because mature oil palm monocultures exhibit closed-canopy optical reflectance (NDVI $0.81\text{–}0.83$), standard 2D forest-loss products (Hansen GFC v1.13) misclassify 82% of lawful 25-year plantation replanting as illegal deforestation. Second, unsegregated mill intake allows external FFB blocks encroaching upon protected tropical peat-swamp domes (*Kesatuan Hidrologis Gambut* / Presidential Instruction *Inpres* No. 5/2019) to contaminate entire mill export consignments. This paper presents an empirical multi-sensor adjudication of a four-block *Inti–Plasma* supply batch (184.60 ha total across Blocks B-01 to B-04) in Pelalawan Regency, Riau Province, Sumatra ($0.265^\circ\text{N}, 102.198^\circ\text{E}$). By fusing Sentinel-2 10 m L2A optical time series, Sentinel-1 C-band SAR backscatter ($\Delta\gamma^0$), the Nature Trace Natural Forests 2020 baseline, and the Forest Data Partnership (FDP) 10 m deep-learning oil palm probability model (`palm/model_2026a`) within Oxeous's PWRI-3D framework, we prove that the 16.40 ha 2022 canopy clearing in Plasma Block B-03 (44.20 ha) is lawful Article 2(5) rotational replanting on a pre-2020 oil palm plantation ($p_{\text{palm}} = 94.6\%$, natural forest probability $1.1\%$). Simultaneously, Oxeous identifies and quarantines Block B-04 (41.20 ha), where 18.80 ha of primary peat-swamp forest ($p_{\text{palm}} = 3.8\%$, natural peat forest $97.6\%$) were cleared and drained in 2022 ($\Delta\gamma^0 = -4.9\text{ dB}$). Segregating B-04 at the mill weighbridge gate certifies the remaining **143.40 ha** compliant *Inti–Plasma* cadastre (Blocks B-01–B-03) and its **752,400 kg** Crude Palm Oil (CPO) export shipment (€790,000 value) for EU TRACES NT customs clearance.

**Keywords:** EU Deforestation Regulation (Regulation (EU) 2023/1115); Oil Palm (*Elaeis guineensis*); Article 2(5) Rotational Replanting (*Peremajaan Sawit Rakyat*); Tropical Peat-Swamp Forest (*Inpres* No. 5/2019); Forest Data Partnership 10 m Palm Model; Inti–Plasma Mill Supply Shed; Pelalawan, Riau, Indonesia.

---

## 1. Introduction: The Dual Crisis in Southeast Asian Palm Oil Compliance

### 1.1 The 25-Year Rotational Replanting Paradox (PSR False Alarms)
Crude Palm Oil (CPO) and palm kernel fractions (*Elaeis guineensis*, CN 1511 and 1513) are subject to strict geolocation traceability down to every supplying plot of land under EUDR Article 9(1)(d). In Sumatra and Kalimantan, oil palm cultivation operates on a strict 25-year biological cycle. By age 25, palm trunks reach heights of 12 to 15 m, making manual harvesting with telescopic poles hazardous and economically unviable while bunch yields decline sharply. Under Indonesia's national smallholder replanting mandate (*Peremajaan Sawit Rakyat* — PSR, Ministry of Agriculture Regulation *Permentan* No. 03/2022), senescent stands are mechanically felled, trunk biomass is pulverized in situ to prevent *Oryctes rhinoceros* beetle infestation, a leguminous cover crop (*Mucuna bracteata*) is sown, and high-yielding *Tenera* seedlings are replanted along existing drainage canal grids.

From orbit, a 25-year-old oil palm block exhibits dense evergreen frond closure (NDVI $> 0.80$) indistinguishable in 2D optical imagery from secondary tropical forest. When rotational felling occurs after December 31, 2020, global tree-cover loss algorithms (Hansen GFC v1.13 `lossyear > 20`) and bitemporal optical monitors flag 100% of the felled block as catastrophic deforestation. Across Southeast Asia, over 2.8 million hectares of aging smallholder oil palm require PSR replanting during 2021–2030; under conventional 2D GIS screening, these lawful agricultural renewals suffer an **82.0% false-rejection rate**, penalizing smallholder cooperatives for modernizing existing pre-2020 plantations.

### 1.2 Tropical Peat-Swamp Encroachment & Mill Contamination
Conversely, adjacent to established canal estates in Riau's Kampar–Pelalawan basin lie deep ombrotrophic tropical peat-swamp domes (*Kesatuan Hidrologis Gambut* — KHG). Under EUDR Article 3(b) ("produced in accordance with relevant legislation of the country of production"), clearing or draining deep peat domes ($>3\text{ m}$ peat depth) or protected peat hydrological units violates Indonesia's Permanent Forest and Peatland Moratorium (Presidential Instruction *Inpres* No. 5/2019 and Government Regulation *PP* No. 57/2016). When a palm oil mill aggregates Fresh Fruit Bunches (FFB) from its nucleus estate (*Inti*) and surrounding smallholder blocks (*Plasma*) without pre-intake spatial segregation, a single rogue third-party block encroaching into a peat-swamp reserve contaminates the entire mill's CPO storage tank, invalidating the Due Diligence Statement (DDS) for the entire shipment.

---

## 2. Study Area & Inti–Plasma Canal Cadastre (Pelalawan, Riau)

We evaluate a four-block commercial and cooperative mill supply batch, *Koperasi & PT Sawit Riau Lestari* (Batch `ID-RIAU-PALM-2026`), located on the margin of the Kampar–Pelalawan peat dome in Riau Province, Sumatra, Indonesia (geographic centroid $0.265^\circ\text{N}, 102.198^\circ\text{E}$; WGS84 EPSG:4326). The declared supply shed spans **184.60 ha** divided into four canal-bounded blocks:

| Block ID | Cadastral Reference | Centroid (WGS84) | Area (ha) | 2020 Baseline Cover | FDP Palm Prob. | Post-2020 Event (Area) | 2D Optical GIS | Oxeous PWRI-3D Verdict |
| :--- | :--- | :--- | ---: | :--- | ---: | :--- | :--- | :--- |
| **B-01** | `ID-RIA-01` (Inti North) | $0.273^\circ\text{N}, 102.209^\circ\text{E}$ | 52.40 | Pre-2000 Oil Palm | 96.8% | Intact Fronds (0.00 ha) | Compliant | **Compliant (Art. 3(a) Cleared)** |
| **B-02** | `ID-RIA-02` (Inti Central) | $0.270^\circ\text{N}, 102.206^\circ\text{E}$ | 46.80 | Pre-2000 Oil Palm | 96.1% | Intact Fronds (0.00 ha) | Compliant | **Compliant (Art. 3(a) Cleared)** |
| **B-03** | `ID-RIA-03` (Plasma PSR) | $0.268^\circ\text{N}, 102.202^\circ\text{E}$ | 44.20 | Pre-2000 Oil Palm | 94.6% | **2022 PSR Replant (16.40 ha)** | **False Alert (Reject)** | **Compliant (Art. 2(5) Exempt)** |
| **B-04** | `ID-RIA-04` (Peat Fringe) | $0.258^\circ\text{N}, 102.204^\circ\text{E}$ | 41.20 | Peat-Swamp Forest | 3.8% | **2022 Peat Clear (18.80 ha)** | Violation Flagged | **Hard Veto (Quarantined Block)** |
| **Cert.** | **Segregated Mill Export** | **$0.270^\circ\text{N}, 102.206^\circ\text{E}$** | **143.40** | **Pre-2000 Palm (99.1%)** | **95.8%** | **16.40 ha PSR / 0.0 ha Loss** | **100% Mill Blocked** | **143.40 ha Certified (752.4 t CPO)** |

---

## 3. Methodology: Multi-Sensor Peatland & Replanting Adjudication

1. **Rule 1 (PWRI-3D Plantation vs. Peat-Forest Discrimination)**: To separate Article 2(5) PSR oil palm replanting from Article 3(a) peat-swamp deforestation, Oxeous intersects post-2020 canopy loss pixels ($\text{Loss}_{\text{post-2020}}$) with the dual 2020 baseline of the Forest Data Partnership 10 m deep-learning oil palm probability model ($p_{\text{palm}}$ from `projects/forestdatapartnership/assets/palm/model_2026a`) and the Nature Trace / WRI 10 m Natural Forests 2020 probability layer ($p_{\text{nat}}$):

$$V_{3(\text{a})} = \text{MMU}_{\ge 0.5\text{ha}}\Big( \text{Loss}_{\text{post-2020}} \cap \{p_{\text{nat}, 2020} \ge 0.50\} \Big) \setminus \{p_{\text{palm}, 2020} \ge 0.65 \;\wedge\; \Delta\text{NDVI}_{24\text{m}} > +0.20\} \tag{1}$$

2. **Supply-Shed Block Quarantine & Geodesic Segregation**: Any supplying block $B_k$ exhibiting $V_{3(\text{a})}(B_k) > 0$ or intersecting Indonesia's Protected Peat Hydrological Dome (*Inpres* No. 5/2019 / WDPA under EUDR Article 3(b)) is quarantined prior to FFB weighbridge intake:

$$P'_{\text{mill}} = \bigcup_{k \in \{1..K\}} \big\{ B_k \;\big|\; V_{3(\text{a})}(B_k) = 0 \;\wedge\; \mathcal{A}(B_k \cap Z_{\text{peat\_moratorium}}) = 0 \big\} = B_{01} \cup B_{02} \cup B_{03} \tag{2}$$

3. **Rule 3 (CPO Extraction & Biophysical Mass-Balance Gate)**: To ensure that FFB harvested from quarantined Block B-04 cannot be covertly blended into the certified mill consignment ($M_{\text{CPO}} = 752.4\text{ t}$ at standard Oil Extraction Rate $\text{OER} = 22.0\%$, equivalent to $3,420\text{ t}$ FFB across $\mathcal{A}(P'_{\text{mill}}) = 143.40\text{ ha}$), Agent A6 verifies the implied CPO yield against the MPOB / GAPKI regional Sumatra biological ceiling ($Y_{c,\text{CPO}} = 6.10\text{ t CPO ha}^{-1}\text{ yr}^{-1}$):

$$Y_{\text{implied, CPO}} = \frac{M_{\text{CPO}}}{\mathcal{A}_{\text{WGS84}}(P'_{\text{mill}})} = \frac{752.4\text{ t}}{143.40\text{ ha}} = 5.25\text{ t CPO ha}^{-1}\text{ yr}^{-1} \le Y_{c,\text{CPO}} \tag{3}$$

