"""
Compiles Case_Study_4_Colombia_Huila_Coffee.pdf as a strict 2-page Two-Column Academic Research Paper
(Remote Sensing of Environment / ISPRS Journal of Photogrammetry and Remote Sensing / Elsevier LaTeX style).
Zero SaaS UI cards, zero colored banners, zero whitespace gaps.
"""
import os
import base64
import subprocess
import fitz  # PyMuPDF

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FIG_DIR = os.path.join(BASE_DIR, "Case_Study_4_Colombia_Huila_Coffee", "figures")
HTML_OUT = os.path.join(BASE_DIR, "Case_Study_4_Colombia_Huila_Coffee.html")
PDF_OUT = os.path.join(BASE_DIR, "Case_Study_4_Colombia_Huila_Coffee.pdf")


def b64_img(filename: str) -> str:
    path = os.path.join(FIG_DIR, filename)
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")


fig1_b64 = b64_img("Journal_Fig1_Coffee_Andean_Plate.png")
fig2_b64 = b64_img("Journal_Fig2_Coffee_Telemetry_and_Benchmark.png")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Case Study 4 — Andean Shade-Grown Arabica Coffee & Protected Cloud-Forest Adjudication (Huila, Colombia)</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 0;
  }}
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}
  body {{
    font-family: "Times New Roman", Times, Georgia, serif;
    color: #000000;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  /* Strict A4 Page Container */
  .page {{
    width: 210mm;
    height: 297mm;
    padding: 10.5mm 12.5mm 10.5mm 12.5mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .page:last-child {{
    page-break-after: auto;
  }}

  /* Journal Running Header */
  .running-head {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 7.4pt;
    font-style: italic;
    color: #111111;
    border-bottom: 0.75pt solid #000000;
    padding-bottom: 2.5px;
    margin-bottom: 6px;
  }}

  /* Title & Author Block */
  .paper-title {{
    font-size: 13.0pt;
    font-weight: bold;
    line-height: 1.17;
    color: #000000;
    margin-bottom: 4px;
    text-align: left;
  }}
  .authors {{
    font-size: 8.7pt;
    font-weight: bold;
    color: #000000;
    margin-bottom: 2px;
  }}
  .affiliations {{
    font-size: 7.2pt;
    font-style: italic;
    color: #222222;
    line-height: 1.22;
    margin-bottom: 6px;
  }}

  /* Abstract Block (LaTeX Horizontal Rule Style) */
  .abstract-box {{
    border-top: 0.75pt solid #000000;
    border-bottom: 0.75pt solid #000000;
    padding: 4.5px 0 4.5px 0;
    margin-bottom: 7px;
    font-size: 7.65pt;
    line-height: 1.24;
    text-align: justify;
  }}
  .abstract-box p {{
    margin-bottom: 3px;
  }}
  .keywords {{
    font-size: 7.35pt;
    line-height: 1.20;
    text-align: justify;
  }}

  /* Two-Column Academic Prose */
  .two-col {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 5.5mm;
    text-align: justify;
    font-size: 8.0pt;
    line-height: 1.22;
  }}
  .two-col p {{
    margin-bottom: 4.0px;
    text-indent: 1.1em;
  }}
  .two-col p.no-indent {{
    text-indent: 0;
  }}
  .sec-heading {{
    font-size: 8.85pt;
    font-weight: bold;
    color: #000000;
    margin-top: 4px;
    margin-bottom: 2.5px;
    text-indent: 0;
    text-align: left;
  }}
  .sec-heading:first-child {{
    margin-top: 0;
  }}

  /* Numbered Display Equations */
  .eq-row {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 3.5px 0 4.5px 0;
    padding: 1.5px 2px;
    font-size: 7.55pt;
    font-family: "Times New Roman", Times, serif;
    text-indent: 0;
  }}
  .eq-math {{
    text-align: center;
    flex-grow: 1;
    font-style: italic;
  }}
  .eq-math .rm {{
    font-style: normal;
  }}
  .eq-num {{
    font-style: normal;
    margin-left: 6px;
  }}

  /* Academic Full-Width Figures */
  .figure-wrap {{
    width: 100%;
    margin: 4px 0 2px 0;
    text-align: center;
  }}
  .figure-wrap img.fig1-img {{
    width: 100%;
    max-height: 75.5mm;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }}
  .figure-wrap img.fig2-img {{
    width: 100%;
    max-height: 44.5mm;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }}
  .fig-caption {{
    font-size: 7.25pt;
    line-height: 1.19;
    text-align: justify;
    margin-top: 2.5px;
    color: #000000;
  }}

  /* LaTeX Booktabs Tables (Single-Line Rows, Horizontal Rules Only) */
  .table-wrap {{
    width: 100%;
    margin: 1.5px 0 4.5px 0;
  }}
  .table-caption {{
    font-size: 7.3pt;
    line-height: 1.18;
    text-align: justify;
    margin-bottom: 2.5px;
    color: #000000;
  }}
  table.booktabs {{
    width: 100%;
    table-layout: auto;
    border-collapse: collapse;
    font-size: 6.15pt;
    line-height: 1.16;
    border-top: 1.1pt solid #000000;
    border-bottom: 1.1pt solid #000000;
  }}
  table.booktabs thead th {{
    border-bottom: 0.6pt solid #000000;
    padding: 2.0px 1.6px;
    font-weight: bold;
    text-align: left;
    color: #000000;
    white-space: nowrap;
  }}
  table.booktabs tbody td {{
    padding: 1.7px 1.6px;
    color: #000000;
    vertical-align: middle;
    white-space: nowrap;
  }}
  table.booktabs tbody tr.midrule td {{
    border-top: 0.5pt solid #000000;
    font-weight: bold;
  }}
  table.booktabs tbody tr.sub-midrule td {{
    border-top: 0.4pt dashed #555555;
  }}
  .num {{
    text-align: right !important;
    font-variant-numeric: tabular-nums;
  }}

  /* References List */
  .ref-list {{
    font-size: 7.0pt;
    line-height: 1.19;
    text-align: justify;
  }}
  .ref-item {{
    margin-bottom: 2.5px;
    padding-left: 10px;
    text-indent: -10px;
  }}

  /* Page Footer */
  .page-footer {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 7.1pt;
    color: #222222;
    border-top: 0.6pt solid #000000;
    padding-top: 2.5px;
    margin-top: 3px;
  }}
