const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const W = 1180;
const H = 490;

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#ffffff; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <style>
      .sec-hdr { font-weight: 800; font-size: 11px; fill: #1E293B; letter-spacing: 0.08em; text-transform: uppercase; }
      .box-title { font-weight: 700; font-size: 11.5px; fill: #0F172A; }
      .box-sub { font-size: 9.5px; fill: #475569; line-height: 1.35; }
      .micro-tag { font-family: 'JetBrains Mono', monospace; font-size: 8px; fill: #64748B; font-weight: 600; }
      .math-txt { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; fill: #0F172A; }
      .fig-badge { font-family: 'JetBrains Mono', monospace; font-size: 8.5px; fill: #64748B; font-weight: 600; }
      .chip-txt { font-size: 9.5px; font-weight: 600; fill: #334155; }
      .leg-txt { font-size: 9px; fill: #334155; font-weight: 500; }
    </style>

    <!-- Markers -->
    <marker id="arr-gray" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748B"/>
    </marker>
    <marker id="arr-dark" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0F172A"/>
    </marker>

    <!-- Hatch Pattern for Violation in Col 4 Map -->
    <pattern id="hatch-white-dense" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#FFFFFF" stroke-width="1.3" stroke-opacity="0.65"/>
    </pattern>

    <!-- Satellite Terrain Basemap Gradient & Textures -->
    <linearGradient id="sat-terrain" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3D5A43"/>
      <stop offset="35%" stop-color="#2D4533"/>
      <stop offset="70%" stop-color="#44634B"/>
      <stop offset="100%" stop-color="#263B2C"/>
    </linearGradient>
  </defs>

  <!-- =========================================================================
       COLUMN HEADERS
       ========================================================================= -->
  <text x="90" y="24" text-anchor="middle" class="sec-hdr">1 INPUT</text>
  <text x="270" y="24" text-anchor="middle" class="sec-hdr">2 EVIDENCE</text>
  <text x="590" y="24" text-anchor="middle" class="sec-hdr">3 DETERMINISTIC ADJUDICATION</text>
  <text x="1027" y="24" text-anchor="middle" class="sec-hdr">4 OUTPUT MAP &amp; STATUS</text>

  <!-- =========================================================================
       COLUMN 1: 1 INPUT (x: 16 to 164, width: 148)
       ========================================================================= -->
  <!-- Box 1A: Operator Payload -->
  <g transform="translate(16, 38)">
    <rect x="0" y="0" width="148" height="150" rx="6" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.2"/>
    <text x="74" y="24" text-anchor="middle" class="box-title">Operator</text>
    <text x="74" y="38" text-anchor="middle" class="box-title">payload</text>

    <!-- Polygon Vector Drawing -->
    <g transform="translate(16, 46)">
      <polygon points="12,14 102,6 114,60 22,66" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.8"/>
      <circle cx="12" cy="14" r="2.8" fill="#2563EB"/>
      <circle cx="102" cy="6" r="2.8" fill="#2563EB"/>
      <circle cx="114" cy="60" r="2.8" fill="#2563EB"/>
      <circle cx="22" cy="66" r="2.8" fill="#2563EB"/>
    </g>

    <text x="74" y="130" text-anchor="middle" class="box-sub" font-style="italic">polygon P</text>
    <text x="74" y="142" text-anchor="middle" class="box-sub" font-style="italic">declared mass m</text>
  </g>

  <!-- Box 1B: Commodity Selection (CLEAN & BALANCED) -->
  <g transform="translate(16, 202)">
    <rect x="0" y="0" width="148" height="236" rx="6" fill="#FFFFFF" stroke="#F59E0B" stroke-width="1.5"/>
    <text x="74" y="22" text-anchor="middle" class="box-title" fill="#B45309">Commodity <tspan font-style="italic">c</tspan></text>
    <text x="74" y="36" text-anchor="middle" class="micro-tag" font-size="7.5px">EUDR Annex I · select one</text>

    <!-- 7 Commodity Chips arranged with generous padding -->
    <g transform="translate(10, 48)">
      <!-- Row 1: Cocoa (Selected) & Coffee -->
      <rect x="0" y="0" width="61" height="28" rx="4" fill="#FEF3C7" stroke="#D97706" stroke-width="1.3"/>
      <circle cx="10" cy="14" r="2.5" fill="#D97706"/>
      <text x="17" y="17" class="chip-txt" fill="#92400E" font-weight="700">✓ Cocoa</text>

      <rect x="67" y="0" width="61" height="28" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <text x="97" y="17" text-anchor="middle" class="chip-txt">Coffee</text>

      <!-- Row 2: Oil palm & Rubber -->
      <rect x="0" y="36" width="61" height="28" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <text x="30" y="53" text-anchor="middle" class="chip-txt">Oil palm</text>

      <rect x="67" y="36" width="61" height="28" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <text x="97" y="53" text-anchor="middle" class="chip-txt">Rubber</text>

      <!-- Row 3: Soya & Wood -->
      <rect x="0" y="72" width="61" height="28" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <text x="30" y="89" text-anchor="middle" class="chip-txt">Soya</text>

      <rect x="67" y="72" width="61" height="28" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <text x="97" y="89" text-anchor="middle" class="chip-txt">Wood</text>

      <!-- Row 4: Cattle -->
      <rect x="0" y="108" width="61" height="28" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
      <text x="30" y="125" text-anchor="middle" class="chip-txt">Cattle</text>
    </g>
  </g>

  <!-- Flow Lines Col 1 -> Col 2 -->
  <path d="M 164 113 L 180 113 L 180 100 L 196 100" fill="none" stroke="#64748B" stroke-width="1.2" marker-end="url(#arr-gray)"/>
  <path d="M 180 113 L 180 238 L 196 238" fill="none" stroke="#64748B" stroke-width="1.2" marker-end="url(#arr-gray)"/>
  <path d="M 164 320 L 180 320 L 180 376 L 196 376" fill="none" stroke="#64748B" stroke-width="1.2" marker-end="url(#arr-gray)"/>

  <!-- =========================================================================
       COLUMN 2: 2 EVIDENCE (x: 196 to 344, width: 148)
       ========================================================================= -->
  <!-- Card 2A: Remote Sensing -->
  <g transform="translate(196, 38)">
    <rect x="0" y="0" width="148" height="124" rx="6" fill="#EFF6FF" stroke="#60A5FA" stroke-width="1.3"/>
    <text x="74" y="44" text-anchor="middle" class="box-title" fill="#1E40AF">Remote sensing</text>
    <text x="74" y="70" text-anchor="middle" class="box-sub">forest baseline 2020</text>
    <text x="74" y="86" text-anchor="middle" class="box-sub">canopy loss · SAR</text>
  </g>

  <!-- Card 2B: Geospatial -->
  <g transform="translate(196, 176)">
    <rect x="0" y="0" width="148" height="124" rx="6" fill="#F0FDF4" stroke="#4ADE80" stroke-width="1.3"/>
    <text x="74" y="44" text-anchor="middle" class="box-title" fill="#166534">Geospatial</text>
    <text x="74" y="70" text-anchor="middle" class="box-sub">protected areas</text>
    <text x="74" y="86" text-anchor="middle" class="box-sub">geodesic area · DEM</text>
  </g>

  <!-- Card 2C: Regulatory -->
  <g transform="translate(196, 314)">
    <rect x="0" y="0" width="148" height="124" rx="6" fill="#FFFBEB" stroke="#FBBF24" stroke-width="1.3"/>
    <text x="74" y="44" text-anchor="middle" class="box-title" fill="#92400E">Regulatory</text>
    <text x="74" y="70" text-anchor="middle" class="box-sub">EUDR articles</text>
    <text x="74" y="86" text-anchor="middle" class="box-sub">crop model · yield cap</text>
  </g>

  <!-- Connectors Col 2 -> Col 3 -->
  <line x1="344" y1="100" x2="368" y2="100" stroke="#64748B" stroke-width="1.2" marker-end="url(#arr-gray)"/>
  <line x1="344" y1="238" x2="368" y2="238" stroke="#64748B" stroke-width="1.2" marker-end="url(#arr-gray)"/>
  <line x1="344" y1="376" x2="368" y2="376" stroke="#64748B" stroke-width="1.2" marker-end="url(#arr-gray)"/>

  <!-- =========================================================================
       COLUMN 3: 3 DETERMINISTIC ADJUDICATION (x: 368 to 868)
       ========================================================================= -->
  <!-- Outer Dashed Enclosure Box -->
  <rect x="368" y="38" width="344" height="400" rx="8" fill="none" stroke="#64748B" stroke-width="1.4" stroke-dasharray="5 4"/>

  <!-- Module 3A: PWRI-3D Map Algebra -->
  <g transform="translate(380, 50)">
    <rect x="0" y="0" width="320" height="182" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
    <text x="14" y="22" class="box-title">PWRI-3D map algebra</text>
    <text x="306" y="22" text-anchor="end" class="fig-badge">Fig. 2</text>

    <!-- Isometric Slabs (Left) -->
    <g transform="translate(14, 36)">
      <!-- Layer 3: Pink (Top) -->
      <polygon points="45,0 90,12 45,24 0,12" fill="#FEE2E2" stroke="#EF4444" stroke-width="1"/>
      <polygon points="0,12 45,24 45,28 0,16" fill="#FCA5A5" stroke="#EF4444" stroke-width="1"/>
      <polygon points="90,12 45,24 45,28 90,16" fill="#F87171" stroke="#EF4444" stroke-width="1"/>
      <line x1="22" y1="6" x2="68" y2="18" stroke="#EF4444" stroke-opacity="0.4"/>
      <line x1="22" y1="18" x2="68" y2="6" stroke="#EF4444" stroke-opacity="0.4"/>

      <!-- Layer 2: Cyan (Middle) -->
      <g transform="translate(0, 26)">
        <polygon points="45,0 90,12 45,24 0,12" fill="#E0F2FE" stroke="#0284C7" stroke-width="1"/>
        <polygon points="0,12 45,24 45,28 0,16" fill="#BAE6FD" stroke="#0284C7" stroke-width="1"/>
        <polygon points="90,12 45,24 45,28 90,16" fill="#7DD3FC" stroke="#0284C7" stroke-width="1"/>
        <line x1="22" y1="6" x2="68" y2="18" stroke="#0284C7" stroke-opacity="0.4"/>
        <line x1="22" y1="18" x2="68" y2="6" stroke="#0284C7" stroke-opacity="0.4"/>
      </g>

      <!-- Layer 1: Green (Bottom) -->
      <g transform="translate(0, 52)">
        <polygon points="45,0 90,12 45,24 0,12" fill="#DCFCE7" stroke="#16A34A" stroke-width="1"/>
        <polygon points="0,12 45,24 45,28 0,16" fill="#BBF7D0" stroke="#16A34A" stroke-width="1"/>
        <polygon points="90,12 45,24 45,28 90,16" fill="#86EFAC" stroke="#16A34A" stroke-width="1"/>
        <line x1="22" y1="6" x2="68" y2="18" stroke="#16A34A" stroke-opacity="0.4"/>
        <line x1="22" y1="18" x2="68" y2="6" stroke="#16A34A" stroke-opacity="0.4"/>
      </g>
    </g>

    <!-- Mathematical Operator Circle ⊗ -->
    <g transform="translate(114, 76)">
      <circle cx="12" cy="12" r="11" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.4"/>
      <text x="12" y="17" text-anchor="middle" font-size="15px" font-weight="700">⊗</text>
    </g>

    <!-- Filter Pill: ≥ 0.5 ha -->
    <g transform="translate(146, 74)">
      <rect x="0" y="0" width="54" height="26" rx="13" fill="#FFFFFF" stroke="#DC2626" stroke-width="1.5"/>
      <text x="27" y="17" text-anchor="middle" class="math-txt" font-size="9px" fill="#DC2626">≥ 0.5 ha</text>
    </g>

    <!-- Arrow to classified raster -->
    <line x1="204" y1="87" x2="220" y2="87" stroke="#0F172A" stroke-width="1.4" marker-end="url(#arr-dark)"/>

    <!-- Right 5x5 Classified Grid -->
    <g transform="translate(226, 44)">
      <rect x="0" y="0" width="80" height="80" rx="4" fill="#FFFFFF" stroke="#334155" stroke-width="1.2"/>
      
      <!-- Row 0 -->
      <rect x="0" y="0" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="16" y="0" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="32" y="0" width="16" height="16" fill="#3B82C4" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="48" y="0" width="16" height="16" fill="#F2A91F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="64" y="0" width="16" height="16" fill="#D93C4A" stroke="#FFFFFF" stroke-width="0.8"/>

      <!-- Row 1 -->
      <rect x="0" y="16" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="16" y="16" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="32" y="16" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="48" y="16" width="16" height="16" fill="#D93C4A" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="64" y="16" width="16" height="16" fill="#D93C4A" stroke="#FFFFFF" stroke-width="0.8"/>

      <!-- Row 2 -->
      <rect x="0" y="32" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="16" y="32" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="32" y="32" width="16" height="16" fill="#D93C4A" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="48" y="32" width="16" height="16" fill="#D93C4A" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="64" y="32" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>

      <!-- Row 3 -->
      <rect x="0" y="48" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="16" y="48" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="32" y="48" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="48" y="48" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="64" y="48" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>

      <!-- Row 4 -->
      <rect x="0" y="64" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="16" y="64" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="32" y="64" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="48" y="64" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
      <rect x="64" y="64" width="16" height="16" fill="#2E9E6F" stroke="#FFFFFF" stroke-width="0.8"/>
    </g>

    <!-- Formula / Summary line -->
    <text x="160" y="156" text-anchor="middle" class="box-sub">3 layers → sieve → 4 classes</text>
  </g>

  <!-- Module 3B: Six-Agent Consensus -->
  <g transform="translate(380, 246)">
    <rect x="0" y="0" width="320" height="178" rx="6" fill="#FAF5FF" stroke="#C084FC" stroke-width="1.2"/>
    <text x="14" y="22" class="box-title" fill="#6B21A8">Six-agent consensus</text>
    <text x="306" y="22" text-anchor="end" class="fig-badge">Fig. 3</text>

    <!-- Row of 6 Agents -->
    <g transform="translate(10, 34)">
      <!-- A1 (Remote Sensing: Blue) -->
      <rect x="0" y="0" width="46" height="28" rx="4" fill="#EFF6FF" stroke="#60A5FA" stroke-width="1.2"/>
      <text x="23" y="18" text-anchor="middle" class="box-title" font-size="10.5px" fill="#1E40AF">A1</text>

      <!-- A2 (Remote Sensing: Blue) -->
      <rect x="51" y="0" width="46" height="28" rx="4" fill="#EFF6FF" stroke="#60A5FA" stroke-width="1.2"/>
      <text x="74" y="18" text-anchor="middle" class="box-title" font-size="10.5px" fill="#1E40AF">A2</text>

      <!-- A3 (Geospatial: Green) -->
      <rect x="102" y="0" width="46" height="28" rx="4" fill="#F0FDF4" stroke="#4ADE80" stroke-width="1.2"/>
      <text x="125" y="18" text-anchor="middle" class="box-title" font-size="10.5px" fill="#166534">A3</text>

      <!-- A4 (Geospatial: Green) -->
      <rect x="153" y="0" width="46" height="28" rx="4" fill="#F0FDF4" stroke="#4ADE80" stroke-width="1.2"/>
      <text x="176" y="18" text-anchor="middle" class="box-title" font-size="10.5px" fill="#166534">A4</text>

      <!-- A5 (Regulatory: Amber) -->
      <rect x="204" y="0" width="46" height="28" rx="4" fill="#FFFBEB" stroke="#FBBF24" stroke-width="1.2"/>
      <text x="227" y="18" text-anchor="middle" class="box-title" font-size="10.5px" fill="#92400E">A5</text>

      <!-- A6 (Regulatory: Amber) -->
      <rect x="255" y="0" width="46" height="28" rx="4" fill="#FFFBEB" stroke="#FBBF24" stroke-width="1.2"/>
      <text x="278" y="18" text-anchor="middle" class="box-title" font-size="10.5px" fill="#92400E">A6</text>
    </g>

    <!-- Flow lines down to Supervisor -->
    <path d="M 33 62 L 33 74 L 160 74 L 160 80" fill="none" stroke="#7C3AED" stroke-width="1.2"/>
    <path d="M 84 62 L 84 74" fill="none" stroke="#7C3AED" stroke-width="1.2"/>
    <path d="M 135 62 L 135 80" fill="none" stroke="#7C3AED" stroke-width="1.2"/>
    <path d="M 186 62 L 186 80" fill="none" stroke="#7C3AED" stroke-width="1.2"/>
    <path d="M 237 62 L 237 74 L 160 74" fill="none" stroke="#7C3AED" stroke-width="1.2"/>
    <path d="M 288 62 L 288 74 L 160 74" fill="none" stroke="#7C3AED" stroke-width="1.2"/>
    <polygon points="160,86 156.5,80 163.5,80" fill="#7C3AED"/>

    <!-- Supervisor Box (Single clean title, no redundant sub-text inside) -->
    <g transform="translate(10, 88)">
      <rect x="0" y="0" width="300" height="42" rx="5" fill="#F3E8FF" stroke="#A855F7" stroke-width="1.4"/>
      <text x="150" y="26" text-anchor="middle" class="box-title" font-size="11px" fill="#581C87">Supervisor · deterministic gate</text>
    </g>

    <!-- Subtitle below Supervisor Box -->
    <text x="160" y="156" text-anchor="middle" class="box-sub" font-size="9px" fill="#6B21A8">fusion → statutory overrides → gate</text>
  </g>

  <!-- Connectors from Adjudication -> Carve-out -->
  <line x1="712" y1="140" x2="732" y2="190" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arr-dark)"/>
  <line x1="712" y1="335" x2="732" y2="280" stroke="#0F172A" stroke-width="1.2" marker-end="url(#arr-dark)"/>

  <!-- Module 3C: Carve-Out & Yield Gate -->
  <g transform="translate(732, 140)">
    <rect x="0" y="0" width="134" height="196" rx="6" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
    <text x="67" y="22" text-anchor="middle" class="box-title">Carve-out</text>
    <text x="67" y="36" text-anchor="middle" class="box-title">&amp; yield gate</text>

    <!-- Formula 1 Box -->
    <g transform="translate(8, 52)">
      <rect x="0" y="0" width="118" height="52" rx="4" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
      <text x="59" y="20" text-anchor="middle" class="math-txt" font-size="10px">P_export =</text>
      <text x="59" y="38" text-anchor="middle" class="math-txt" font-size="9px">P_decl <tspan fill="#DC2626">\ V_3(a)</tspan></text>
    </g>

    <!-- Formula 2 Box -->
    <g transform="translate(8, 116)">
      <rect x="0" y="0" width="118" height="52" rx="4" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1"/>
      <text x="59" y="20" text-anchor="middle" class="math-txt" font-size="9.5px" fill="#92400E">M_decl ≤ M_max</text>
      <text x="59" y="38" text-anchor="middle" class="math-txt" font-size="8.5px" fill="#B45309">M_max = A_export · Y_c</text>
    </g>
  </g>

  <!-- Connectors Carve-out -> Col 4 -->
  <line x1="866" y1="238" x2="888" y2="238" stroke="#0F172A" stroke-width="1.4" marker-end="url(#arr-dark)"/>

  <!-- =========================================================================
       COLUMN 4: 4 OUTPUT MAP & STATUS (x: 888 to 1164, width: 276)
       ========================================================================= -->
  <!-- Map Card -->
  <g transform="translate(888, 38)">
    <rect x="0" y="0" width="276" height="216" rx="6" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.4"/>
    
    <!-- Title inside map frame -->
    <text x="12" y="18" class="box-title" font-size="10.5px" fill="#0F172A">Classified output · illustrative</text>

    <!-- SATELLITE TERRAIN BASEMAP VIEWPORT -->
    <g transform="translate(6, 26)">
      <clipPath id="map-clip">
        <rect x="0" y="0" width="264" height="184" rx="4"/>
      </clipPath>

      <g clip-path="url(#map-clip)">
        <!-- Natural Satellite Terrain Canvas -->
        <rect x="0" y="0" width="264" height="184" fill="url(#sat-terrain)"/>
        
        <!-- Meandering River & Valley Features -->
        <path d="M 0 45 Q 70 30 140 65 T 264 85" fill="none" stroke="#25382B" stroke-width="8" stroke-linecap="round"/>
        <path d="M 0 45 Q 70 30 140 65 T 264 85" fill="none" stroke="#3D5A45" stroke-width="4" stroke-linecap="round"/>
        <path d="M 0 120 Q 90 95 180 135 T 264 140" fill="none" stroke="#25382B" stroke-width="6" stroke-linecap="round"/>
        
        <!-- Canopy Texture Mosaics -->
        <circle cx="35" cy="30" r="18" fill="#4D7055" fill-opacity="0.25"/>
        <circle cx="160" cy="40" r="24" fill="#203324" fill-opacity="0.35"/>
        <circle cx="230" cy="120" r="28" fill="#4D7055" fill-opacity="0.3"/>
        <circle cx="70" cy="150" r="22" fill="#203324" fill-opacity="0.35"/>

        <!-- COMPASS NORTH INDICATOR (Top Right) -->
        <g transform="translate(242, 14)">
          <circle cx="9" cy="9" r="8" fill="#FFFFFF" stroke="#0F172A" stroke-width="0.8"/>
          <polygon points="9,3 6.5,9 11.5,9" fill="#0F172A"/>
          <polygon points="9,15 6.5,9 11.5,9" fill="#94A3B8"/>
          <text x="9" y="8" text-anchor="middle" font-size="5.5px" font-weight="800" fill="#FFFFFF">N</text>
        </g>

        <!-- THE DISSECTED PARCEL (Positioned x: 18 to 184 - leaves x: 194 to 264 completely clear!) -->
        <!-- Left Area: Verified Clean Forest Green (P_export) -->
        <polygon points="18,18 104,14 96,150 28,146" fill="#15803D" fill-opacity="0.85"/>
        <!-- Thin Grid Lines on Clean Area -->
        <g stroke="#86EFAC" stroke-width="0.6" stroke-opacity="0.35">
          <line x1="18" y1="48" x2="102" y2="48"/>
          <line x1="22" y1="80" x2="100" y2="80"/>
          <line x1="25" y1="112" x2="98" y2="112"/>
          <line x1="46" y1="17" x2="52" y2="147"/>
          <line x1="74" y1="15" x2="76" y2="148"/>
        </g>

        <!-- Right Area: Statutory Violation Red (V_3a) with Hatching -->
        <polygon points="104,14 184,20 168,154 96,150" fill="#B91C1C" fill-opacity="0.85"/>
        <polygon points="104,14 184,20 168,154 96,150" fill="url(#hatch-white-dense)"/>

        <!-- Stepped Raster Carve-Out Boundary Line -->
        <polyline points="104,14 100,28 108,28 108,44 98,44 98,64 110,64 110,84 96,84 96,106 104,106 104,128 96,128 96,150" 
                  fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="square"/>
        <polyline points="104,14 100,28 108,28 108,44 98,44 98,64 110,64 110,84 96,84 96,106 104,106 104,128 96,128 96,150" 
                  fill="none" stroke="#0F172A" stroke-width="0.9" stroke-dasharray="2 2"/>

        <!-- Outer Boundary Stroke of the Total Parcel -->
        <polygon points="18,18 104,14 184,20 168,154 96,150 28,146" fill="none" stroke="#FFFFFF" stroke-width="2"/>

        <!-- Clean Label Badges inside the Parcel -->
        <!-- P_export Badge -->
        <g transform="translate(34, 66)">
          <rect x="0" y="0" width="56" height="26" rx="3" fill="#FFFFFF" fill-opacity="0.92" stroke="#15803D" stroke-width="1"/>
          <text x="28" y="11" text-anchor="middle" font-size="8.5px" font-weight="700" fill="#15803D">P_export</text>
          <text x="28" y="21" text-anchor="middle" font-size="7.5px" font-weight="600" fill="#065F46">177.7 ha</text>
        </g>

        <!-- V_3(a) Badge -->
        <g transform="translate(118, 66)">
          <rect x="0" y="0" width="56" height="26" rx="3" fill="#FFFFFF" fill-opacity="0.92" stroke="#B91C1C" stroke-width="1"/>
          <text x="28" y="11" text-anchor="middle" font-size="8.5px" font-weight="700" fill="#B91C1C">V_3(a)</text>
          <text x="28" y="21" text-anchor="middle" font-size="7.5px" font-weight="600" fill="#991B1B">189.5 ha</text>
        </g>

        <!-- 31 Dec 2020 Baseline Inset Box (Positioned x: 196 to 258 - 100% CLEAR OF THE PARCEL & LABELS!) -->
        <g transform="translate(196, 54)">
          <rect x="0" y="0" width="62" height="52" rx="3" fill="#142820" fill-opacity="0.85" stroke="#FFFFFF" stroke-width="1.2" stroke-dasharray="2.5 2"/>
          <rect x="8" y="6" width="46" height="24" rx="2" fill="#15803D" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="2 2"/>
          <text x="31" y="21" text-anchor="middle" font-size="6.5px" font-weight="700" fill="#FFFFFF">100% FOREST</text>
          <text x="31" y="44" text-anchor="middle" class="micro-tag" font-size="7px" fill="#FFFFFF">31 Dec 2020</text>
        </g>

        <!-- Scale Bar (Bottom Left) -->
        <g transform="translate(14, 166)">
          <line x1="0" y1="0" x2="36" y2="0" stroke="#FFFFFF" stroke-width="2"/>
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#FFFFFF" stroke-width="1.5"/>
          <line x1="36" y1="-3" x2="36" y2="3" stroke="#FFFFFF" stroke-width="1.5"/>
          <text x="44" y="3" font-size="7.5px" font-weight="600" fill="#FFFFFF">500 m</text>
        </g>

        <!-- Basemap Attribution (Bottom Right) -->
        <text x="254" y="174" text-anchor="end" class="micro-tag" font-size="6.5px" fill="#E2E8F0">Schematic basemap</text>
      </g>
    </g>
  </g>

  <!-- =========================================================================
       STATUS CARDS BELOW MAP
       ========================================================================= -->
  <!-- Row 1: Verified Clean vs Violation -->
  <g transform="translate(888, 262)">
    <!-- Left: Verified Clean -->
    <rect x="0" y="0" width="134" height="40" rx="4" fill="#F0FDF4" stroke="#16A34A" stroke-width="1.4"/>
    <text x="67" y="16" text-anchor="middle" class="box-title" font-size="9.5px" fill="#15803D">VERIFIED CLEAN</text>
    <text x="67" y="30" text-anchor="middle" class="math-txt" font-size="10.5px" fill="#166534">177.7 ha · 48.4 %</text>

    <!-- Right: Violation -->
    <rect x="142" y="0" width="134" height="40" rx="4" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.4"/>
    <text x="209" y="16" text-anchor="middle" class="box-title" font-size="9.5px" fill="#B91C1C">VIOLATION</text>
    <text x="209" y="30" text-anchor="middle" class="math-txt" font-size="10.5px" fill="#991B1B">189.5 ha · 51.6 %</text>
  </g>

  <!-- Row 2: Anti-Laundering Audit Banner -->
  <g transform="translate(888, 310)">
    <rect x="0" y="0" width="276" height="26" rx="4" fill="#ECFDF5" stroke="#10B981" stroke-width="1.2"/>
    <circle cx="16" cy="13" r="5" fill="#10B981"/>
    <path d="M 13.5 13 L 15.5 15 L 18.5 11" fill="none" stroke="#FFFFFF" stroke-width="1.4"/>
    <text x="28" y="17" class="box-title" font-size="9.5px" fill="#065F46">Anti-laundering audit: PASS</text>
    <text x="264" y="17" text-anchor="end" class="micro-tag" fill="#059669">M_decl ≤ M_max</text>
  </g>

  <!-- Row 3: Final Delivery Boxes -->
  <g transform="translate(888, 344)">
    <!-- TRACES NT DDS -->
    <rect x="0" y="0" width="134" height="44" rx="4" fill="#FFFFFF" stroke="#16A34A" stroke-width="1.3"/>
    <text x="67" y="17" text-anchor="middle" class="box-title" font-size="9.5px" fill="#15803D">TRACES NT DDS</text>
    <text x="67" y="32" text-anchor="middle" class="micro-tag" font-size="7.5px" fill="#334155">HS 1801 · code C716</text>

    <!-- Audit Ledger -->
    <rect x="142" y="0" width="134" height="44" rx="4" fill="#FFFFFF" stroke="#7C3AED" stroke-width="1.3"/>
    <text x="209" y="17" text-anchor="middle" class="box-title" font-size="9.5px" fill="#6B21A8">Audit ledger</text>
    <text x="209" y="32" text-anchor="middle" class="micro-tag" font-size="7.5px" fill="#334155">SHA-256 Merkle</text>
  </g>

  <!-- =========================================================================
       BOTTOM LEGEND BAR (y: 456 to 482)
       ========================================================================= -->
  <g transform="translate(16, 456)">
    <!-- Swatch 1: Remote sensing -->
    <rect x="0" y="5" width="12" height="12" rx="2" fill="#EFF6FF" stroke="#60A5FA" stroke-width="1"/>
    <text x="16" y="15" class="leg-txt">Remote sensing</text>

    <!-- Swatch 2: Geospatial -->
    <rect x="110" y="5" width="12" height="12" rx="2" fill="#F0FDF4" stroke="#4ADE80" stroke-width="1"/>
    <text x="126" y="15" class="leg-txt">Geospatial</text>

    <!-- Swatch 3: Regulatory -->
    <rect x="194" y="5" width="12" height="12" rx="2" fill="#FFFBEB" stroke="#FBBF24" stroke-width="1"/>
    <text x="210" y="15" class="leg-txt">Regulatory</text>

    <!-- Swatch 4: Supervisor -->
    <rect x="282" y="5" width="12" height="12" rx="2" fill="#F3E8FF" stroke="#A855F7" stroke-width="1"/>
    <text x="298" y="15" class="leg-txt">Supervisor</text>

    <!-- Divider Line -->
    <line x1="372" y1="4" x2="372" y2="18" stroke="#CBD5E1" stroke-width="1"/>

    <!-- Swatch 5: Clean -->
    <rect x="388" y="5" width="12" height="12" rx="2" fill="#2E9E6F"/>
    <text x="404" y="15" class="leg-txt">Clean</text>

    <!-- Swatch 6: Replanting -->
    <rect x="450" y="5" width="12" height="12" rx="2" fill="#F2A91F"/>
    <text x="466" y="15" class="leg-txt">Replanting</text>

    <!-- Swatch 7: Silviculture -->
    <rect x="540" y="5" width="12" height="12" rx="2" fill="#3B82C4"/>
    <text x="556" y="15" class="leg-txt">Silviculture</text>

    <!-- Swatch 8: Violation -->
    <rect x="636" y="5" width="12" height="12" rx="2" fill="#D93C4A"/>
    <text x="652" y="15" class="leg-txt">Violation</text>

    <!-- Divider Line -->
    <line x1="720" y1="4" x2="720" y2="18" stroke="#CBD5E1" stroke-width="1"/>

    <!-- Swatch 9: Carve-out Boundary -->
    <line x1="736" y1="9" x2="760" y2="9" stroke="#0F172A" stroke-width="2"/>
    <line x1="736" y1="13" x2="760" y2="13" stroke="#0F172A" stroke-width="2"/>
    <text x="766" y="15" class="leg-txt">Carve-out boundary</text>
  </g>
</svg>
`;

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Figure 1: Full System Scientific Pipeline</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { background: #F8FAFC; margin: 0; padding: 24px; display: flex; flex-direction: column; align-items: center; font-family: 'Inter', sans-serif; }
    .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  </style>
</head>
<body>
  <div class="card">${svgContent}</div>
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
    deviceScaleFactor: 3 // 600 DPI Ultra-HD
  });

  await page.setContent(svgContent);
  await page.waitForTimeout(400);

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
