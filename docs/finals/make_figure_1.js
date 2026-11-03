const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const W = 1180;
const H = 760;

// SVG Definition
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#ffffff; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <style>
      .title { font-weight: 800; font-size: 19px; fill: #0F172A; letter-spacing: -0.02em; }
      .subtitle { font-size: 11px; fill: #475569; font-weight: 400; }
      .meta { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; fill: #64748B; font-weight: 600; }
      .tier-title { font-weight: 700; font-size: 10.5px; fill: #0F172A; text-transform: uppercase; letter-spacing: 0.06em; }
      .tier-num { font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 11px; fill: #2563EB; }
      .box-title { font-weight: 700; font-size: 11px; fill: #0F172A; }
      .box-desc { font-size: 9px; fill: #475569; line-height: 1.35; }
      .box-tag { font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 600; padding: 2px 4px; }
      .math-txt { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; font-weight: 600; fill: #0F172A; }
      .badge-txt { font-weight: 700; font-size: 8.5px; }
      .bus-lbl { font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 700; fill: #2563EB; letter-spacing: 0.04em; }
    </style>

    <!-- Gradients -->
    <linearGradient id="grad-bus" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="grad-pwri" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#EFF6FF"/>
    </linearGradient>
    <linearGradient id="grad-agent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#FAF5FF"/>
    </linearGradient>
    <linearGradient id="grad-carve" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#FFFBEB"/>
    </linearGradient>

    <!-- Markers -->
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3B82F6"/>
    </marker>
    <marker id="arrow-dark" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748B"/>
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#16A34A"/>
    </marker>
  </defs>

  <!-- Outer Border Container -->
  <rect x="12" y="12" width="1156" height="736" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>

  <!-- =========================================================================
       HEADER
       ========================================================================= -->
  <g transform="translate(32, 28)">
    <text x="0" y="16" class="title">Figure 1 | Oxeous Earth Agent Architecture &amp; End-to-End Verification Pipeline</text>
    <text x="0" y="32" class="subtitle">Multi-sensor Earth observation fusion, tri-axial map algebra (PWRI-3D), multi-agent consensus, and sovereign TRACES NT delivery.</text>
    
    <g transform="translate(860, -2)">
      <rect x="0" y="0" width="250" height="38" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
      <text x="12" y="15" class="meta" fill="#0F172A">STANDARD: EU 2023/1115 · TARIC C716</text>
      <text x="12" y="29" class="meta" fill="#64748B">LATENCY: &lt; 20s · RESOLUTION: 10m GRID</text>
    </g>
  </g>

  <!-- =========================================================================
       TIER 1: MULTI-MODAL INGESTION & TOPOLOGICAL INTEGRITY
       ========================================================================= -->
  <g transform="translate(32, 78)">
    <!-- Container -->
    <rect x="0" y="0" width="1116" height="98" rx="6" fill="#FAFAFA" stroke="#E2E8F0" stroke-width="1"/>
    <!-- Header -->
    <rect x="0" y="0" width="1116" height="24" rx="6" fill="#F1F5F9"/>
    <rect x="0" y="14" width="1116" height="10" fill="#F1F5F9"/>
    <text x="12" y="16" class="tier-title"><tspan class="tier-num">TIER 1</tspan> &nbsp;·&nbsp; Multi-Modal Sourcing Ingestion &amp; Geodesic Topology Validation</text>
    <text x="960" y="16" class="meta">INPUT DATA STREAM</text>

    <!-- 3 Ingest Modules -->
    <!-- Module 1A -->
    <g transform="translate(14, 32)">
      <rect x="0" y="0" width="348" height="54" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <circle cx="20" cy="27" r="12" fill="#EFF6FF" stroke="#3B82F6" stroke-width="1.2"/>
      <path d="M15 27 L20 20 L25 24 L23 33 L17 31 Z" fill="none" stroke="#2563EB" stroke-width="1.4"/>
      <text x="40" y="19" class="box-title">Vector AOI Plot Geometry</text>
      <text x="336" y="18" text-anchor="end" class="meta" fill="#2563EB">EPSG:4326</text>
      <text x="40" y="33" class="box-desc">GeoJSON / Shapefile / Coordinates (0.1 ha to 1,000,000 ha)</text>
      <text x="40" y="45" class="box-desc" fill="#64748B">Point buffering (1 ha) &amp; multi-polygon coordinate extraction</text>
    </g>

    <!-- Module 1B -->
    <g transform="translate(384, 32)">
      <rect x="0" y="0" width="348" height="54" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <circle cx="20" cy="27" r="12" fill="#F0FDF4" stroke="#22C55E" stroke-width="1.2"/>
      <path d="M14 27 C14 22 26 22 26 27 C26 32 14 32 14 27 Z" fill="none" stroke="#16A34A" stroke-width="1.4"/>
      <text x="40" y="19" class="box-title">Geodesic Physics &amp; RFC 7946</text>
      <text x="336" y="18" text-anchor="end" class="meta" fill="#16A34A">WGS84 ELLIPSOID</text>
      <text x="40" y="33" class="box-desc">Exact geodesic area integral A = ∬√det(g) dλ dφ</text>
      <text x="40" y="45" class="box-desc" fill="#64748B">Topology self-intersection check &amp; Polsby-Popper compactness</text>
    </g>

    <!-- Module 1C -->
    <g transform="translate(754, 32)">
      <rect x="0" y="0" width="348" height="54" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <circle cx="20" cy="27" r="12" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1.2"/>
      <path d="M16 33 L20 22 L24 33 M18 29 L22 29" stroke="#D97706" stroke-width="1.4" fill="none"/>
      <text x="40" y="19" class="box-title">Statutory Commodity &amp; Declared Mass</text>
      <text x="336" y="18" text-anchor="end" class="meta" fill="#D97706">ANNEX I TARIFF</text>
      <text x="40" y="33" class="box-desc">Target commodity (Cocoa, Coffee, Rubber, Palm, Soya, Wood, Beef)</text>
      <text x="40" y="45" class="box-desc" fill="#64748B">Declared harvest batch mass (kg) for mass-balance yield gating</text>
    </g>
  </g>

  <!-- Flow Connector Tier 1 -> Tier 2 -->
  <g transform="translate(580, 176)">
    <line x1="0" y1="0" x2="0" y2="16" stroke="#3B82F6" stroke-width="1.8" marker-end="url(#arrow)"/>
    <rect x="-85" y="1" width="170" height="14" rx="3" fill="#FFFFFF" stroke="#93C5FD" stroke-width="1"/>
    <text x="0" y="11" text-anchor="middle" class="bus-lbl">10m GEODESIC TENSOR GRID</text>
  </g>

  <!-- =========================================================================
       TIER 2: HETEROGENEOUS MULTI-SENSOR EARTH OBSERVATION SUITE
       ========================================================================= -->
  <g transform="translate(32, 196)">
    <!-- Container -->
    <rect x="0" y="0" width="1116" height="130" rx="6" fill="#FAFAFA" stroke="#E2E8F0" stroke-width="1"/>
    <!-- Header -->
    <rect x="0" y="0" width="1116" height="24" rx="6" fill="#F1F5F9"/>
    <rect x="0" y="14" width="1116" height="10" fill="#F1F5F9"/>
    <text x="12" y="16" class="tier-title"><tspan class="tier-num">TIER 2</tspan> &nbsp;·&nbsp; Heterogeneous Multi-Sensor Earth Observation Constellation (Google Earth Engine)</text>
    <text x="948" y="16" class="meta">8 PARALLEL PIPELINES</text>

    <!-- 4 Sub-Columns of EO Data -->
    <!-- Col 1: Statutory Baseline (Cutoff) -->
    <g transform="translate(14, 30)">
      <rect x="0" y="0" width="260" height="88" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <rect x="0" y="0" width="260" height="18" rx="5" fill="#F8FAFC"/>
      <rect x="0" y="10" width="260" height="8" fill="#F8FAFC"/>
      <text x="8" y="13" class="box-title" font-size="9px" fill="#0F172A">A. STATUTORY CUTOFF BASELINE</text>
      <text x="252" y="13" text-anchor="end" class="meta" font-size="8.5px" fill="#16A34A">DEC 31, 2020</text>
      
      <g transform="translate(8, 24)">
        <text x="0" y="11" class="box-desc" font-weight="600">• EC JRC GFC2020 V4 (10m):</text>
        <text x="126" y="11" class="box-desc" fill="#64748B">Official EU baseline</text>
        <text x="0" y="25" class="box-desc" font-weight="600">• Nature Trace S2 (10m):</text>
        <text x="114" y="25" class="box-desc" fill="#64748B">Natural forest prob.</text>
        <text x="0" y="39" class="box-desc" font-weight="600">• Forest Typology (10m):</text>
        <text x="118" y="39" class="box-desc" fill="#64748B">Primary vs planted vs crop</text>
        <text x="0" y="53" class="box-desc" font-weight="600">• Hansen GFC 2000 (30m):</text>
        <text x="126" y="53" class="box-desc" fill="#64748B">20-yr tree cover history</text>
      </g>
    </g>

    <!-- Col 2: Dynamic Disturbance Stream -->
    <g transform="translate(288, 30)">
      <rect x="0" y="0" width="260" height="88" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <rect x="0" y="0" width="260" height="18" rx="5" fill="#F8FAFC"/>
      <rect x="0" y="10" width="260" height="8" fill="#F8FAFC"/>
      <text x="8" y="13" class="box-title" font-size="9px" fill="#0F172A">B. DYNAMIC CANOPY LOSS</text>
      <text x="252" y="13" text-anchor="end" class="meta" font-size="8.5px" fill="#DC2626">2021–2026</text>
      
      <g transform="translate(8, 24)">
        <text x="0" y="11" class="box-desc" font-weight="600">• Hansen GFC v1.13 (30m):</text>
        <text x="124" y="11" class="box-desc" fill="#64748B">Yearly loss (21–25)</text>
        <text x="0" y="25" class="box-desc" font-weight="600">• WUR/WRI RADD Radar (10m):</text>
        <text x="144" y="25" class="box-desc" fill="#64748B">Sentinel-1 C-SAR</text>
        <text x="0" y="39" class="box-desc" font-weight="600">• Sentinel-2 MSI (10m):</text>
        <text x="112" y="39" class="box-desc" fill="#64748B">Cloud-piercing NDVI drop</text>
        <text x="0" y="53" class="box-desc" font-weight="600">• 500m Halo Disturbance Ring:</text>
        <text x="146" y="53" class="box-desc" fill="#64748B">Perimeter leak check</text>
      </g>
    </g>

    <!-- Col 3: Commodity & Biophysical Models -->
    <g transform="translate(562, 30)">
      <rect x="0" y="0" width="260" height="88" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <rect x="0" y="0" width="260" height="18" rx="5" fill="#F8FAFC"/>
      <rect x="0" y="10" width="260" height="8" fill="#F8FAFC"/>
      <text x="8" y="13" class="box-title" font-size="9px" fill="#0F172A">C. COMMODITY &amp; BIOPHYSICS</text>
      <text x="252" y="13" text-anchor="end" class="meta" font-size="8.5px" fill="#D97706">MULTISPECTRAL</text>
      
      <g transform="translate(8, 24)">
        <text x="0" y="11" class="box-desc" font-weight="600">• Google FDP 2026a (10m):</text>
        <text x="126" y="11" class="box-desc" fill="#64748B">Cocoa, Palm, Rubber, Coffee</text>
        <text x="0" y="25" class="box-desc" font-weight="600">• WRI / DeepMind Drivers (1km):</text>
        <text x="154" y="25" class="box-desc" fill="#64748B">Ag vs Fire vs Logging</text>
        <text x="0" y="39" class="box-desc" font-weight="600">• Copernicus GLO-30 DEM:</text>
        <text x="138" y="39" class="box-desc" fill="#64748B">Mean elevation &amp; slope</text>
        <text x="0" y="53" class="box-desc" font-weight="600">• Peatland &amp; Mangrove Layers:</text>
        <text x="150" y="53" class="box-desc" fill="#64748B">Tropical wetland audit</text>
      </g>
    </g>

    <!-- Col 4: Sovereign Cadastre & Protected Areas -->
    <g transform="translate(836, 30)">
      <rect x="0" y="0" width="266" height="88" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <rect x="0" y="0" width="266" height="18" rx="5" fill="#F8FAFC"/>
      <rect x="0" y="10" width="266" height="8" fill="#F8FAFC"/>
      <text x="8" y="13" class="box-title" font-size="9px" fill="#0F172A">D. CADASTRE &amp; RESERVES</text>
      <text x="258" y="13" text-anchor="end" class="meta" font-size="8.5px" fill="#4F46E5">LEGAL OVERLAY</text>
      
      <g transform="translate(8, 24)">
        <text x="0" y="11" class="box-desc" font-weight="600">• UNEP-WCMC WDPA (2025):</text>
        <text x="138" y="11" class="box-desc" fill="#64748B">IUCN Cat. I–VI reserves</text>
        <text x="0" y="25" class="box-desc" font-weight="600">• Statutory Strict Parks (Ia/II):</text>
        <text x="152" y="25" class="box-desc" fill="#64748B">Mandatory rejection gate</text>
        <text x="0" y="39" class="box-desc" font-weight="600">• Managed Use Zones (V/VI):</text>
        <text x="146" y="39" class="box-desc" fill="#64748B">Local permit validation</text>
        <text x="0" y="53" class="box-desc" font-weight="600">• Country Benchmark Tier:</text>
        <text x="136" y="53" class="box-desc" fill="#64748B">EU 2025/1093 Risk rating</text>
      </g>
    </g>
  </g>

  <!-- Flow Connector Tier 2 -> Tier 3 -->
  <g transform="translate(580, 328)">
    <line x1="0" y1="0" x2="0" y2="16" stroke="#3B82F6" stroke-width="1.8" marker-end="url(#arrow)"/>
    <rect x="-110" y="1" width="220" height="14" rx="3" fill="#FFFFFF" stroke="#93C5FD" stroke-width="1"/>
    <text x="0" y="11" text-anchor="middle" class="bus-lbl">SPATIAL-TEMPORAL MULTI-SENSOR MATRIX</text>
  </g>

  <!-- =========================================================================
       TIER 3: DUAL-CORE DEEP-TECH ENGINES (PWRI-3D + MULTI-AGENT + CARVE-OUT)
       ========================================================================= -->
  <g transform="translate(32, 348)">
    <!-- Container -->
    <rect x="0" y="0" width="1116" height="236" rx="6" fill="#FAFAFA" stroke="#E2E8F0" stroke-width="1"/>
    <!-- Header -->
    <rect x="0" y="0" width="1116" height="24" rx="6" fill="#F1F5F9"/>
    <rect x="0" y="14" width="1116" height="10" fill="#F1F5F9"/>
    <text x="12" y="16" class="tier-title"><tspan class="tier-num">TIER 3</tspan> &nbsp;·&nbsp; Deep-Tech Adjudication Core: Deterministic Map Algebra (PWRI-3D) &amp; Multi-Agent Consensus</text>
    <text x="910" y="16" class="meta">ZERO-HALLUCINATION DUAL CORE</text>

    <!-- 3 Pillars in Tier 3 -->
    <!-- Pillar 1: PWRI-3D Tri-Axial Map Algebra (Figure 2) -->
    <g transform="translate(14, 30)">
      <rect x="0" y="0" width="410" height="194" rx="6" fill="url(#grad-pwri)" stroke="#93C5FD" stroke-width="1.3"/>
      
      <!-- Badge -->
      <g transform="translate(10, 10)">
        <rect x="0" y="0" width="140" height="18" rx="3" fill="#2563EB"/>
        <text x="70" y="12" text-anchor="middle" class="badge-txt" fill="#FFFFFF">CORE ENGINE A (FIG. 2)</text>
      </g>
      <text x="160" y="23" class="box-title" font-size="12px">PWRI-3D Tri-Axial Map Algebra</text>

      <!-- Formula Box -->
      <g transform="translate(10, 34)">
        <rect x="0" y="0" width="390" height="28" rx="4" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="1"/>
        <text x="12" y="18" class="math-txt" fill="#1E40AF">C(x,y) = S_{≥0.5 ha}(ΔB_{t0→tcur}) ⊗ Ω_{legal}(x,y)</text>
      </g>

      <!-- 3 Layers Breakdown -->
      <g transform="translate(10, 68)">
        <rect x="0" y="0" width="390" height="64" rx="4" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
        <text x="8" y="13" class="box-desc" font-weight="700">• Layer 1 (Spatial/Spectral):</text>
        <text x="146" y="13" class="box-desc" fill="#475569">JRC GFC2020 10m + S1 RADD SAR C-band fusion</text>
        <text x="8" y="27" class="box-desc" font-weight="700">• Layer 2 (Temporal Trajectory):</text>
        <text x="156" y="27" class="box-desc" fill="#475569">t0 (2000) → tcutoff (2020) → tcur (2025) dynamics</text>
        <text x="8" y="41" class="box-desc" font-weight="700">• Layer 3 (Statutory Ontology):</text>
        <text x="152" y="41" class="box-desc" fill="#475569">Ωlegal ∈ {Forest, Tree-Crop, Planted, Other}</text>
        <text x="8" y="55" class="box-desc" font-weight="700">• Morphological Filter:</text>
        <text x="114" y="55" class="box-desc" fill="#475569">3×3 Moore Sieve filters speckle &lt; 0.5 ha (Art. 2(4))</text>
      </g>

      <!-- 4-Class Output Chips -->
      <g transform="translate(10, 138)">
        <rect x="0" y="0" width="390" height="48" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
        <text x="8" y="12" class="box-title" font-size="8.5px" fill="#0F172A">4-CLASS DISCRETE CLASSIFIED OUTPUT RASTER:</text>
        
        <g transform="translate(6, 18)">
          <rect x="0" y="0" width="88" height="22" rx="3" fill="#ECFDF5" stroke="#10B981" stroke-width="1"/>
          <circle cx="8" cy="11" r="4" fill="#10B981"/>
          <text x="16" y="10" class="badge-txt" fill="#065F46">CLEAN</text>
          <text x="16" y="18" class="meta" font-size="6.8px" fill="#047857">TRACES Box 44</text>
        </g>
        <g transform="translate(98, 18)">
          <rect x="0" y="0" width="94" height="22" rx="3" fill="#FFFBEB" stroke="#F59E0B" stroke-width="1"/>
          <circle cx="8" cy="11" r="4" fill="#F59E0B"/>
          <text x="16" y="10" class="badge-txt" fill="#92400E">REPLANTING</text>
          <text x="16" y="18" class="meta" font-size="6.8px" fill="#B45309">Art. 2(5) Lawful</text>
        </g>
        <g transform="translate(196, 18)">
          <rect x="0" y="0" width="94" height="22" rx="3" fill="#EFF6FF" stroke="#3B82F6" stroke-width="1"/>
          <circle cx="8" cy="11" r="4" fill="#3B82F6"/>
          <text x="16" y="10" class="badge-txt" fill="#1E40AF">SILVICULTURE</text>
          <text x="16" y="18" class="meta" font-size="6.8px" fill="#2563EB">Art. 2(7) Lawful</text>
        </g>
        <g transform="translate(294, 18)">
          <rect x="0" y="0" width="90" height="22" rx="3" fill="#FEF2F2" stroke="#EF4444" stroke-width="1"/>
          <circle cx="8" cy="11" r="4" fill="#EF4444"/>
          <text x="16" y="10" class="badge-txt" fill="#991B1B">VIOLATION</text>
          <text x="16" y="18" class="meta" font-size="6.8px" fill="#DC2626">Art. 3(a) Block</text>
        </g>
      </g>
    </g>

    <!-- Pillar 2: Autonomous Multi-Agent Constellation (Figure 3) -->
    <g transform="translate(436, 30)">
      <rect x="0" y="0" width="370" height="194" rx="6" fill="url(#grad-agent)" stroke="#C084FC" stroke-width="1.3"/>
      
      <!-- Badge -->
      <g transform="translate(10, 10)">
        <rect x="0" y="0" width="140" height="18" rx="3" fill="#7C3AED"/>
        <text x="70" y="12" text-anchor="middle" class="badge-txt" fill="#FFFFFF">CORE ENGINE B (FIG. 3)</text>
      </g>
      <text x="160" y="23" class="box-title" font-size="11.5px">6-Subagent Consensus Core</text>

      <!-- 6 Agents Micro-Grid -->
      <g transform="translate(10, 36)">
        <!-- Row 1 -->
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="170" height="38" rx="4" fill="#FFFFFF" stroke="#E9D5FF" stroke-width="1"/>
          <text x="8" y="14" class="box-title" font-size="9px" fill="#6B21A8">A1. Ingest &amp; Topology</text>
          <text x="8" y="28" class="box-desc" font-size="8px">Boundary RFC 7946 &amp; Area</text>
        </g>
        <g transform="translate(180, 0)">
          <rect x="0" y="0" width="170" height="38" rx="4" fill="#FFFFFF" stroke="#E9D5FF" stroke-width="1"/>
          <text x="8" y="14" class="box-title" font-size="9px" fill="#6B21A8">A2. Multi-Temporal Loss</text>
          <text x="8" y="28" class="box-desc" font-size="8px">Hansen v1.13 (2021–2025)</text>
        </g>
        <!-- Row 2 -->
        <g transform="translate(0, 44)">
          <rect x="0" y="0" width="170" height="38" rx="4" fill="#FFFFFF" stroke="#E9D5FF" stroke-width="1"/>
          <text x="8" y="14" class="box-title" font-size="9px" fill="#6B21A8">A3. Statutory Baseline</text>
          <text x="8" y="28" class="box-desc" font-size="8px">EC JRC GFC2020 &amp; ForTy 10m</text>
        </g>
        <g transform="translate(180, 44)">
          <rect x="0" y="0" width="170" height="38" rx="4" fill="#FFFFFF" stroke="#E9D5FF" stroke-width="1"/>
          <text x="8" y="14" class="box-title" font-size="9px" fill="#6B21A8">A4. SAR Radar &amp; Crop</text>
          <text x="8" y="28" class="box-desc" font-size="8px">Sentinel-1 RADD &amp; FDP 10m</text>
        </g>
        <!-- Row 3 -->
        <g transform="translate(0, 88)">
          <rect x="0" y="0" width="170" height="38" rx="4" fill="#FFFFFF" stroke="#E9D5FF" stroke-width="1"/>
          <text x="8" y="14" class="box-title" font-size="9px" fill="#6B21A8">A5. Protected Legality</text>
          <text x="8" y="28" class="box-desc" font-size="8px">WDPA IUCN I–VI &amp; 8 Domains</text>
        </g>
        <g transform="translate(180, 88)">
          <rect x="0" y="0" width="170" height="38" rx="4" fill="#FFFFFF" stroke="#E9D5FF" stroke-width="1"/>
          <text x="8" y="14" class="box-title" font-size="9px" fill="#6B21A8">A6. Consensus Arbiter</text>
          <text x="8" y="28" class="box-desc" font-size="8px">Multi-Agent Statutory Verdict</text>
        </g>
      </g>

      <!-- Anti-Hallucination Guard Banner -->
      <g transform="translate(10, 168)">
        <rect x="0" y="0" width="350" height="18" rx="3" fill="#FAF5FF" stroke="#D8B4FE" stroke-width="1"/>
        <text x="175" y="12" text-anchor="middle" class="meta" font-size="8px" fill="#6B21A8">ZERO-HALLUCINATION GATING: HARD STATUTORY OVERRIDES APPLY</text>
      </g>
    </g>

    <!-- Pillar 3: May 2026 Carve-Out & Yield Governor -->
    <g transform="translate(818, 30)">
      <rect x="0" y="0" width="284" height="194" rx="6" fill="url(#grad-carve)" stroke="#FDE68A" stroke-width="1.3"/>
      
      <!-- Badge -->
      <g transform="translate(10, 10)">
        <rect x="0" y="0" width="130" height="18" rx="3" fill="#D97706"/>
        <text x="65" y="12" text-anchor="middle" class="badge-txt" fill="#FFFFFF">MASS-BALANCE CORE</text>
      </g>
      <text x="148" y="23" class="box-title" font-size="11px">May 2026 Segregation</text>

      <!-- Carve-out Formula -->
      <g transform="translate(10, 36)">
        <rect x="0" y="0" width="264" height="42" rx="4" fill="#FFFFFF" stroke="#FDE68A" stroke-width="1"/>
        <text x="8" y="15" class="box-title" font-size="8.5px" fill="#92400E">VECTOR CARVE-OUT FORMULA:</text>
        <text x="8" y="32" class="math-txt" font-size="10.5px" fill="#B45309">P_export = P_declared \ V_{3(a)}</text>
      </g>

      <!-- Agronomic Yield Governor -->
      <g transform="translate(10, 84)">
        <rect x="0" y="0" width="264" height="52" rx="4" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
        <text x="8" y="13" class="box-title" font-size="8.5px" fill="#0F172A">AGRONOMIC CEILING GOVERNOR:</text>
        <text x="8" y="27" class="box-desc">• M_max = P_export × Ceiling(Crop)</text>
        <text x="8" y="39" class="box-desc">• Cocoa: 1100 kg/ha · Coffee: 2500 kg/ha</text>
        <text x="8" y="49" class="box-desc" fill="#DC2626" font-weight="600">Prevents laundering from violation patch</text>
      </g>

      <!-- Actionable Remediation -->
      <g transform="translate(10, 142)">
        <rect x="0" y="0" width="264" height="44" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
        <text x="8" y="14" class="box-title" font-size="8.5px" fill="#16A34A">DUAL STATUTORY OUTPUTS:</text>
        <text x="8" y="27" class="box-desc">1. Certified Clean Hectares → TRACES NT</text>
        <text x="8" y="38" class="box-desc">2. Quarantined Zone (V3a) → Remediation</text>
      </g>
    </g>
  </g>

  <!-- Flow Connector Tier 3 -> Tier 4 -->
  <g transform="translate(580, 584)">
    <line x1="0" y1="0" x2="0" y2="16" stroke="#16A34A" stroke-width="1.8" marker-end="url(#arrow-green)"/>
    <rect x="-105" y="1" width="210" height="14" rx="3" fill="#FFFFFF" stroke="#86EFAC" stroke-width="1"/>
    <text x="0" y="11" text-anchor="middle" class="bus-lbl" fill="#16A34A">SOVEREIGN AUDIT TRAIL &amp; PROVENANCE</text>
  </g>

  <!-- =========================================================================
       TIER 4: CRYPTOGRAPHIC INTEGRITY & REGULATORY DELIVERY
       ========================================================================= -->
  <g transform="translate(32, 604)">
    <!-- Container -->
    <rect x="0" y="0" width="1116" height="114" rx="6" fill="#FAFAFA" stroke="#E2E8F0" stroke-width="1"/>
    <!-- Header -->
    <rect x="0" y="0" width="1116" height="24" rx="6" fill="#F1F5F9"/>
    <rect x="0" y="14" width="1116" height="10" fill="#F1F5F9"/>
    <text x="12" y="16" class="tier-title"><tspan class="tier-num">TIER 4</tspan> &nbsp;·&nbsp; Cryptographic Verification, Interactive Analytics &amp; Sovereign TRACES NT Delivery</text>
    <text x="968" y="16" class="meta">REGULATORY AUDIT READY</text>

    <!-- 4 Delivery Targets -->
    <!-- Target 1: Cryptographic Provenance -->
    <g transform="translate(14, 32)">
      <rect x="0" y="0" width="260" height="70" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <circle cx="20" cy="35" r="12" fill="#F1F5F9" stroke="#64748B" stroke-width="1.2"/>
      <path d="M16 35 L20 31 L24 35 L20 39 Z" fill="#475569"/>
      <text x="40" y="20" class="box-title">SHA-256 Merkle Provenance</text>
      <text x="40" y="34" class="box-desc">Immutable hash of 3D spatial tensor,</text>
      <text x="40" y="46" class="box-desc">exact pixel coordinates &amp; statutory rules.</text>
      <text x="40" y="58" class="meta" font-size="7.5px" fill="#2563EB">730567f7...2f29f5</text>
    </g>

    <!-- Target 2: Interactive Deck (MapLibre) -->
    <g transform="translate(288, 32)">
      <rect x="0" y="0" width="260" height="70" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <circle cx="20" cy="35" r="12" fill="#EFF6FF" stroke="#3B82F6" stroke-width="1.2"/>
      <rect x="15" y="30" width="10" height="10" fill="none" stroke="#2563EB" stroke-width="1.4"/>
      <text x="40" y="20" class="box-title">Spatial Analytics Deck</text>
      <text x="40" y="34" class="box-desc">MapLibre GL JS interactive 3D map,</text>
      <text x="40" y="46" class="box-desc">layer drag-and-drop, pixel inspector,</text>
      <text x="40" y="58" class="box-desc" fill="#2563EB">25-year trajectory milestone charts.</text>
    </g>

    <!-- Target 3: TRACES NT DDS -->
    <g transform="translate(562, 32)">
      <rect x="0" y="0" width="260" height="70" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <circle cx="20" cy="35" r="12" fill="#ECFDF5" stroke="#10B981" stroke-width="1.2"/>
      <path d="M16 35 L19 38 L25 32" fill="none" stroke="#059669" stroke-width="1.6"/>
      <text x="40" y="20" class="box-title">TRACES NT XML/JSON DDS</text>
      <text x="40" y="34" class="box-desc">Official Due Diligence Statement,</text>
      <text x="40" y="46" class="box-desc">direct schema for European Commission</text>
      <text x="40" y="58" class="box-desc" fill="#059669" font-weight="600">Customs Box 44 (Code C716).</text>
    </g>

    <!-- Target 4: Sovereign Audit Dossier -->
    <g transform="translate(836, 32)">
      <rect x="0" y="0" width="266" height="70" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <circle cx="20" cy="35" r="12" fill="#FAF5FF" stroke="#8B5CF6" stroke-width="1.2"/>
      <path d="M15 30 L25 30 M15 35 L25 35 M15 40 L21 40" stroke="#7C3AED" stroke-width="1.4"/>
      <text x="40" y="20" class="box-title">Sovereign Audit Dossier (.zip)</text>
      <text x="40" y="34" class="box-desc">Complete legal defense packet:</text>
      <text x="40" y="46" class="box-desc">Rebuttal memo, vector carve-out GeoJSON,</text>
      <text x="40" y="58" class="box-desc" fill="#7C3AED" font-weight="600">Satellite tiles &amp; Competent Authority memo.</text>
    </g>
  </g>

  <!-- =========================================================================
       FOOTER / ACADEMIC CAPTION
       ========================================================================= -->
  <g transform="translate(32, 730)">
    <text x="0" y="0" class="meta" font-size="8.5px" fill="#64748B">
      <tspan x="0" dy="0"><tspan font-weight="700" fill="#334155">Figure 1. Full-system dataflow and architectural topology</tspan> of the Oxeous autonomous spatial intelligence framework for statutory EUDR verification under Reg. (EU) 2023/1115.</tspan>
      <tspan x="0" dy="12">Tier 1 validates vector plot topology; Tier 2 ingests 8 Earth observation streams; Tier 3 computes the tri-axial PWRI-3D tensor (Fig. 2) and runs 6-agent consensus (Fig. 3); Tier 4 generates verifiable TRACES NT DDS with Merkle proof.</tspan>
    </text>
  </g>
</svg>
`;

// HTML Wrapper with interactive controls
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figure 1: Oxeous Earth Agent Architecture &amp; System Pipeline</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      background: #F1F5F9;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: 'Inter', sans-serif;
    }
    .top-bar {
      width: 100%;
      max-width: 1180px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 10px 18px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .btn {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      color: #0F172A;
      transition: all 0.15s;
    }
    .btn:hover { background: #F8FAFC; border-color: #94A3B8; }
    .btn-primary { background: #0F172A; color: #FFFFFF; border-color: #0F172A; }
    .btn-primary:hover { background: #1E293B; }
    .canvas-card {
      background: #FFFFFF;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      overflow: hidden;
      max-width: 1180px;
      width: 100%;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div style="display:flex; align-items:center; gap:12px;">
      <span style="font-weight:700; font-size:13px; color:#0F172A;">Figure 1: Full System Overview Pipeline</span>
      <span style="font-family:'JetBrains Mono'; font-size:10px; background:#EFF6FF; color:#1D4ED8; padding:2px 8px; border-radius:12px; font-weight:600;">OFFICIAL MASTER FIGURE</span>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <a class="btn" href="Figure_2_PWRI_3D_Map_Algebra.html" style="border-color:#3B82F6; color:#2563EB;">Figure 2: PWRI-3D</a>
      <a class="btn" href="Figure_3_Multi_Agent_Architecture.html" style="border-color:#8B5CF6; color:#7C3AED;">Figure 3: Agents</a>
      <button class="btn btn-primary" onclick="window.print()">Print / Export PDF</button>
    </div>
  </div>

  <div class="canvas-card">
    ${svgContent}
  </div>
</body>
</html>
`;

(async () => {
  console.log('Writing Figure_1_Full_System_Pipeline.svg and .html...');
  const finalsDir = path.join(__dirname);
  const svgPath = path.join(finalsDir, 'Figure_1_Full_System_Pipeline.svg');
  const htmlPath = path.join(finalsDir, 'Figure_1_Full_System_Pipeline.html');
  const pngPath = path.join(finalsDir, 'Figure_1_Full_System_Pipeline.png');
  const pdfPath = path.join(finalsDir, 'Figure_1_Full_System_Pipeline.pdf');

  fs.writeFileSync(svgPath, svgContent.trim());
  fs.writeFileSync(htmlPath, htmlContent.trim());

  console.log('Launching headless browser for 600 DPI rendering...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 3 });

  await page.setContent(svgContent);
  await page.waitForTimeout(500);

  console.log('Saving high-resolution PNG...');
  await page.screenshot({ path: pngPath, omitBackground: false });

  console.log('Saving vector PDF...');
  await page.pdf({
    path: pdfPath,
    width: W + 'px',
    height: H + 'px',
    printBackground: true,
    pageRanges: '1'
  });

  await browser.close();
  console.log('Figure 1 generation completed successfully!');
  console.log('Generated files:');
  console.log(' -', svgPath);
  console.log(' -', htmlPath);
  console.log(' -', pngPath);
  console.log(' -', pdfPath);
})();
