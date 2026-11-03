const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const W = 1380;
const H = 740;

// SVG Definition
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#ffffff; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <style>
      .main-title { font-weight: 800; font-size: 18px; fill: #0F172A; letter-spacing: -0.02em; }
      .main-sub { font-size: 11px; fill: #475569; font-weight: 400; }
      .mono-meta { font-family: 'JetBrains Mono', monospace; font-size: 9px; fill: #64748B; font-weight: 600; }
      .stage-hdr { font-weight: 800; font-size: 10px; fill: #0F172A; text-transform: uppercase; letter-spacing: 0.08em; }
      .stage-idx { font-family: 'JetBrains Mono', monospace; font-weight: 800; font-size: 10.5px; }
      .card-title { font-weight: 700; font-size: 10.5px; fill: #0F172A; }
      .card-sub { font-size: 8.5px; fill: #475569; }
      .math-eq { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; fill: #1E3A8A; }
      .badge-txt { font-weight: 700; font-size: 8px; letter-spacing: 0.03em; }
      .cube-lbl { font-weight: 700; font-size: 9px; }
      .cube-sub { font-size: 7.5px; fill: #64748B; }
      .chip-txt { font-family: 'JetBrains Mono', monospace; font-size: 7.5px; font-weight: 600; }
    </style>

    <!-- Gradients -->
    <linearGradient id="iso-slice-4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FAF5FF" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#EDE9FE" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="iso-slice-3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#FEF3C7" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="iso-slice-2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF2F2" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#FEE2E2" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="iso-slice-1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F0FDF4" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#DCFCE7" stop-opacity="0.95"/>
    </linearGradient>

    <!-- Markers -->
    <marker id="arr-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563EB"/>
    </marker>
    <marker id="arr-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669"/>
    </marker>
    <marker id="arr-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#7C3AED"/>
    </marker>
  </defs>

  <!-- Outer Frame -->
  <rect x="10" y="10" width="1360" height="720" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>

  <!-- =========================================================================
       HEADER
       ========================================================================= -->
  <g transform="translate(26, 26)">
    <text x="0" y="16" class="main-title">Figure 1 | Autonomous Spatial Intelligence Pipeline for Statutory EUDR Verification</text>
    <text x="0" y="32" class="main-sub">End-to-end dataflow: multi-modal ingestion, Annex I commodity calibration, 8-sensor EO 3D cube, tri-axial PWRI-3D map algebra, multi-agent consensus, and TRACES NT delivery.</text>
    
    <g transform="translate(980, -2)">
      <rect x="0" y="0" width="354" height="38" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
      <text x="12" y="15" class="mono-meta" fill="#0F172A">STANDARD: REGULATION (EU) 2023/1115</text>
      <text x="12" y="28" class="mono-meta" fill="#64748B">TARIC BOX 44 C716 · LATENCY: &lt; 20s · 10m GRID</text>
    </g>
  </g>

  <!-- =========================================================================
       STAGE 1: MULTI-MODAL INGESTION & COMMODITY MATRIX (x=24, width=294)
       ========================================================================= -->
  <g transform="translate(24, 76)">
    <!-- Stage Card -->
    <rect x="0" y="0" width="294" height="594" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.2"/>
    
    <!-- Stage Header -->
    <rect x="0" y="0" width="294" height="28" rx="8" fill="#F1F5F9"/>
    <rect x="0" y="18" width="294" height="10" fill="#F1F5F9"/>
    <text x="12" y="18" class="stage-hdr"><tspan class="stage-idx" fill="#2563EB">01</tspan> &nbsp;·&nbsp; Ingestion &amp; Commodity Matrix</text>

    <!-- Visual 1: Vector AOI Plot with Satellite Texture & Vertices -->
    <g transform="translate(12, 38)">
      <rect x="0" y="0" width="270" height="136" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      
      <!-- Simulated Satellite Terrain Background -->
      <path d="M 8 8 L 262 8 L 262 128 L 8 128 Z" fill="#F1F5F9" opacity="0.6"/>
      <path d="M 20 40 Q 90 10 160 50 T 250 80" fill="none" stroke="#E2E8F0" stroke-width="1.4" stroke-dasharray="3 3"/>
      <path d="M 20 80 Q 80 60 150 100 T 250 120" fill="none" stroke="#E2E8F0" stroke-width="1.4" stroke-dasharray="3 3"/>
      
      <!-- Actual Cadastral Polygon -->
      <polygon points="40,30 210,22 230,105 75,115" fill="#3B82F6" fill-opacity="0.12" stroke="#2563EB" stroke-width="2"/>
      
      <!-- Polygon Vertices -->
      <circle cx="40" cy="30" r="3.5" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.5"/>
      <circle cx="210" cy="22" r="3.5" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.5"/>
      <circle cx="230" cy="100" r="3.5" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.5"/>
      <circle cx="75" cy="110" r="3.5" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.5"/>
      
      <text x="46" y="27" class="mono-meta" font-size="7px" fill="#1E3A8A">P1 (λ1, φ1)</text>
      <text x="170" y="19" class="mono-meta" font-size="7px" fill="#1E3A8A">P2 (λ2, φ2)</text>
      <text x="180" y="112" class="mono-meta" font-size="7px" fill="#1E3A8A">P3 (λ3, φ3)</text>
      <text x="24" y="112" class="mono-meta" font-size="7px" fill="#1E3A8A">P4 (λ4, φ4)</text>

      <!-- Center Badge -->
      <rect x="95" y="55" width="86" height="18" rx="3" fill="#FFFFFF" stroke="#93C5FD" stroke-width="1"/>
      <text x="138" y="68" text-anchor="middle" class="mono-meta" font-size="8px" fill="#2563EB">367.2 HECTARES</text>

      <text x="135" y="126" text-anchor="middle" class="mono-meta" font-size="7px" fill="#64748B">EPSG:4326 · RFC 7946 GeoJSON</text>
    </g>

    <!-- Visual 2: Geodesic Ellipsoidal Area Integral -->
    <g transform="translate(12, 182)">
      <rect x="0" y="0" width="270" height="92" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <text x="10" y="16" class="card-title">Universal Geodesic Physics (WGS84)</text>

      <rect x="10" y="24" width="250" height="28" rx="3" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
      <text x="135" y="43" text-anchor="middle" class="math-eq" font-size="11.5px">A = ∬_P √(det(g)) dλ dφ</text>

      <g transform="translate(10, 60)">
        <text x="0" y="10" class="card-sub" font-weight="600">• Polsby-Popper:</text>
        <text x="80" y="10" class="mono-meta" font-size="7.5px" fill="#16A34A">PP ≥ 0.20 (No sliver)</text>
        <text x="0" y="22" class="card-sub" font-weight="600">• Ring Closure:</text>
        <text x="80" y="22" class="mono-meta" font-size="7.5px" fill="#16A34A">Strict Jordan curve verified</text>
      </g>
    </g>

    <!-- Visual 3: 7 ANNEX I COMMODITIES SELECTION MATRIX -->
    <g transform="translate(12, 282)">
      <rect x="0" y="0" width="270" height="210" rx="6" fill="#FFFFFF" stroke="#FDE68A" stroke-width="1.2"/>
      
      <rect x="0" y="0" width="270" height="20" rx="6" fill="#FEF3C7"/>
      <rect x="0" y="12" width="270" height="8" fill="#FEF3C7"/>
      <text x="10" y="14" class="card-title" font-size="9px" fill="#92400E">EUDR ANNEX I COMMODITY SELECTION</text>

      <!-- 7 Commodity Chips Grid -->
      <g transform="translate(10, 26)">
        <!-- Active Commodity: Cocoa -->
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="250" height="24" rx="4" fill="#FEF3C7" stroke="#D97706" stroke-width="1.3"/>
          <circle cx="12" cy="12" r="3.5" fill="#D97706"/>
          <text x="22" y="15" class="chip-txt" fill="#92400E" font-weight="700">COCOA (Theobroma cacao) · HS 1801 [ACTIVE]</text>
        </g>

        <!-- Row 2: Coffee & Palm Oil -->
        <g transform="translate(0, 28)">
          <rect x="0" y="0" width="122" height="22" rx="3" fill="#F8FAFC" stroke="#CBD5E1"/>
          <text x="8" y="14" class="chip-txt" fill="#334155">COFFEE · HS 0901</text>
        </g>
        <g transform="translate(128, 28)">
          <rect x="0" y="0" width="122" height="22" rx="3" fill="#F8FAFC" stroke="#CBD5E1"/>
          <text x="8" y="14" class="chip-txt" fill="#334155">OIL PALM · HS 1511</text>
        </g>

        <!-- Row 3: Rubber & Soya -->
        <g transform="translate(0, 54)">
          <rect x="0" y="0" width="122" height="22" rx="3" fill="#F8FAFC" stroke="#CBD5E1"/>
          <text x="8" y="14" class="chip-txt" fill="#334155">RUBBER · HS 4001</text>
        </g>
        <g transform="translate(128, 54)">
          <rect x="0" y="0" width="122" height="22" rx="3" fill="#F8FAFC" stroke="#CBD5E1"/>
          <text x="8" y="14" class="chip-txt" fill="#334155">SOYA · HS 1201</text>
        </g>

        <!-- Row 4: Wood & Cattle -->
        <g transform="translate(0, 80)">
          <rect x="0" y="0" width="122" height="22" rx="3" fill="#F8FAFC" stroke="#CBD5E1"/>
          <text x="8" y="14" class="chip-txt" fill="#334155">WOOD · HS 4403</text>
        </g>
        <g transform="translate(128, 80)">
          <rect x="0" y="0" width="122" height="22" rx="3" fill="#F8FAFC" stroke="#CBD5E1"/>
          <text x="8" y="14" class="chip-txt" fill="#334155">CATTLE · HS 0102</text>
        </g>
      </g>

      <!-- Selected Commodity Configuration Profile -->
      <g transform="translate(10, 142)">
        <rect x="0" y="0" width="250" height="58" rx="4" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1"/>
        <text x="8" y="14" class="mono-meta" font-size="7.5px" fill="#92400E">ACTIVE BIOPHYSICAL CONFIGURATION:</text>
        <text x="8" y="27" class="card-sub" font-size="7.5px">• Model: Google FDP 10m Agroforestry Multi-Spectral</text>
        <text x="8" y="39" class="card-sub" font-size="7.5px">• Agronomic Yield Ceiling: 1,100 kg/ha max</text>
        <text x="8" y="51" class="card-sub" font-size="7.5px">• Statutory Rule: Art. 2(5) Replanting Exemption</text>
      </g>
    </g>

    <!-- Visual 4: Declared Batch Mass & Sovereign Centroid -->
    <g transform="translate(12, 500)">
      <rect x="0" y="0" width="270" height="82" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <g transform="translate(10, 10)">
        <text x="0" y="12" class="mono-meta" font-size="7.5px" fill="#475569">DECLARED BATCH MASS:</text>
        <text x="0" y="26" class="card-title" font-size="10.5px" fill="#0F172A">M_declared = 142,500 kg (Raw Beans)</text>
        
        <text x="0" y="44" class="mono-meta" font-size="7.5px" fill="#166534">SOVEREIGN JURISDICTION &amp; BIOME:</text>
        <text x="0" y="58" class="card-title" font-size="10.5px" fill="#15803D">Côte d'Ivoire (CI) · Guinean Rainforest</text>
      </g>
    </g>
  </g>

  <!-- Flow Connector Stage 1 -> Stage 2 -->
  <g transform="translate(322, 360)">
    <line x1="0" y1="0" x2="16" y2="0" stroke="#2563EB" stroke-width="2" marker-end="url(#arr-blue)"/>
  </g>

  <!-- =========================================================================
       STAGE 2: 8-SENSOR EARTH OBSERVATION 3D DATA CUBE (x=342, width=324)
       ========================================================================= -->
  <g transform="translate(342, 76)">
    <!-- Stage Card -->
    <rect x="0" y="0" width="324" height="594" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.2"/>
    
    <!-- Stage Header -->
    <rect x="0" y="0" width="324" height="28" rx="8" fill="#F1F5F9"/>
    <rect x="0" y="18" width="324" height="10" fill="#F1F5F9"/>
    <text x="12" y="18" class="stage-hdr"><tspan class="stage-idx" fill="#7C3AED">02</tspan> &nbsp;·&nbsp; Heterogeneous EO 3D Data Cube</text>

    <!-- The 3D Isometric Stack of Data Slabs -->
    <!-- SLAB 4: Cadastre & Protected Areas (Top, y=55) -->
    <g transform="translate(22, 54)">
      <polygon points="140,0 270,30 140,60 10,30" fill="url(#iso-slice-4)" stroke="#8B5CF6" stroke-width="1.5"/>
      <line x1="75" y1="15" x2="205" y2="45" stroke="#DDD6FE" stroke-width="1"/>
      <line x1="107" y1="8" x2="237" y2="38" stroke="#DDD6FE" stroke-width="1"/>
      <line x1="75" y1="45" x2="205" y2="15" stroke="#DDD6FE" stroke-width="1"/>
      <polygon points="125,20 175,28 160,46 100,36" fill="#C4B5FD" fill-opacity="0.4" stroke="#7C3AED" stroke-width="1.2" stroke-dasharray="2 2"/>
      
      <g transform="translate(10, 68)">
        <circle cx="6" cy="6" r="4" fill="#7C3AED"/>
        <text x="16" y="9" class="cube-lbl" fill="#5B21B6">Slice 4: Sovereign Cadastre &amp; Reserves</text>
        <text x="16" y="21" class="cube-sub">UNEP-WCMC WDPA (IUCN I–VI) · Strict National Parks</text>
      </g>
    </g>

    <!-- SLAB 3: Commodity & Biophysical Models (Upper-Mid, y=172) -->
    <g transform="translate(22, 172)">
      <polygon points="140,0 270,30 140,60 10,30" fill="url(#iso-slice-3)" stroke="#F59E0B" stroke-width="1.5"/>
      <line x1="75" y1="15" x2="205" y2="45" stroke="#FDE68A" stroke-width="1"/>
      <line x1="107" y1="8" x2="237" y2="38" stroke="#FDE68A" stroke-width="1"/>
      <line x1="75" y1="45" x2="205" y2="15" stroke="#FDE68A" stroke-width="1"/>
      <!-- Crop Model Clusters -->
      <rect x="115" y="22" width="26" height="12" rx="2" fill="#FBBF24" fill-opacity="0.5" stroke="#D97706" stroke-width="1"/>
      
      <g transform="translate(10, 68)">
        <circle cx="6" cy="6" r="4" fill="#F59E0B"/>
        <text x="16" y="9" class="cube-lbl" fill="#92400E">Slice 3: Commodity Biophysical Model (Cocoa)</text>
        <text x="16" y="21" class="cube-sub">Google FDP 2026a (10m) · Forest Typology · DEM Slope</text>
      </g>
    </g>

    <!-- SLAB 2: Dynamic Disturbance SAR Radar & Optical (Lower-Mid, y=290) -->
    <g transform="translate(22, 290)">
      <polygon points="140,0 270,30 140,60 10,30" fill="url(#iso-slice-2)" stroke="#EF4444" stroke-width="1.5"/>
      <line x1="75" y1="15" x2="205" y2="45" stroke="#FECACA" stroke-width="1"/>
      <line x1="107" y1="8" x2="237" y2="38" stroke="#FECACA" stroke-width="1"/>
      <line x1="75" y1="45" x2="205" y2="15" stroke="#FECACA" stroke-width="1"/>
      <polygon points="120,22 190,32 170,50 105,38" fill="#EF4444" fill-opacity="0.6" stroke="#DC2626" stroke-width="1.5"/>
      
      <!-- Stylized Radar Pulse Waves -->
      <path d="M 45 18 Q 53 10 61 18" fill="none" stroke="#DC2626" stroke-width="1.4"/>
      <path d="M 41 14 Q 53 4 65 14" fill="none" stroke="#DC2626" stroke-width="1.4"/>

      <g transform="translate(10, 68)">
        <circle cx="6" cy="6" r="4" fill="#EF4444"/>
        <text x="16" y="9" class="cube-lbl" fill="#991B1B">Slice 2: Disturbance (SAR Radar &amp; Optical)</text>
        <text x="16" y="21" class="cube-sub">Sentinel-1 RADD SAR C-band (10m) · Hansen v1.13 (30m)</text>
      </g>
    </g>

    <!-- SLAB 1: Statutory Cutoff Forest Baseline (Bottom, y=408) -->
    <g transform="translate(22, 408)">
      <polygon points="140,0 270,30 140,60 10,30" fill="url(#iso-slice-1)" stroke="#16A34A" stroke-width="1.5"/>
      <line x1="75" y1="15" x2="205" y2="45" stroke="#BBF7D0" stroke-width="1"/>
      <line x1="107" y1="8" x2="237" y2="38" stroke="#BBF7D0" stroke-width="1"/>
      <line x1="75" y1="45" x2="205" y2="15" stroke="#BBF7D0" stroke-width="1"/>
      <polygon points="40,30 140,10 240,30 140,50" fill="#22C55E" fill-opacity="0.3" stroke="#16A34A" stroke-width="1"/>
      
      <g transform="translate(10, 68)">
        <circle cx="6" cy="6" r="4" fill="#16A34A"/>
        <text x="16" y="9" class="cube-lbl" fill="#166534">Slice 1: Statutory Cutoff Baseline (Dec 31, 2020)</text>
        <text x="16" y="21" class="cube-sub">EC JRC GFC2020 V4 (10m) · Nature Trace S2 (10m)</text>
      </g>
    </g>

    <!-- 3D Coordinate Axis Legend -->
    <g transform="translate(26, 542)">
      <line x1="0" y1="20" x2="30" y2="28" stroke="#475569" stroke-width="1.4" marker-end="url(#arr-blue)"/>
      <line x1="0" y1="20" x2="0" y2="0" stroke="#475569" stroke-width="1.4" marker-end="url(#arr-purple)"/>
      <text x="36" y="32" class="mono-meta" font-size="7.5px">X, Y (10m)</text>
      <text x="4" y="-3" class="mono-meta" font-size="7.5px">Time (2000→2026)</text>
    </g>
  </g>

  <!-- Flow Connector Stage 2 -> Stage 3 -->
  <g transform="translate(670, 360)">
    <line x1="0" y1="0" x2="16" y2="0" stroke="#7C3AED" stroke-width="2" marker-end="url(#arr-purple)"/>
  </g>

  <!-- =========================================================================
       STAGE 3: PWRI-3D & AGENT CONSENSUS CORE (x=690, width=330)
       ========================================================================= -->
  <g transform="translate(690, 76)">
    <!-- Stage Card -->
    <rect x="0" y="0" width="330" height="594" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.2"/>
    
    <!-- Stage Header -->
    <rect x="0" y="0" width="330" height="28" rx="8" fill="#F1F5F9"/>
    <rect x="0" y="18" width="330" height="10" fill="#F1F5F9"/>
    <text x="12" y="18" class="stage-hdr"><tspan class="stage-idx" fill="#2563EB">03</tspan> &nbsp;·&nbsp; Deep-Tech Adjudication Core</text>

    <!-- Sub-Module 3A: PWRI-3D Map Algebra Equation -->
    <g transform="translate(12, 38)">
      <rect x="0" y="0" width="306" height="102" rx="6" fill="#FFFFFF" stroke="#93C5FD" stroke-width="1.2"/>
      
      <rect x="0" y="0" width="306" height="20" rx="6" fill="#EFF6FF"/>
      <rect x="0" y="12" width="306" height="8" fill="#EFF6FF"/>
      <text x="10" y="14" class="card-title" font-size="9.5px" fill="#1E40AF">CORE A: PWRI-3D TRI-AXIAL MAP ALGEBRA (FIG. 2)</text>

      <!-- Prominent Formula -->
      <rect x="10" y="28" width="286" height="34" rx="4" fill="#F8FAFC" stroke="#BFDBFE" stroke-width="1"/>
      <text x="153" y="50" text-anchor="middle" class="math-eq" font-size="12px">C(x,y) = S_{≥0.5 ha}(ΔB) ⊗ Ω_{legal}</text>

      <text x="12" y="76" class="card-sub" font-size="8.5px">ΔB = [Loss_optical ∨ Radar_S1] ∧ [Canopy2000 ≥ 30%]</text>
      <text x="12" y="90" class="card-sub" font-size="8.5px">Ωlegal ∈ {Forest_2020, Tree-Crop, Planted, Other}</text>
    </g>

    <!-- Sub-Module 3B: Visual 3x3 Moore Neighborhood MMU Sieve -->
    <g transform="translate(12, 148)">
      <rect x="0" y="0" width="306" height="114" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      
      <text x="12" y="18" class="card-title" font-size="10.5px">FAO ≥ 0.5 ha Spatial Filter (Art. 2(4))</text>
      <text x="12" y="30" class="card-sub">Connected-component sieve purges sub-hectare sensor noise:</text>

      <!-- Left: Noise Pixel Rejected (< 6 neighbours) -->
      <g transform="translate(28, 42)">
        <rect x="0" y="0" width="18" height="18" fill="#F1F5F9" stroke="#CBD5E1"/>
        <rect x="18" y="0" width="18" height="18" fill="#F1F5F9" stroke="#CBD5E1"/>
        <rect x="36" y="0" width="18" height="18" fill="#F1F5F9" stroke="#CBD5E1"/>
        <rect x="0" y="18" width="18" height="18" fill="#F1F5F9" stroke="#CBD5E1"/>
        <rect x="18" y="18" width="18" height="18" fill="#FCA5A5" stroke="#EF4444"/>
        <rect x="36" y="18" width="18" height="18" fill="#F1F5F9" stroke="#CBD5E1"/>
        <rect x="0" y="36" width="18" height="18" fill="#F1F5F9" stroke="#CBD5E1"/>
        <rect x="18" y="36" width="18" height="18" fill="#F1F5F9" stroke="#CBD5E1"/>
        <rect x="36" y="36" width="18" height="18" fill="#F1F5F9" stroke="#CBD5E1"/>
        <text x="27" y="66" text-anchor="middle" class="mono-meta" font-size="7px" fill="#DC2626">SPECKLE &lt; 0.5 ha</text>
        <text x="27" y="74" text-anchor="middle" class="badge-txt" fill="#DC2626">PURGED [X]</text>
      </g>

      <!-- Right: Real Deforestation Patch Passed (≥ 6 connected) -->
      <g transform="translate(176, 42)">
        <rect x="0" y="0" width="18" height="18" fill="#FCA5A5" stroke="#EF4444"/>
        <rect x="18" y="0" width="18" height="18" fill="#FCA5A5" stroke="#EF4444"/>
        <rect x="36" y="0" width="18" height="18" fill="#FCA5A5" stroke="#EF4444"/>
        <rect x="0" y="18" width="18" height="18" fill="#FCA5A5" stroke="#EF4444"/>
        <rect x="18" y="18" width="18" height="18" fill="#DC2626" stroke="#991B1B"/>
        <rect x="36" y="18" width="18" height="18" fill="#FCA5A5" stroke="#EF4444"/>
        <rect x="0" y="36" width="18" height="18" fill="#FCA5A5" stroke="#EF4444"/>
        <rect x="18" y="36" width="18" height="18" fill="#FCA5A5" stroke="#EF4444"/>
        <rect x="36" y="36" width="18" height="18" fill="#F1F5F9" stroke="#CBD5E1"/>
        <text x="27" y="66" text-anchor="middle" class="mono-meta" font-size="7px" fill="#16A34A">CLUSTER ≥ 0.5 ha</text>
        <text x="27" y="74" text-anchor="middle" class="badge-txt" fill="#16A34A">PASSED [✓]</text>
      </g>
    </g>

    <!-- Sub-Module 3C: Autonomous Multi-Agent Consensus Constellation (Fig. 3) -->
    <g transform="translate(12, 270)">
      <rect x="0" y="0" width="306" height="236" rx="6" fill="#FAF5FF" stroke="#C084FC" stroke-width="1.2"/>
      
      <rect x="0" y="0" width="306" height="20" rx="6" fill="#F3E8FF"/>
      <rect x="0" y="12" width="306" height="8" fill="#F3E8FF"/>
      <text x="10" y="14" class="card-title" font-size="9.5px" fill="#6B21A8">CORE B: 6-SUBAGENT ARBITRATION (FIG. 3)</text>

      <g transform="translate(8, 26)">
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="140" height="34" rx="4" fill="#FFFFFF" stroke="#E9D5FF"/>
          <text x="8" y="14" class="mono-meta" font-size="7.5px" fill="#7C3AED">A1 · Geodesic Ingest</text>
          <text x="8" y="25" class="card-sub" font-size="7px">Topology &amp; Area Integral</text>
        </g>
        <g transform="translate(150, 0)">
          <rect x="0" y="0" width="140" height="34" rx="4" fill="#FFFFFF" stroke="#E9D5FF"/>
          <text x="8" y="14" class="mono-meta" font-size="7.5px" fill="#7C3AED">A2 · Optical Trajectory</text>
          <text x="8" y="25" class="card-sub" font-size="7px">Hansen GFC 2000–2025</text>
        </g>

        <g transform="translate(0, 42)">
          <rect x="0" y="0" width="140" height="34" rx="4" fill="#FFFFFF" stroke="#E9D5FF"/>
          <text x="8" y="14" class="mono-meta" font-size="7.5px" fill="#7C3AED">A3 · Baseline Forest</text>
          <text x="8" y="25" class="card-sub" font-size="7px">JRC GFC2020 V4 (10m)</text>
        </g>
        <g transform="translate(150, 42)">
          <rect x="0" y="0" width="140" height="34" rx="4" fill="#FFFFFF" stroke="#E9D5FF"/>
          <text x="8" y="14" class="mono-meta" font-size="7.5px" fill="#7C3AED">A4 · SAR Radar &amp; Crop</text>
          <text x="8" y="25" class="card-sub" font-size="7px">Sentinel-1 RADD &amp; FDP</text>
        </g>

        <g transform="translate(0, 84)">
          <rect x="0" y="0" width="140" height="34" rx="4" fill="#FFFFFF" stroke="#E9D5FF"/>
          <text x="8" y="14" class="mono-meta" font-size="7.5px" fill="#7C3AED">A5 · Sovereign Legality</text>
          <text x="8" y="25" class="card-sub" font-size="7px">WDPA IUCN I–VI Reserves</text>
        </g>
        <g transform="translate(150, 84)">
          <rect x="0" y="0" width="140" height="34" rx="4" fill="#FFFFFF" stroke="#E9D5FF"/>
          <text x="8" y="14" class="mono-meta" font-size="7.5px" fill="#7C3AED">A6 · Consensus Arbiter</text>
          <text x="8" y="25" class="card-sub" font-size="7px">Zero-Hallucination Gate</text>
        </g>
      </g>

      <line x1="78" y1="156" x2="153" y2="168" stroke="#7C3AED" stroke-width="1.2" stroke-dasharray="2 2"/>
      <line x1="228" y1="156" x2="153" y2="168" stroke="#7C3AED" stroke-width="1.2" stroke-dasharray="2 2"/>

      <rect x="10" y="174" width="286" height="52" rx="4" fill="#FFFFFF" stroke="#D8B4FE" stroke-width="1"/>
      <text x="153" y="190" text-anchor="middle" class="mono-meta" font-size="8px" fill="#6B21A8">ZERO-HALLUCINATION DETERMINISTIC GATING</text>
      <text x="153" y="204" text-anchor="middle" class="card-sub" font-size="7.5px" fill="#475569">• Hard legal axioms override probabilistic model predictions</text>
      <text x="153" y="216" text-anchor="middle" class="card-sub" font-size="7.5px" fill="#475569">• Mandatory statutory non-compliance if loss ≥ 0.5 ha in forest</text>
    </g>

    <!-- Discrete 4-Class Output Chips -->
    <g transform="translate(12, 514)">
      <rect x="0" y="0" width="306" height="68" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <text x="10" y="15" class="card-title" font-size="8.5px" fill="#0F172A">4-CLASS DISCRETE CLASSIFIED RASTER OUTPUT:</text>
      
      <g transform="translate(6, 26)">
        <rect x="0" y="0" width="70" height="32" rx="3" fill="#ECFDF5" stroke="#10B981"/>
        <circle cx="8" cy="11" r="3.5" fill="#10B981"/>
        <text x="15" y="13" class="badge-txt" fill="#065F46">CLEAN</text>
        <text x="15" y="25" class="mono-meta" font-size="7px" fill="#047857">Box 44 C716</text>
      </g>
      <g transform="translate(80, 26)">
        <rect x="0" y="0" width="70" height="32" rx="3" fill="#FFFBEB" stroke="#F59E0B"/>
        <circle cx="8" cy="11" r="3.5" fill="#F59E0B"/>
        <text x="15" y="13" class="badge-txt" fill="#92400E">REPLANT</text>
        <text x="15" y="25" class="mono-meta" font-size="7px" fill="#B45309">Art. 2(5)</text>
      </g>
      <g transform="translate(154, 26)">
        <rect x="0" y="0" width="72" height="32" rx="3" fill="#EFF6FF" stroke="#3B82F6"/>
        <circle cx="8" cy="11" r="3.5" fill="#3B82F6"/>
        <text x="15" y="13" class="badge-txt" fill="#1E40AF">SILVICULT.</text>
        <text x="15" y="25" class="mono-meta" font-size="7px" fill="#2563EB">Art. 2(7)</text>
      </g>
      <g transform="translate(230, 26)">
        <rect x="0" y="0" width="70" height="32" rx="3" fill="#FEF2F2" stroke="#EF4444"/>
        <circle cx="8" cy="11" r="3.5" fill="#EF4444"/>
        <text x="15" y="13" class="badge-txt" fill="#991B1B">VIOLATION</text>
        <text x="15" y="25" class="mono-meta" font-size="7px" fill="#DC2626">Art. 3(a)</text>
      </g>
    </g>
  </g>

  <!-- Flow Connector Stage 3 -> Stage 4 -->
  <g transform="translate(1026, 360)">
    <line x1="0" y1="0" x2="16" y2="0" stroke="#059669" stroke-width="2" marker-end="url(#arr-green)"/>
  </g>

  <!-- =========================================================================
       STAGE 4: FINAL OPERATIONAL MAP & REGULATORY VERDICT (x=1046, width=310)
       ========================================================================= -->
  <g transform="translate(1046, 76)">
    <!-- Stage Card -->
    <rect x="0" y="0" width="310" height="594" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1.2"/>
    
    <!-- Stage Header -->
    <rect x="0" y="0" width="310" height="28" rx="8" fill="#F1F5F9"/>
    <rect x="0" y="18" width="310" height="10" fill="#F1F5F9"/>
    <text x="12" y="18" class="stage-hdr"><tspan class="stage-idx" fill="#059669">04</tspan> &nbsp;·&nbsp; Final Map &amp; Regulatory Verdict</text>

    <!-- Visual 1: THE ACTUAL MAP CANVAS WITH PWRI RASTER OVERLAY -->
    <g transform="translate(12, 36)">
      <rect x="0" y="0" width="286" height="168" rx="6" fill="#1E293B" stroke="#0F172A" stroke-width="1.2"/>
      
      <!-- Satellite Basemap Background Simulation -->
      <path d="M 6 6 L 280 6 L 280 162 L 6 162 Z" fill="#1E3A2F" opacity="0.85"/>
      <path d="M 20 60 Q 80 40 140 70 T 260 100" fill="none" stroke="#2D5A43" stroke-width="1.5"/>
      <path d="M 30 110 Q 100 80 180 120 T 270 140" fill="none" stroke="#2D5A43" stroke-width="1.5"/>

      <!-- Top Map Controls Bar -->
      <rect x="8" y="8" width="140" height="16" rx="3" fill="#0F172A" fill-opacity="0.8"/>
      <text x="14" y="19" class="mono-meta" font-size="7.5px" fill="#E2E8F0">MAPLIBRE GL · 10m RASTER</text>

      <!-- Dissected Parcel Geometry -->
      <!-- Green Clean Area: P_export (48.4%) -->
      <polygon points="25,35 150,28 125,145 45,140" fill="#10B981" fill-opacity="0.6" stroke="#34D399" stroke-width="2"/>
      <!-- Red Quarantined Area: V_3(a) (51.6%) -->
      <polygon points="150,28 255,40 230,150 125,145" fill="#EF4444" fill-opacity="0.6" stroke="#F87171" stroke-width="2"/>
      <!-- Hatching on Violation -->
      <line x1="150" y1="28" x2="125" y2="145" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="3 3"/>

      <!-- Map Labels -->
      <rect x="36" y="70" width="74" height="24" rx="3" fill="#065F46" fill-opacity="0.9"/>
      <text x="73" y="81" text-anchor="middle" class="badge-txt" fill="#FFFFFF">P_EXPORT</text>
      <text x="73" y="90" text-anchor="middle" class="mono-meta" font-size="6.5px" fill="#A7F3D0">177.7 ha (Clean)</text>

      <rect x="156" y="70" width="86" height="24" rx="3" fill="#991B1B" fill-opacity="0.9"/>
      <text x="199" y="81" text-anchor="middle" class="badge-txt" fill="#FFFFFF">V_3(a) QUARANTINE</text>
      <text x="199" y="90" text-anchor="middle" class="mono-meta" font-size="6.5px" fill="#FECACA">189.5 ha (Carved)</text>

      <!-- Bottom Map Legend Bar -->
      <rect x="8" y="146" width="270" height="16" rx="3" fill="#0F172A" fill-opacity="0.85"/>
      <circle cx="16" cy="154" r="3" fill="#10B981"/>
      <text x="23" y="157" class="mono-meta" font-size="6.5px" fill="#E2E8F0">Clean (Art. 3a)</text>
      <circle cx="95" cy="154" r="3" fill="#F59E0B"/>
      <text x="102" y="157" class="mono-meta" font-size="6.5px" fill="#E2E8F0">Replant (Art. 2(5))</text>
      <circle cx="185" cy="154" r="3" fill="#EF4444"/>
      <text x="192" y="157" class="mono-meta" font-size="6.5px" fill="#E2E8F0">Violation (Art. 3a)</text>
    </g>

    <!-- Visual 2: THE OPERATIONAL STATUS CARD (Direct from Oxeous UI) -->
    <g transform="translate(12, 212)">
      <rect x="0" y="0" width="286" height="122" rx="6" fill="#FFFFFF" stroke="#FDE68A" stroke-width="1.3"/>
      
      <!-- Top Banner: Salvageable Status -->
      <rect x="8" y="8" width="270" height="28" rx="4" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1"/>
      <text x="16" y="20" class="badge-txt" fill="#92400E">STATUS: SALVAGEABLE (POST-CARVE-OUT)</text>
      <text x="16" y="30" class="mono-meta" font-size="7.5px" fill="#B45309">189.5 ha Loss (48.4% Clean Export Area)</text>

      <!-- Action Button inside Status Card -->
      <g transform="translate(180, 12)">
        <rect x="0" y="0" width="90" height="20" rx="3" fill="#065F46"/>
        <text x="45" y="13" text-anchor="middle" class="badge-txt" fill="#FFFFFF">Export Clean</text>
      </g>

      <!-- Split Metrics Summary -->
      <g transform="translate(10, 44)">
        <!-- Left: Clean Export Metric -->
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="130" height="34" rx="4" fill="#F0FDF4" stroke="#BBF7D0"/>
          <circle cx="10" cy="12" r="3.5" fill="#10B981"/>
          <text x="18" y="14" class="badge-txt" fill="#166534">VERIFIED CLEAN</text>
          <text x="10" y="27" class="card-title" font-size="11px" fill="#059669">177.7 ha (48.4%)</text>
        </g>

        <!-- Right: Deforestation Metric -->
        <g transform="translate(136, 0)">
          <rect x="0" y="0" width="130" height="34" rx="4" fill="#FEF2F2" stroke="#FECACA"/>
          <circle cx="10" cy="12" r="3.5" fill="#EF4444"/>
          <text x="18" y="14" class="badge-txt" fill="#991B1B">STATUTORY VIOLATION</text>
          <text x="10" y="27" class="card-title" font-size="11px" fill="#DC2626">189.5 ha (51.6%)</text>
        </g>
      </g>

      <!-- Carve-Out Rule Footnote -->
      <g transform="translate(10, 86)">
        <rect x="0" y="0" width="266" height="26" rx="3" fill="#F8FAFC" stroke="#E2E8F0"/>
        <text x="8" y="12" class="mono-meta" font-size="7px" fill="#475569">CARVE-OUT: P_export = P_declared \ V_3(a)</text>
        <text x="8" y="21" class="card-sub" font-size="7px">Clean polygon isolated for TRACES NT customs clearance</text>
      </g>
    </g>

    <!-- Visual 3: AGRONOMIC YIELD CEILING GOVERNOR -->
    <g transform="translate(12, 342)">
      <rect x="0" y="0" width="286" height="96" rx="6" fill="#FFFFFF" stroke="#FDE68A" stroke-width="1.2"/>
      
      <rect x="0" y="0" width="286" height="18" rx="6" fill="#FEF3C7"/>
      <rect x="0" y="10" width="286" height="8" fill="#FEF3C7"/>
      <text x="10" y="13" class="card-title" font-size="8.5px" fill="#92400E">AGRONOMIC YIELD CEILING GOVERNOR (ANTI-LAUNDERING)</text>

      <rect x="10" y="24" width="266" height="26" rx="3" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1"/>
      <text x="143" y="41" text-anchor="middle" class="math-eq" font-size="10px" fill="#B45309">M_max = P_exp × Y_cocoa (1,100 kg/ha)</text>

      <g transform="translate(14, 56)">
        <text x="0" y="10" class="card-sub" font-size="7.5px">Max Permitted Harvest Mass:</text>
        <text x="258" y="10" text-anchor="end" class="mono-meta" font-size="7.5px" fill="#0F172A">177.7 ha × 1,100 = 195,470 kg</text>
        
        <text x="0" y="21" class="card-sub" font-size="7.5px">Declared Batch Mass:</text>
        <text x="258" y="21" text-anchor="end" class="mono-meta" font-size="7.5px" fill="#059669">142,500 kg ≤ M_max</text>

        <text x="0" y="32" class="card-sub" font-size="7.5px">Anti-Laundering Audit:</text>
        <text x="258" y="32" text-anchor="end" class="badge-txt" fill="#059669">PASSED (NO SMUGGLING) [✓]</text>
      </g>
    </g>

    <!-- Visual 4: TRACES NT CUSTOMS BOX 44 & SHA-256 MERKLE SEAL -->
    <g transform="translate(12, 446)">
      <rect x="0" y="0" width="286" height="136" rx="6" fill="#FFFFFF" stroke="#86EFAC" stroke-width="1.2"/>
      
      <!-- TRACES NT Header -->
      <circle cx="18" cy="18" r="9" fill="#ECFDF5" stroke="#10B981" stroke-width="1.2"/>
      <path d="M 14 18 L 17 21 L 22 15" fill="none" stroke="#059669" stroke-width="1.8"/>
      <text x="34" y="16" class="card-title" font-size="9.5px" fill="#065F46">TRACES NT DDS XML/JSON</text>
      <text x="34" y="26" class="mono-meta" font-size="7px" fill="#059669">EU CUSTOMS CODE C716 · BOX 44</text>

      <!-- Customs Table -->
      <rect x="8" y="34" width="270" height="54" rx="4" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1"/>
      <g transform="translate(14, 42)">
        <text x="0" y="10" class="mono-meta" font-size="7px" fill="#166534">DDS Statement ID:</text>
        <text x="250" y="10" text-anchor="end" class="mono-meta" font-size="7px" fill="#0F172A">EU-DDS-2026-CI-8921</text>
        
        <text x="0" y="22" class="mono-meta" font-size="7px" fill="#166534">HS Commodity Tariff:</text>
        <text x="250" y="22" text-anchor="end" class="mono-meta" font-size="7px" fill="#0F172A">1801.00.00 (Cocoa Beans)</text>
        
        <text x="0" y="34" class="mono-meta" font-size="7px" fill="#166534">Certified Export Area:</text>
        <text x="250" y="34" text-anchor="end" class="mono-meta" font-size="7px" fill="#059669">177.7 Hectares (Clean)</text>
      </g>

      <!-- Merkle Hash Seal -->
      <g transform="translate(8, 94)">
        <rect x="0" y="0" width="270" height="34" rx="3" fill="#F8FAFC" stroke="#CBD5E1"/>
        <text x="8" y="12" class="mono-meta" font-size="7px" fill="#64748B">SHA-256 MERKLE PROVENANCE HASH:</text>
        <text x="8" y="24" class="mono-meta" font-size="7.5px" fill="#2563EB">730567f7e91a2b...3f4a5b6c (Merkle Proof)</text>
      </g>
    </g>
  </g>

  <!-- =========================================================================
       FOOTER / ACADEMIC CAPTION
       ========================================================================= -->
  <g transform="translate(26, 692)">
    <text x="0" y="0" class="mono-meta" font-size="8.5px" fill="#64748B">
      <tspan x="0" dy="0"><tspan font-weight="700" fill="#0F172A">Figure 1. Full-system autonomous spatial intelligence architecture for statutory EUDR verification under Regulation (EU) 2023/1115.</tspan> Stage 1 validates vector topology, evaluates WGS84 geodesic physics, and configures the biophysical profile for the selected Annex I commodity (Cocoa, Coffee, Oil Palm, Rubber, Soya, Wood, Cattle). Stage 2 orchestrates the 8-sensor EO 3D data cube.</tspan>
      <tspan x="0" dy="13">Stage 3 computes the tri-axial PWRI-3D map algebra tensor (Fig. 2) and runs 6-subagent consensus (Fig. 3). Stage 4 generates the final operational MapLibre map with the 4-class discrete raster, outputs the real-time statutory status card with May 2026 parcel carve-out, enforces the agronomic yield ceiling governor, and delivers the TRACES NT Customs Code C716 DDS statement.</tspan>
    </text>
  </g>
</svg>
`;

// HTML Wrapper
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figure 1: Oxeous Full System Scientific Architecture</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      background: #F8FAFC;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: 'Inter', sans-serif;
    }
    .top-bar {
      width: 100%;
      max-width: 1380px;
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
    }
    .btn-primary { background: #0F172A; color: #FFFFFF; border-color: #0F172A; }
    .canvas-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
      max-width: 1380px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div>
      <span style="font-weight:700; font-size:14px; color:#0F172A;">Figure 1: Full System Scientific Architecture</span>
      <span style="font-size:12px; color:#64748B; margin-left:12px;">Publication-Grade · 600 DPI Vector Rendering</span>
    </div>
    <div style="display:flex; gap:10px;">
      <a href="Figure_1_Full_System_Pipeline.png" download class="btn btn-primary">Download Ultra-HD PNG</a>
      <a href="Figure_1_Full_System_Pipeline.pdf" download class="btn">Download Vector PDF</a>
      <a href="Figure_1_Full_System_Pipeline.svg" download class="btn">Download Lossless SVG</a>
    </div>
  </div>
  <div class="canvas-card">
    ${svgContent}
  </div>
</body>
</html>
`;

async function render() {
  const outDir = path.resolve(__dirname);
  const svgPath = path.join(outDir, 'Figure_1_Full_System_Pipeline.svg');
  const htmlPath = path.join(outDir, 'Figure_1_Full_System_Pipeline.html');
  const pngPath = path.join(outDir, 'Figure_1_Full_System_Pipeline.png');
  const pdfPath = path.join(outDir, 'Figure_1_Full_System_Pipeline.pdf');

  console.log('Writing Figure_1_Full_System_Pipeline.svg and .html...');
  fs.writeFileSync(svgPath, svgContent.trim());
  fs.writeFileSync(htmlPath, htmlContent.trim());

  console.log('Launching headless Chrome for 600 DPI rendering...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 3 // Ultra-HD 600 DPI
  });

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
}

render().catch(err => {
  console.error('Error generating Figure 1:', err);
  process.exit(1);
});