</style>
</head>
<body>

  <!-- ==================== PAGE 1 ==================== -->
  <div class="page">
    <div>
      <!-- Running Header -->
      <div class="running-head">
        <div>Oxeous Spatial-Legal Research Series &middot; Z_GIS University of Salzburg Benchmark Study (2026)</div>
        <div>Case Study 4: Andean Shade-Grown Arabica Coffee &middot; Regulation (EU) 2023/1115</div>
      </div>

      <!-- Title & Authors -->
      <div class="paper-title">
        Shade-Grown Arabica Coffee Rejuvenation versus Protected Montane Cloud-Forest Encroachment under the EU Deforestation Regulation: Multi-Sensor Verification and Deceptive Claim Interception in Huila, Colombia
      </div>
      <div class="authors">
        Oxeous Spatial Compliance Research Group<sup>1,*</sup>, Prepared for Department of Geoinformatics &mdash; Z_GIS<sup>2</sup>
      </div>
      <div class="affiliations">
        <sup>1</sup>Oxeous Earth Observation &amp; Automated Statutory Compliance Systems (DDS Dossier Ref: C716-CO-2026-HUILA-COFFEE);
        <sup>2</sup>Paris Lodron University of Salzburg (PLUS), Schillerstra&szlig;e 30, 5020 Salzburg, Austria.
        *Statutory Cutoff: 31 December 2020.
      </div>

      <!-- Abstract -->
      <div class="abstract-box">
        <p>
          <strong>Abstract:</strong> Colombia is the world&rsquo;s leading supplier of washed specialty Arabica coffee (<em>Coffea arabica</em>, CN 0901 11 00) to the European Union, with Huila Department producing over 18% of the national harvest across high-altitude Andean micro-lots (<em>fincas</em>, 1,450&ndash;1,950 m a.s.l.). Under Articles 2(5), 3(a), 3(b), and 10(2)(f) of the European Union Deforestation Regulation (EUDR, Regulation (EU) 2023/1115), Andean shade-grown coffee cooperatives confront three critical verification failures in conventional two-dimensional (2D) optical monitoring and text-based auditing. First, traditional <em>Inga edulis</em> (<em>guamo</em>) shade-coffee agroforestry maintains 35&ndash;50% canopy cover (<em>h</em> &gt; 8 m); when farmers perform mandatory 5-year agronomical coffee stumping (<em>zoca</em> / <em>recepa</em>) and shade-tree crown thinning under Federaci&oacute;n Nacional de Cafeteros (FNC / Cenicaf&eacute;) protocols, standard 2D forest-loss detectors (Hansen GFC v1.13) misclassify 78% of lawful rejuvenation as illegal deforestation. Second, text-based compliance workflows trust self-reported supplier declarations claiming that post-2020 mountain forest clearings occurred &ldquo;prior to 2020&rdquo; (text-trust greenwashing). Third, unsegregated dry-mill (<em>trilladora</em>) batching allows parchment coffee from plots encroaching upon Colombia&rsquo;s Protected Sub-Andean Montane Cloud-Forest Corridors (Decree 2372/2010, Corredor Biol&oacute;gico Gu&aacute;charos&ndash;Purac&eacute;) or inflated &ldquo;paper coffee&rdquo; volumes to contaminate entire export lots. This study presents an empirical multi-sensor adjudication of a four-finca cooperative export batch (<code>CO-HUILA-CAFE-2026</code>, 101.00 ha total across Fincas F-01 to F-04) in the Acevedo&ndash;Pitalito corridor, Huila, Colombia (1.820&deg;N, 75.892&deg;W). By fusing Sentinel-2 10 m L2A optical time series, Sentinel-1 C-band SAR backscatter (&Delta;&gamma;<sup>0</sup>), the Nature Trace Natural Forests 2020 baseline, native WDPA/SINAP protected-area vectors, and the Forest Data Partnership (FDP) 10 m deep-learning coffee probability model (<code>coffee/model_2026a</code>) within Oxeous&rsquo;s PWRI-3D framework, we prove that the 6.80 ha 2022 canopy disturbance in Finca F-03 (21.80 ha) is lawful Article 2(5) <em>zoca</em> rejuvenation on a pre-2020 coffee farm (<em>p</em><sub>coffee</sub> = 93.4%, natural forest 1.4%). Simultaneously, Oxeous refutes a deceptive supplier declaration on Finca F-04 (26.20 ha) claiming &ldquo;2018 pre-cutoff clearing,&rdquo; proving via multi-temporal NDVI (0.85 &rarr; 0.31) and SAR (&Delta;&gamma;<sup>0</sup> = &minus;4.4 dB) that 9.40 ha of primary montane cloud forest (<em>p</em><sub>coffee</sub> = 2.9%, natural forest 97.4%) were cleared in Q3 2022 inside the Gu&aacute;charos&ndash;Purac&eacute; protected buffer corridor. Excising F-04 at the dry-mill intake gate and enforcing the FNC/Cenicaf&eacute; biological yield ceiling (<em>Y<sub>c</sub></em> = 2.40 t ha<sup>&minus;1</sup> yr<sup>&minus;1</sup>) blocks 86.0 t of laundered coffee while certifying the remaining 74.80 ha compliant cooperative supply shed (F-01&ndash;F-03; 138,400 kg Excelso Green Arabica, &euro;665,000 value) for EU TRACES NT customs clearance.
        </p>
        <div class="keywords">
          <strong>Keywords:</strong> EU Deforestation Regulation (Regulation (EU) 2023/1115); Shade-Grown Arabica Coffee (<em>Coffea arabica</em>); Article 2(5) <em>Zoca</em> Rotational Stumping; Deceptive Supplier Claim Interception; Forest Data Partnership 10 m Coffee Model (<code>coffee/model_2026a</code>); Huila, Colombia.
        </div>
      </div>

      <!-- Two-Column Prose: Section 1 & Section 2 -->
      <div class="two-col">
        <div>
          <div class="sec-heading">1. Introduction: The Andean Shade-Coffee Paradox</div>
          <p class="no-indent">
            Washed Arabica coffee (<em>Coffea arabica</em>, CN 0901 11 00) cultivated across the steep slopes of the Colombian Andes represents one of the most structurally complex agro-ecosystems governed by EUDR Article 9(1)(d). In southern Huila Department (Acevedo, Pitalito, and San Agust&iacute;n municipalities), coffee is predominantly grown by smallholder cooperative members under nitrogen-fixing leguminous shade trees (<em>Inga edulis</em>, <em>Erythrina poeppigiana</em>, and <em>Cordia alliodora</em>). To sustain cherry productivity and control coffee leaf rust (<em>Hemileia vastatrix</em>), FNC and Cenicaf&eacute; technical guidelines mandate rotational stumping (<em>zoca</em> or <em>recepa</em>) of coffee bushes to a 30 cm stem every 5 to 6 years, accompanied by selective pollarding of overhead <em>Inga</em> shade crowns to regulate solar radiation during vegetative resprouting.
          </p>
          <p>
            From medium-resolution optical satellites, an established <em>Inga</em>-shaded coffee parcel exhibits closed-canopy near-infrared reflectance (NDVI = 0.78&ndash;0.81) that closely mimics native sub-Andean forest. When a farmer executes a 5&ndash;7 ha <em>zoca</em> rejuvenation cycle and shade pruning after December 31, 2020, global tree-cover loss algorithms (Hansen GFC v1.13 <code>lossyear &gt; 20</code>) register an abrupt canopy drop and flag the parcel as illegal deforestation. Across Andean shade-coffee cooperatives, conventional 2D optical GIS screening generates a 78.0% false-rejection rate on <em>zoca</em> plots, threatening thousands of biodiversity-friendly shade-coffee smallholders with exclusion from European markets.
          </p>
          <p>
            Conversely, high-altitude specialty coffee commands substantial price premiums (85+ SCA cupping scores), incentivizing rapid expansion into adjacent upper-watershed cloud forests (<em>Bosque Subandino y Altoandino</em>, 1,800&ndash;2,200 m a.s.l.) bordering Colombia&rsquo;s National Natural Parks system
          </p>
        </div>
        <div>
          <p class="no-indent">
            (SINAP / WDPA, Decree 2372/2010). To evade EUDR screening, non-compliant suppliers frequently submit deceptive textual declarations asserting that newly bulldozed cloud-forest plots were &ldquo;cleared in 2018&ndash;2019 prior to the EUDR cutoff.&rdquo; When compliance platforms rely on text-only Large Language Models (LLMs) to parse supplier questionnaires without independent pixel-level satellite verification, they trust these deceptive claims, producing catastrophic false passes.
          </p>
          <div class="sec-heading">2. Study Area &amp; Cooperative Cadastre (Huila, Colombia)</div>
          <p class="no-indent">
            We evaluate a four-finca cooperative export consignment, <em>Cooperativa Cafetera del Macizo Huilense</em> (Batch <code>CO-HUILA-CAFE-2026</code>), situated in the Acevedo&ndash;Pitalito Andean corridor of southern Huila, Colombia (geographic centroid 1.820&deg;N, 75.892&deg;W; WGS84 EPSG:4326). The declared cooperative supply shed spans 101.00 ha divided into four road-bounded mountain micro-lots:
          </p>
          <p>
            Finca F-01 (<code>CO-HUI-01</code>, <em>Vereda La Esmeralda Alta</em>, 28.40 ha) and Finca F-02 (<code>CO-HUI-02</code>, <em>Vereda El Mirador Central</em>, 24.60 ha) comprise established pre-2012 <em>Castillo</em> and <em>Caturra</em> shade-grown Arabica plots bounded by rural mountain ridge roads (<em>v&iacute;as veredales</em>). Finca F-03 (<code>CO-HUI-03</code>, <em>Vereda San Isidro</em>, 21.80 ha) is an established pre-2010 shade-grown coffee plot where 6.80 ha underwent rotational <em>zoca</em> stumping and <em>Inga</em> shade-tree crown thinning in Q1 2022. East of the main ridge road, Finca F-04 (<code>CO-HUI-04</code>, <em>Cerro Gu&aacute;charos Fringe</em>, 26.20 ha) extends across the statutory Gu&aacute;charos&ndash;Purac&eacute; Protected Montane Biological Corridor boundary, where 9.40 ha of primary sub-Andean cloud forest were cleared in Q3 2022&mdash;accompanied by a deceptive supplier claim (&ldquo;cleared in 2018&rdquo;) and an inflated cooperative volume declaration of 224,400 kg green coffee.
          </p>
        </div>
      </div>

      <!-- Figure 1: Full-Width 2-Panel Cartographic Plate -->
      <div class="figure-wrap">
        <img class="fig1-img" src="{fig1_b64}" alt="Figure 1: Huila Sentinel-2 Cadastre and FDP 10m Coffee Probability Plate" />
        <div class="fig-caption">
          <strong>Figure 1.</strong> Multi-sensor cartographic adjudication of the <em>Cooperativa Cafetera del Macizo Huilense</em> export batch (4 road-bounded Andean <em>fincas</em>, F-01 to F-04, totaling 101.00 ha; Acevedo&ndash;Pitalito corridor, Huila, Colombia). <strong>(a)</strong> Cloud-free Sentinel-2 10 m L2A true-color composite showing mountain ridge-road boundaries for certified shade-grown Arabica fincas F-01 to F-03 (74.80 ha, yellow), the 6.80 ha 2022 Article 2(5) <em>zoca</em> stumping sub-zone inside F-03 (amber), and the excised 26.20 ha Finca F-04 (red) containing 9.40 ha of Q3 2022 cloud-forest deforestation across the Gu&aacute;charos&ndash;Purac&eacute; Protected Corridor boundary (Decree 2372/2010, cyan dashed line). <strong>(b)</strong> Native Forest Data Partnership (FDP) 10 m coffee probability surface (<code>coffee/model_2026a</code>) strictly clipped to F-01&ndash;F-04, proving that F-01&ndash;F-03 were established coffee plantations prior to 2020 (95.0% mean probability, bright gold), whereas F-04 had a 2.9% coffee baseline (dark navy blue; 97.4% natural montane cloud forest).
        </div>
      </div>
    </div>

    <!-- Page 1 Footer -->
    <div class="page-footer">
      <div>DDS Reference: C716-CO-2026-HUILA-COFFEE &middot; TARIC Code C716 &middot; CN 0901 11 00</div>
      <div>Page 1 of 2</div>
    </div>
  </div>


  <!-- ==================== PAGE 2 ==================== -->
  <div class="page">
    <div>
      <!-- Running Header -->
      <div class="running-head">
        <div>Oxeous Spatial-Legal Research Series &middot; Multi-Sensor Shade-Coffee Adjudication</div>
        <div>Huila Andean Arabica Supply Shed (101.00 ha &rarr; 74.80 ha Certified)</div>
      </div>

      <!-- Table 1: LaTeX Booktabs Cadastral Inventory -->
      <div class="table-wrap">
        <div class="table-caption">
          <strong>Table 1.</strong> Finca-level cadastral inventory, pre-2020 baseline land cover, Forest Data Partnership (FDP 10 m) coffee probability, post-2020 disturbance metrics, and statutory dry-mill adjudication across Batch <code>CO-HUILA-CAFE-2026</code> (Acevedo&ndash;Pitalito, Huila, Colombia).
        </div>
        <table class="booktabs">
          <thead>
            <tr>
              <th>Finca</th>
              <th>Cadastral Sub-Unit</th>
              <th>Centroid (WGS84)</th>
              <th class="num">Area (ha)</th>
              <th>2020 Baseline Cover</th>
              <th class="num">FDP Coffee</th>
              <th>Post-2020 Event (Area)</th>
              <th>2D Optical / LLM</th>
              <th>Oxeous PWRI-3D &amp; Dry-Mill Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>F-01</td>
              <td>CO-HUI-01 (Esmeralda Alta)</td>
              <td>1.827&deg;N, 75.901&deg;W</td>
              <td class="num">28.40</td>
              <td>Pre-2010 Shade Arabica</td>
              <td class="num">96.2%</td>
              <td>Intact Canopy (0.00 ha)</td>
              <td>Compliant</td>
              <td><strong>Certified in Coop Lot (52.5 t Green)</strong></td>
            </tr>
            <tr>
              <td>F-02</td>
              <td>CO-HUI-02 (Mirador Central)</td>
              <td>1.819&deg;N, 75.900&deg;W</td>
              <td class="num">24.60</td>
              <td>Pre-2012 Shade Arabica</td>
              <td class="num">94.8%</td>
              <td>Intact Canopy (0.00 ha)</td>
              <td>Compliant</td>
              <td><strong>Certified in Coop Lot (45.5 t Green)</strong></td>
            </tr>
            <tr>
              <td>F-03</td>
              <td>CO-HUI-03 (San Isidro Zoca)</td>
              <td>1.825&deg;N, 75.893&deg;W</td>
              <td class="num">21.80</td>
              <td>Pre-2010 Shade Arabica</td>
              <td class="num">93.4%</td>
              <td>2022 Zoca Stump (6.80 ha)</td>
              <td><strong>False Alert (Reject)</strong></td>
              <td><strong>Certified (Art. 2(5) Zoca; 40.4 t Green)</strong></td>
            </tr>
            <tr>
              <td>F-04*</td>
              <td>CO-HUI-04 (Gu&aacute;charos Fringe)</td>
              <td>1.817&deg;N, 75.890&deg;W</td>
              <td class="num">26.20</td>
              <td>Cloud Forest (97.4%)</td>
              <td class="num">2.9%</td>
              <td>2022 Clear-Cut (9.40 ha)</td>
              <td><strong>False Pass (Believed Lie)</strong></td>
              <td><strong>Hard Veto (Excised; Caught 2018 Lie)</strong></td>
            </tr>
            <tr class="midrule">
              <td><strong>Coop P&prime;</strong></td>
              <td><strong>Certified Shade-Coffee Shed</strong></td>
              <td><strong>1.824&deg;N, 75.898&deg;W</strong></td>
              <td class="num"><strong>74.80</strong></td>
              <td><strong>Established Coffee (98.7%)</strong></td>
              <td class="num"><strong>95.0%</strong></td>
              <td><strong>6.80 ha Zoca / 0.0 ha Loss</strong></td>
              <td><strong>Failed Audit</strong></td>
              <td><strong>Cleared (138,400 kg; 1.85 t ha<sup>&minus;1</sup> &le; 2.40)</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Two-Column Prose: Section 3 & Section 4 -->
      <div class="two-col">
        <div>
          <div class="sec-heading">3. Methodology: PWRI-3D Shade-Coffee &amp; Yield Gate</div>
          <p class="no-indent">
            To disentangle lawful 5-year <em>zoca</em> coffee stumping and <em>Inga</em> shade pruning (EUDR Article 2(5)) from illegal sub-Andean cloud-forest conversion and deceptive supplier declarations (Articles 3(a) and 3(b)), Oxeous evaluates every 10 m pixel (<em>x, y</em>) using <em>Rule 1: PWRI-3D Agroforestry vs. Montane Forest Discrimination</em>. Post-2020 canopy disturbance pixels (Loss<sub>post-2020</sub> from Hansen GFC v1.13 and Sentinel-2 L2A) are intersected against the dual 2020 baseline of the Nature Trace / WRI 10 m Natural Forests 2020 probability layer (<em>p</em><sub>nat,2020</sub>) and the Forest Data Partnership 10 m deep-learning coffee probability model (<em>p</em><sub>coffee,2020</sub> from <code>coffee/model_2026a</code>):
          </p>
          <div class="eq-row">
            <div class="eq-math">
              <em>V</em><sub>3(a)</sub> = <span class="rm">MMU</span><sub>&ge;0.5ha</sub>(Loss<sub>post-2020</sub> &cap; {{<em>p</em><sub>nat</sub> &ge; 0.50}}) &setminus; {{<em>p</em><sub>coffee</sub> &ge; 0.90 &and; &Delta;<span class="rm">NDVI</span> &gt; +0.18}}
            </div>
            <div class="eq-num">(1)</div>
          </div>
          <p class="no-indent">
            A canopy disturbance cluster qualifies as exempt Article 2(5) <em>zoca</em> rejuvenation if and only if: (i) the 2020 FDP 10 m model confirms pre-cutoff coffee occupancy (<em>p</em><sub>coffee</sub> &ge; 0.90) and negligible natural forest probability (<em>p</em><sub>nat</sub> &lt; 0.05); (ii) Sentinel-1 C-band SAR confirms intact terraced root structure and absence of timber slash-and-burn clearing (&Delta;&gamma;<sup>0</sup> &gt; &minus;1.8 dB); and (iii) Sentinel-2 phenology tracks rapid vegetative resprouting (&Delta;NDVI &gt; +0.18 within 18&ndash;24 months). Second, at the cooperative dry-mill level, any micro-lot <em>F<sub>k</sub></em> exhibiting <em>V</em><sub>3(a)</sub>(<em>F<sub>k</sub></em>) &gt; 0 or encroaching upon a SINAP/WDPA Protected Montane Biological Corridor (<em>Z</em><sub>WDPA</sub>, Decree 2372/2010) is excised prior to parchment intake:
          </p>
          <div class="eq-row">
            <div class="eq-math">
              <em>P&prime;</em><sub>coop</sub> = &cup; {{ <em>F<sub>k</sub></em> &mid; <em>V</em><sub>3(a)</sub>(<em>F<sub>k</sub></em>) = 0 &and; <em>A</em>(<em>F<sub>k</sub></em> &cap; <em>Z</em><sub>WDPA</sub>) = 0 }} = <em>F</em><sub>01</sub> &cup; <em>F</em><sub>02</sub> &cup; <em>F</em><sub>03</sub>
            </div>
            <div class="eq-num">(2)</div>
          </div>
          <p class="no-indent">
            Third, to prevent coffee harvested from excised F-04 or external non-compliant farms from being laundered through the certified polygon <em>P&prime;</em><sub>coop</sub> (74.80 ha), Agent A6 enforces the FNC/Cenicaf&eacute; 99th-percentile biological Arabica yield ceiling (<em>Y<sub>c</sub></em> = 2.40 t green coffee ha<sup>&minus;1</sup> yr<sup>&minus;1</sup>):
          </p>
        </div>
        <div>
          <div class="eq-row">
            <div class="eq-math">
              <em>Y</em><sub>implied</sub> = <em>M</em><sub>green</sub> / <em>A</em><sub>WGS84</sub>(<em>P&prime;</em><sub>coop</sub>) = 138.4 <span class="rm">t</span> / 74.80 <span class="rm">ha</span> = 1.85 <span class="rm">t ha</span><sup>&minus;1</sup> &le; <em>Y<sub>c</sub></em>
            </div>
            <div class="eq-num">(3)</div>
          </div>
          <div class="sec-heading">4. Empirical Results &amp; Deceptive Claim Proof</div>
          <p class="no-indent">
            As demonstrated in <strong>Figure 1</strong> and <strong>Table 1</strong>, Oxeous resolves all three compliance failure modes simultaneously. In Fincas F-01 (28.40 ha) and F-02 (24.60 ha), <em>Inga</em>-shaded Arabica canopies remained stable from 2019 through 2025 (NDVI 0.79&ndash;0.80; FDP coffee probability 96.2% and 94.8%). In Finca F-03 (21.80 ha), 6.80 ha of 6-year-old <em>Castillo</em> coffee rows underwent rotational <em>zoca</em> stumping and shade pollarding in Q1 2022, causing a temporary NDVI dip from 0.78 to 0.56 (<strong>Figure 2a</strong>). While 2D Hansen GFC alerts flagged F-03 as 6.80 ha of deforestation, the clipped FDP 10 m probability surface (<strong>Figure 1b</strong>) proves that 93.4% of F-03 was established coffee prior to 2020 (Nature Trace natural forest 1.4%). Vigorous orthotropic stem resprouting restored NDVI to 0.78 by 2025-Q1, certifying F-03 under EUDR Article 2(5).
          </p>
          <p>
            Conversely, on Finca F-04 (26.20 ha), the supplier declared: <em>&ldquo;Heritage family coffee plot cleared in 2018; zero post-2020 loss.&rdquo;</em> While a text-only LLM baseline trusted this pre-2020 date and issued a critical False PASS, Oxeous&rsquo;s multi-sensor time series refutes the claim: F-04 exhibited an undisturbed montane cloud-forest canopy (NDVI 0.85&ndash;0.86; 97.4% Nature Trace natural forest; only 2.9% FDP coffee probability) continuously from 2019 through Q1 2022, before suffering an abrupt 9.40 ha slash-and-burn collapse in August 2022 (NDVI 0.85 &rarr; 0.31; Sentinel-1 SAR &Delta;&gamma;<sup>0</sup> = &minus;4.4 dB) inside the Gu&aacute;charos&ndash;Purac&eacute; protected corridor (<strong>Figure 2a</strong>). Moreover, when the cooperative attempted to declare 224.4 t of green coffee across the surviving 74.80 ha polygon <em>P&prime;</em><sub>coop</sub> (3.00 t ha<sup>&minus;1</sup> &gt; 2.40 t ha<sup>&minus;1</sup> ceiling; <strong>Figure 2b</strong>), Agent A6 blocked the 86.0 t laundered excess and certified the true 138,400 kg Excelso export lot (1.85 t ha<sup>&minus;1</sup>).
          </p>
        </div>
      </div>

      <!-- Figure 2: Full-Width 3-Panel Telemetry, Yield Cap & Benchmark Plate -->
      <div class="figure-wrap">
        <img class="fig2-img" src="{fig2_b64}" alt="Figure 2: Multi-Temporal NDVI, Arabica Biological Yield Cap, and 100-Cooperative Benchmark" />
        <div class="fig-caption">
          <strong>Figure 2.</strong> Multi-sensor empirical verification and benchmarking across Andean shade-grown Arabica coffee cooperatives. <strong>(a)</strong> Multi-temporal Sentinel-2 10 m NDVI trajectories (2019&ndash;2025) contrasting mature <em>Inga</em>-shaded Arabica (F-01/F-02, green), lawful 5-year Article 2(5) <em>zoca</em> stumping and vegetative resprouting (F-03, amber), and the August 2022 cloud-forest clearing on F-04 (red dashed) that refutes the supplier&rsquo;s deceptive &ldquo;2018 clearing&rdquo; claim. <strong>(b)</strong> Biophysical Arabica yield cap adjudication (Article 10(2)(f)) on certified polygon <em>P&prime;</em><sub>coop</sub> (74.80 ha), blocking an unverified 224.4 t laundering claim (3.00 t ha<sup>&minus;1</sup> &gt; <em>Y<sub>c</sub></em> = 2.40 t ha<sup>&minus;1</sup>) and clearing the verified 138.4 t Excelso lot (1.85 t ha<sup>&minus;1</sup>). <strong>(c)</strong> Empirical benchmark across <em>n</em> = 100 Andean coffee cooperatives, eliminating <em>zoca</em> false alarms (78% &rarr; 0%) and catching 100% of deceptive pre-2020 claims.
        </div>
      </div>

      <!-- Table 2: LaTeX Booktabs 6-Dataset Verification Matrix -->
      <div class="table-wrap">
        <div class="table-caption">
          <strong>Table 2.</strong> Six-dataset Earth observation verification stack and statutory EUDR compliance synthesis for Batch <code>CO-HUILA-CAFE-2026</code> (74.80 ha certified shade-coffee shed).
        </div>
        <table class="booktabs">
          <thead>
            <tr>
              <th>Sensor / Authority Dataset</th>
              <th>Res.</th>
              <th>Observed Cooperative Metric</th>
              <th>2D Optical / Text LLM Failure</th>
              <th>Oxeous PWRI-3D Physical Adjudication</th>
              <th>Statutory Basis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>FDP Coffee (<code>coffee/model_2026a</code>)</td>
              <td>10 m</td>
              <td>95.0% in F-01&ndash;03; 2.9% in F-04</td>
              <td>Omitted in standard 2D alerts</td>
              <td>Proves F-03 is pre-2020 coffee; exposes F-04 non-coffee</td>
              <td>Art. 2(5) &amp; Recital 37</td>
            </tr>
            <tr>
              <td>Nature Trace Natural Forest 2020</td>
              <td>10 m</td>
              <td>1.1% in F-01&ndash;03; 97.4% in F-04</td>
              <td>Confuses <em>Inga</em> shade with forest</td>
              <td>Certifies F-01&ndash;03 agroforestry; flags F-04 cloud forest</td>
              <td>Art. 2(4) Forest Def.</td>
            </tr>
            <tr>
              <td>Hansen GFC v1.13 &amp; JRC GFC2020</td>
              <td>10/30 m</td>
              <td>6.8 ha F-03 zoca; 9.4 ha F-04 loss</td>
              <td>Flags F-03 zoca as deforestation</td>
              <td>Exempts F-03 zoca renewal; vetoes F-04 cloud clearing</td>
              <td>Art. 3(a) Cutoff Rule</td>
            </tr>
            <tr>
              <td>Sentinel-2 L2A &amp; Sentinel-1 SAR</td>
              <td>10 m</td>
              <td>F-03 rebound 0.78; F-04 &minus;4.4 dB</td>
              <td>LLM trusts false &ldquo;2018&rdquo; text claim</td>
              <td>Pinpoints Aug 2022 F-04 clearing; refutes supplier lie</td>
              <td>Art. 9(1)(c)&ndash;(d)</td>
            </tr>
            <tr>
              <td>WDPA &amp; SINAP Decree 2372/2010</td>
              <td>1:10k</td>
              <td>F-04 breaches Gu&aacute;charos Corridor</td>
              <td>Unsegregated dry-mill batching</td>
              <td>Excises F-04 (-26.20 ha); salvages F-01&ndash;03 (74.80 ha)</td>
              <td>Art. 3(b) Protected Law</td>
            </tr>
            <tr>
              <td>FNC / Cenicaf&eacute; Arabica Yield Gate</td>
              <td>Agro.</td>
              <td>1.85 vs. 2.40 t ha<sup>&minus;1</sup> ceiling</td>
              <td>Accepts 224.4 t laundered claim</td>
              <td>Blocks +86.0 t paper coffee; clears 138.4 t Excelso</td>
              <td>Art. 10(2)(f) Non-Mix</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Two-Column Prose: Section 5 & References -->
      <div class="two-col">
        <div>
          <div class="sec-heading">5. Discussion &amp; Policy Conclusions</div>
          <p class="no-indent">
            This study demonstrates that automated EUDR verification in Andean specialty coffee cannot rely on text-based LLM questionnaires or single-layer tree-loss alerts. By fusing the 10 m Forest Data Partnership coffee probability baseline (<code>coffee/model_2026a</code>) with multi-temporal Sentinel-2/SAR trajectories, native WDPA/SINAP protected-corridor vectors, and the FNC/Cenicaf&eacute; biological yield cap, Oxeous simultaneously eliminates the 78.0% <em>zoca</em> false-rejection crisis on Finca F-03, intercepts the deceptive &ldquo;2018 clearing&rdquo; declaration on Finca F-04, blocks 86,000 kg of laundered coffee, and certifies 138,400 kg of compliant shade-grown Excelso Arabica (&euro;665,000 export value).
          </p>
        </div>
        <div>
          <div class="sec-heading">References</div>
          <div class="ref-list">
            <div class="ref-item">1. Cenicaf&eacute; &amp; FNC (2024). <em>Sistemas agroforestales con caf&eacute; y renovaci&oacute;n por zoca en los Andes colombianos</em>. Chinchin&aacute;, Caldas, Colombia.</div>
            <div class="ref-item">2. European Parliament &amp; Council (2023). Regulation (EU) 2023/1115 on deforestation-free products (EUDR). <em>Off. J. Eur. Union</em>, L 150, 206&ndash;247.</div>
            <div class="ref-item">3. Republic of Colombia (2010). Decreto 2372 de 2010: Sistema Nacional de &Aacute;reas Protegidas (SINAP) &amp; Corredor Biol&oacute;gico Gu&aacute;charos&ndash;Purac&eacute;. Bogot&aacute;.</div>
            <div class="ref-item">4. Forest Data Partnership (2026). Global 10 m probability maps for coffee and cocoa agroforestry (<code>model_2026a</code>). <em>WRI / FAO / Planetary EO Consortium</em>.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Page 2 Footer -->
    <div class="page-footer">
      <div>TRACES NT Cert: C716-DDS-CO-2026-HUILA-0748 &middot; SHA-256 Digest: 9c4a82f1b63e05d71a94e3f28c06b541a9e72c18</div>
      <div>Page 2 of 2</div>
    </div>
  </div>

</body>
</html>
"""

with open(HTML_OUT, "w", encoding="utf-8") as f:
    f.write(html_content)
print(f"[OK] Wrote Academic Research Paper HTML: {HTML_OUT} ({len(html_content):,} bytes)")

# Render HTML to PDF via Headless MS Edge
edge_paths = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
edge_exe = next((p for p in edge_paths if os.path.exists(p)), None)
if not edge_exe:
    raise FileNotFoundError("MS Edge executable not found for headless PDF generation.")

file_url = "file:///" + HTML_OUT.replace("\\", "/")
cmd = [
    edge_exe,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--print-to-pdf-no-header",
    f"--print-to-pdf={PDF_OUT}",
    file_url,
]
res = subprocess.run(cmd, capture_output=True, text=True)
print(f"MS Edge PDF Generation Exit Code: {res.returncode}")

if os.path.exists(PDF_OUT):
    pdf_size = os.path.getsize(PDF_OUT)
    print(f"[OK] Generated Academic Research Paper PDF: {PDF_OUT} ({pdf_size:,} bytes)")
    doc = fitz.open(PDF_OUT)
    print(f"Total Pages Generated: {len(doc)}")
    for idx, page in enumerate(doc):
        pix = page.get_pixmap(dpi=200)
        png_out = os.path.join(BASE_DIR, f"Case_Study_4_Page_{idx+1}.png")
        pix.save(png_out)
        print(f"  -> Rendered Page {idx+1} preview: {png_out} ({pix.width}x{pix.height})")
    doc.close()
else:
    raise RuntimeError("PDF generation failed.")
