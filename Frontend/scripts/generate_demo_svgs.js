const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '../public/demo-evidence');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function createSvg({
  title,
  stage,
  stageColor,
  bgGradient,
  graphicElements,
  gps,
  timestamp,
  bearing,
  accuracy,
  projectId
}) {
  const stageId = stage.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const safeTitle = (title || '').replace(/&/g, '&amp;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <linearGradient id="bg_${stageId}" x1="0%" y1="0%" x2="100%" y2="100%">
      ${bgGradient}
    </linearGradient>
    <pattern id="grid_${stageId}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    </pattern>
    <filter id="shadow_${stageId}" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="800" height="500" fill="url(#bg_${stageId})" />
  <rect width="800" height="500" fill="url(#grid_${stageId})" />

  <!-- Horizon / Terrain elements -->
  ${graphicElements}

  <!-- Prominent Watermark across center -->
  <g transform="rotate(-15, 400, 250)" opacity="0.12">
    <text x="400" y="230" text-anchor="middle" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="4">
      DEMO DATA • SAMPLE EVIDENCE
    </text>
    <text x="400" y="270" text-anchor="middle" font-size="22" font-weight="700" fill="#ffffff" letter-spacing="3">
      NOT OFFICIAL GOVERNMENT RECORD
    </text>
  </g>

  <!-- Top Institutional DEMO Banner -->
  <rect x="0" y="0" width="800" height="42" fill="#0f172a" opacity="0.92" />
  <rect x="0" y="40" width="800" height="2" fill="${stageColor}" />
  
  <g transform="translate(16, 26)">
    <!-- Badge -->
    <rect x="0" y="-16" width="105" height="24" rx="4" fill="#dc2626" />
    <text x="52" y="0" text-anchor="middle" font-size="11" font-weight="800" fill="#ffffff" letter-spacing="1">DEMO DATA</text>
    
    <text x="120" y="0" font-size="13" font-weight="700" fill="#f8fafc">
      Sample Field Evidence — ${safeTitle}
    </text>
  </g>

  <!-- Top Right Project & Stage Badge -->
  <g transform="translate(680, 26)">
    <rect x="-10" y="-16" width="115" height="24" rx="12" fill="${stageColor}" />
    <text x="47" y="0" text-anchor="middle" font-size="11" font-weight="800" fill="#ffffff" letter-spacing="0.5">
      ${stage}
    </text>
  </g>

  <!-- Reticle / Camera Viewfinder markings -->
  <path d="M 50 80 L 70 80 M 50 80 L 50 100" stroke="#ffffff" stroke-width="2" stroke-opacity="0.6" fill="none" />
  <path d="M 750 80 L 730 80 M 750 80 L 750 100" stroke="#ffffff" stroke-width="2" stroke-opacity="0.6" fill="none" />
  <path d="M 50 410 L 70 410 M 50 410 L 50 390" stroke="#ffffff" stroke-width="2" stroke-opacity="0.6" fill="none" />
  <path d="M 750 410 L 730 410 M 750 410 L 750 390" stroke="#ffffff" stroke-width="2" stroke-opacity="0.6" fill="none" />
  
  <!-- Center Targeting Reticle -->
  <circle cx="400" cy="245" r="28" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.35" stroke-dasharray="3,3"/>
  <line x1="400" y1="210" x2="400" y2="280" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.4"/>
  <line x1="365" y1="245" x2="435" y2="245" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.4"/>

  <!-- Bottom Metadata HUD Bar -->
  <rect x="0" y="420" width="800" height="80" fill="#0b0f19" opacity="0.94" />
  <rect x="0" y="420" width="800" height="1" fill="#334155" />

  <g transform="translate(24, 448)">
    <!-- Column 1: GPS -->
    <text x="0" y="0" font-size="10" font-weight="600" fill="#94a3b8" letter-spacing="0.5">DEMO GEOTAG</text>
    <text x="0" y="18" font-size="12" font-weight="700" fill="#38bdf8" font-family="monospace">
      ${gps}
    </text>

    <!-- Column 2: Timestamp -->
    <text x="240" y="0" font-size="10" font-weight="600" fill="#94a3b8" letter-spacing="0.5">DEMO TIMESTAMP</text>
    <text x="240" y="18" font-size="12" font-weight="600" fill="#f1f5f9" font-family="monospace">
      ${timestamp}
    </text>

    <!-- Column 3: Compass / Bearing -->
    <text x="440" y="0" font-size="10" font-weight="600" fill="#94a3b8" letter-spacing="0.5">ACCURACY &amp; BEARING</text>
    <text x="440" y="18" font-size="12" font-weight="600" fill="#e2e8f0" font-family="monospace">
      ${accuracy} • ${bearing}
    </text>

    <!-- Column 4: Project Ref -->
    <text x="610" y="0" font-size="10" font-weight="600" fill="#94a3b8" letter-spacing="0.5">PROJECT REF</text>
    <text x="610" y="18" font-size="11" font-weight="700" fill="#cbd5e1" font-family="monospace">
      #${projectId}
    </text>
  </g>
</svg>`;
}

const images = [
  // 1. ROAD (PRJ_298A9603D74B) - Anomaly Demo
  {
    filename: 'road_before.svg',
    title: 'Road Construction & Pathway',
    stage: 'BEFORE WORK',
    stageColor: '#64748b',
    projectId: 'PRJ_298A9603D74B',
    gps: '26.8467° N, 80.9462° E (Demo GPS)',
    timestamp: '2026-07-28 09:42:15 IST',
    bearing: '042° NE',
    accuracy: '±3.4m',
    bgGradient: '<stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1e293b"/>',
    graphicElements: `
      <!-- Sky & Sun -->
      <circle cx="680" cy="110" r="40" fill="#fef08a" opacity="0.4"/>
      <!-- Distant Hills -->
      <path d="M 0 320 Q 200 240, 400 300 T 800 260 L 800 420 L 0 420 Z" fill="#1e293b" opacity="0.8"/>
      <!-- Rough unpaved dirt path -->
      <polygon points="120,420 680,420 440,290 360,290" fill="#78350f" opacity="0.6" />
      <polygon points="200,420 600,420 420,290 380,290" fill="#92400e" opacity="0.7" />
      <!-- Potholes & Ruts -->
      <ellipse cx="380" cy="360" rx="45" ry="12" fill="#451a03" opacity="0.8"/>
      <ellipse cx="460" cy="385" rx="60" ry="15" fill="#451a03" opacity="0.8"/>
      <ellipse cx="330" cy="395" rx="35" ry="8" fill="#451a03" opacity="0.8"/>
      <!-- Survey Marking Peg -->
      <rect x="230" y="340" width="8" height="45" fill="#f97316" />
      <polygon points="230,340 250,330 230,320" fill="#ef4444" />
      <text x="230" y="405" font-size="12" font-weight="700" fill="#fdba74">CHAINAGE 0+000 (DEMO)</text>
      <!-- Vegetation shrubs -->
      <circle cx="150" cy="380" r="22" fill="#14532d" opacity="0.8"/>
      <circle cx="650" cy="370" r="28" fill="#14532d" opacity="0.8"/>
    `
  },
  {
    filename: 'road_during.svg',
    title: 'Road Construction & Pathway',
    stage: 'DURING WORK',
    stageColor: '#f59e0b',
    projectId: 'PRJ_298A9603D74B',
    gps: '26.8468° N, 80.9464° E (Demo GPS)',
    timestamp: '2026-08-18 14:15:30 IST',
    bearing: '045° NE',
    accuracy: '±2.8m',
    bgGradient: '<stop offset="0%" stop-color="#475569"/><stop offset="100%" stop-color="#334155"/>',
    graphicElements: `
      <!-- Road base / aggregate stone layer -->
      <polygon points="80,420 720,420 460,280 340,280" fill="#64748b" opacity="0.85" />
      <!-- Sub-base texture stripes -->
      <line x1="200" y1="380" x2="600" y2="380" stroke="#94a3b8" stroke-width="4" stroke-dasharray="12,12" />
      <line x1="260" y1="340" x2="540" y2="340" stroke="#94a3b8" stroke-width="3" stroke-dasharray="8,8" />
      <!-- Road Roller / Machinery Silhouette -->
      <rect x="360" y="300" width="80" height="40" rx="4" fill="#facc15" />
      <circle cx="370" cy="340" r="16" fill="#1e293b" stroke="#475569" stroke-width="4"/>
      <circle cx="430" cy="340" r="20" fill="#1e293b" stroke="#475569" stroke-width="5"/>
      <rect x="380" y="280" width="35" height="25" rx="2" fill="#0284c7" opacity="0.9"/>
      <!-- Warning Cones -->
      <polygon points="170,410 185,370 200,410" fill="#ea580c" />
      <polygon points="600,410 615,370 630,410" fill="#ea580c" />
      <text x="400" y="375" text-anchor="middle" font-size="12" font-weight="700" fill="#f8fafc">
        WBM BED COURSE IN PROGRESS (DEMO)
      </text>
    `
  },
  {
    filename: 'road_after.svg',
    title: 'Road Construction & Pathway',
    stage: 'AFTER WORK',
    stageColor: '#10b981',
    projectId: 'PRJ_298A9603D74B',
    gps: '26.8467° N, 80.9463° E (Demo GPS)',
    timestamp: '2026-08-27 17:30:00 IST',
    bearing: '043° NE',
    accuracy: '±2.1m',
    bgGradient: '<stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>',
    graphicElements: `
      <!-- Paved smooth Bitumen Road -->
      <polygon points="60,420 740,420 460,270 340,270" fill="#18181b" />
      <!-- White Road Markings -->
      <line x1="400" y1="280" x2="400" y2="420" stroke="#f8fafc" stroke-width="6" stroke-dasharray="25,20"/>
      <line x1="120" y1="415" x2="350" y2="275" stroke="#f8fafc" stroke-width="3" />
      <line x1="680" y1="415" x2="450" y2="275" stroke="#f8fafc" stroke-width="3" />
      <!-- Concrete Curbs & Drainage -->
      <polygon points="30,420 60,420 340,270 325,270" fill="#94a3b8" />
      <polygon points="740,420 770,420 475,270 460,270" fill="#94a3b8" />
      <!-- Completed Milestone Stone -->
      <path d="M 640 370 A 15 15 0 0 1 670 370 L 670 415 L 640 415 Z" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
      <rect x="640" y="360" width="30" height="15" fill="#facc15" />
      <text x="655" y="395" text-anchor="middle" font-size="8" font-weight="800" fill="#0f172a">MPLADS</text>
      <text x="655" y="408" text-anchor="middle" font-size="8" font-weight="800" fill="#0f172a">COMPL</text>
    `
  },

  // 2. TUBE-WELL / BOREWELL (PRJ_615A0D94E08E) - Normal Demo
  {
    filename: 'borewell_before.svg',
    title: 'Installation of Tube-wells & Borewells',
    stage: 'BEFORE WORK',
    stageColor: '#64748b',
    projectId: 'PRJ_615A0D94E08E',
    gps: '18.4386° N, 79.1288° E (Demo GPS)',
    timestamp: '2026-07-10 11:10:00 IST',
    bearing: '180° S',
    accuracy: '±3.1m',
    bgGradient: '<stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1e293b"/>',
    graphicElements: `
      <!-- Open dry village ground plot -->
      <polygon points="0,420 800,420 800,260 0,260" fill="#713f12" opacity="0.6"/>
      <line x1="0" y1="260" x2="800" y2="260" stroke="#451a03" stroke-width="3"/>
      <!-- Survey stakes & string perimeter -->
      <polygon points="260,380 540,380 480,310 320,310" fill="#854d0e" opacity="0.4" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,4"/>
      <circle cx="400" cy="345" r="18" fill="#451a03" stroke="#ef4444" stroke-width="2"/>
      <text x="400" y="350" text-anchor="middle" font-size="10" font-weight="700" fill="#fef08a">SITE PEG</text>
      <!-- Dry ground cracks -->
      <path d="M 180 340 L 220 370 L 240 360 M 580 350 L 610 380" stroke="#451a03" stroke-width="2" fill="none"/>
    `
  },
  {
    filename: 'borewell_during.svg',
    title: 'Installation of Tube-wells & Borewells',
    stage: 'DURING WORK',
    stageColor: '#f59e0b',
    projectId: 'PRJ_615A0D94E08E',
    gps: '18.4386° N, 79.1287° E (Demo GPS)',
    timestamp: '2026-07-26 15:40:00 IST',
    bearing: '182° S',
    accuracy: '±2.5m',
    bgGradient: '<stop offset="0%" stop-color="#475569"/><stop offset="100%" stop-color="#334155"/>',
    graphicElements: `
      <!-- Drilling Rig Mast -->
      <line x1="400" y1="120" x2="400" y2="350" stroke="#facc15" stroke-width="12"/>
      <polygon points="360,350 440,350 410,130 390,130" fill="none" stroke="#eab308" stroke-width="4"/>
      <!-- Casing Pipe Stack -->
      <rect x="220" y="350" width="110" height="15" rx="3" fill="#38bdf8"/>
      <rect x="225" y="335" width="100" height="15" rx="3" fill="#38bdf8"/>
      <rect x="235" y="320" width="80" height="15" rx="3" fill="#38bdf8"/>
      <!-- Mud slurry collection pit -->
      <ellipse cx="530" cy="350" rx="55" ry="18" fill="#52525b" stroke="#3f3f46" stroke-width="3"/>
      <text x="530" y="355" text-anchor="middle" font-size="10" font-weight="700" fill="#e4e4e7">SLURRY PIT</text>
    `
  },
  {
    filename: 'borewell_after.svg',
    title: 'Installation of Tube-wells & Borewells',
    stage: 'AFTER WORK',
    stageColor: '#10b981',
    projectId: 'PRJ_615A0D94E08E',
    gps: '18.4385° N, 79.1288° E (Demo GPS)',
    timestamp: '2026-08-15 10:00:00 IST',
    bearing: '180° S',
    accuracy: '±1.8m',
    bgGradient: '<stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>',
    graphicElements: `
      <!-- Concrete Platform / Apron -->
      <ellipse cx="400" cy="350" rx="140" ry="40" fill="#cbd5e1" stroke="#94a3b8" stroke-width="4"/>
      <ellipse cx="400" cy="345" rx="125" ry="34" fill="#f1f5f9" />
      <!-- Borewell Handpump / Motor Stand -->
      <rect x="385" y="220" width="30" height="120" rx="4" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
      <rect x="375" y="210" width="50" height="15" rx="2" fill="#0369a1" />
      <line x1="390" y1="215" x2="320" y2="250" stroke="#0284c7" stroke-width="8" stroke-linecap="round"/>
      <!-- Discharge Spout & Water flow -->
      <path d="M 415 260 L 450 260 L 450 285" fill="none" stroke="#0284c7" stroke-width="6"/>
      <path d="M 450 285 Q 452 320 450 340" fill="none" stroke="#38bdf8" stroke-width="4" stroke-dasharray="4,2"/>
      <!-- Water drainage channel -->
      <path d="M 450 345 L 490 375 L 560 385" fill="none" stroke="#38bdf8" stroke-width="6"/>
      <!-- Government Scheme Board Plaque -->
      <rect x="230" y="270" width="90" height="60" rx="3" fill="#1e3a8a" stroke="#ffffff" stroke-width="2"/>
      <rect x="270" y="330" width="6" height="40" fill="#94a3b8"/>
      <text x="275" y="290" text-anchor="middle" font-size="9" font-weight="800" fill="#ffffff">MPLADS</text>
      <text x="275" y="305" text-anchor="middle" font-size="8" font-weight="600" fill="#93c5fd">TUBE-WELL</text>
      <text x="275" y="318" text-anchor="middle" font-size="7" font-weight="500" fill="#cbd5e1">COMMISSIONED</text>
    `
  },

  // 3. CREMATORIUM / PUBLIC CONVENIENCE (PRJ_B6FC3012D149)
  {
    filename: 'crematorium_before.svg',
    title: 'Public Convenience Structure',
    stage: 'BEFORE WORK',
    stageColor: '#64748b',
    projectId: 'PRJ_B6FC3012D149',
    gps: '15.2832° N, 73.9862° E (Demo GPS)',
    timestamp: '2026-06-02 08:30:00 IST',
    bearing: '270° W',
    accuracy: '±3.5m',
    bgGradient: '<stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1e293b"/>',
    graphicElements: `
      <!-- Open overgrown land plot -->
      <polygon points="0,420 800,420 800,270 0,270" fill="#3f3f46" opacity="0.7"/>
      <!-- Demarcation boundary flags -->
      <line x1="200" y1="360" x2="600" y2="360" stroke="#eab308" stroke-width="2" stroke-dasharray="8,6"/>
      <rect x="195" y="330" width="6" height="40" fill="#e2e8f0"/>
      <polygon points="201,330 225,320 201,310" fill="#ef4444"/>
      <rect x="595" y="330" width="6" height="40" fill="#e2e8f0"/>
      <polygon points="601,330 625,320 601,310" fill="#ef4444"/>
      <text x="400" y="385" text-anchor="middle" font-size="12" font-weight="700" fill="#e2e8f0">
        PLOT CLEARED FOR PUBLIC SHED STRUCTURE (DEMO)
      </text>
    `
  },
  {
    filename: 'crematorium_during.svg',
    title: 'Public Convenience Structure',
    stage: 'DURING WORK',
    stageColor: '#f59e0b',
    projectId: 'PRJ_B6FC3012D149',
    gps: '15.2831° N, 73.9863° E (Demo GPS)',
    timestamp: '2026-08-02 11:20:00 IST',
    bearing: '272° W',
    accuracy: '±2.4m',
    bgGradient: '<stop offset="0%" stop-color="#475569"/><stop offset="100%" stop-color="#334155"/>',
    graphicElements: `
      <!-- Concrete Pillars and roof trusses -->
      <rect x="250" y="240" width="22" height="150" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
      <rect x="385" y="240" width="22" height="150" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
      <rect x="520" y="240" width="22" height="150" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
      <!-- Steel roof truss frame -->
      <polygon points="230,240 396,170 560,240" fill="none" stroke="#0284c7" stroke-width="5"/>
      <line x1="290" y1="215" x2="290" y2="240" stroke="#0284c7" stroke-width="3"/>
      <line x1="500" y1="215" x2="500" y2="240" stroke="#0284c7" stroke-width="3"/>
      <line x1="396" y1="170" x2="396" y2="240" stroke="#0284c7" stroke-width="3"/>
      <!-- Brick masonry half wall -->
      <rect x="272" y="320" width="113" height="70" fill="#b45309" stroke="#78350f" stroke-width="1"/>
      <rect x="407" y="320" width="113" height="70" fill="#b45309" stroke="#78350f" stroke-width="1"/>
      <!-- Scaffolding -->
      <line x1="220" y1="200" x2="220" y2="390" stroke="#eab308" stroke-width="3"/>
      <line x1="240" y1="200" x2="240" y2="390" stroke="#eab308" stroke-width="3"/>
      <line x1="210" y1="280" x2="250" y2="280" stroke="#eab308" stroke-width="3"/>
    `
  },
  {
    filename: 'crematorium_after.svg',
    title: 'Public Convenience Structure',
    stage: 'AFTER WORK',
    stageColor: '#10b981',
    projectId: 'PRJ_B6FC3012D149',
    gps: '15.2832° N, 73.9862° E (Demo GPS)',
    timestamp: '2026-08-20 16:45:00 IST',
    bearing: '270° W',
    accuracy: '±1.9m',
    bgGradient: '<stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>',
    graphicElements: `
      <!-- Completed Covered Hall -->
      <polygon points="210,230 396,150 580,230" fill="#0284c7" stroke="#0369a1" stroke-width="3"/>
      <rect x="230" y="230" width="330" height="15" fill="#0369a1"/>
      <!-- Finished white washed pillars -->
      <rect x="250" y="245" width="26" height="145" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="385" y="245" width="26" height="145" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="520" y="245" width="26" height="145" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Paved floor plinth -->
      <polygon points="180,410 615,410 570,390 225,390" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Lighting fixtures & Fans -->
      <circle cx="330" cy="255" r="5" fill="#facc15"/>
      <circle cx="460" cy="255" r="5" fill="#facc15"/>
      <!-- Inauguration Plaque -->
      <rect x="285" y="300" width="80" height="50" rx="3" fill="#1e1b4b" stroke="#facc15" stroke-width="2"/>
      <text x="325" y="320" text-anchor="middle" font-size="8" font-weight="800" fill="#facc15">MPLADS GOA</text>
      <text x="325" y="333" text-anchor="middle" font-size="7" font-weight="600" fill="#ffffff">PUBLIC SHELTER</text>
    `
  },

  // 4. FOOT OVER BRIDGE (PRJ_C936F1824A2B)
  {
    filename: 'fob_before.svg',
    title: 'Pedestrian Foot Over Bridge (FOB)',
    stage: 'BEFORE WORK',
    stageColor: '#64748b',
    projectId: 'PRJ_C936F1824A2B',
    gps: '17.6896° N, 83.0034° E (Demo GPS)',
    timestamp: '2026-01-12 10:00:00 IST',
    bearing: '090° E',
    accuracy: '±3.2m',
    bgGradient: '<stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1e293b"/>',
    graphicElements: `
      <!-- Railway lines / highway transit point without bridge -->
      <rect x="0" y="320" width="800" height="90" fill="#1e293b"/>
      <!-- Parallel Railway tracks -->
      <line x1="0" y1="345" x2="800" y2="345" stroke="#94a3b8" stroke-width="4"/>
      <line x1="0" y1="365" x2="800" y2="365" stroke="#94a3b8" stroke-width="4"/>
      <line x1="0" y1="385" x2="800" y2="385" stroke="#94a3b8" stroke-width="4"/>
      <!-- Track Sleepers -->
      <line x1="80" y1="335" x2="80" y2="395" stroke="#64748b" stroke-width="4"/>
      <line x1="180" y1="335" x2="180" y2="395" stroke="#64748b" stroke-width="4"/>
      <line x1="280" y1="335" x2="280" y2="395" stroke="#64748b" stroke-width="4"/>
      <line x1="380" y1="335" x2="380" y2="395" stroke="#64748b" stroke-width="4"/>
      <line x1="480" y1="335" x2="480" y2="395" stroke="#64748b" stroke-width="4"/>
      <line x1="580" y1="335" x2="580" y2="395" stroke="#64748b" stroke-width="4"/>
      <line x1="680" y1="335" x2="680" y2="395" stroke="#64748b" stroke-width="4"/>
      <text x="400" y="300" text-anchor="middle" font-size="12" font-weight="700" fill="#f87171">
        HIGH PEDESTRIAN RISK CROSSING — FOB SANCTIONED (DEMO)
      </text>
    `
  },
  {
    filename: 'fob_during.svg',
    title: 'Pedestrian Foot Over Bridge (FOB)',
    stage: 'DURING WORK',
    stageColor: '#f59e0b',
    projectId: 'PRJ_C936F1824A2B',
    gps: '17.6897° N, 83.0035° E (Demo GPS)',
    timestamp: '2026-07-12 14:30:00 IST',
    bearing: '092° E',
    accuracy: '±2.2m',
    bgGradient: '<stop offset="0%" stop-color="#475569"/><stop offset="100%" stop-color="#334155"/>',
    graphicElements: `
      <!-- Heavy Concrete Piers on sides -->
      <rect x="120" y="190" width="45" height="180" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <rect x="635" y="190" width="45" height="180" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <!-- Steel Truss Span being lifted -->
      <rect x="150" y="170" width="500" height="35" fill="none" stroke="#f59e0b" stroke-width="6"/>
      <line x1="150" y1="170" x2="220" y2="205" stroke="#f59e0b" stroke-width="3"/>
      <line x1="220" y1="170" x2="290" y2="205" stroke="#f59e0b" stroke-width="3"/>
      <line x1="290" y1="170" x2="360" y2="205" stroke="#f59e0b" stroke-width="3"/>
      <line x1="360" y1="170" x2="430" y2="205" stroke="#f59e0b" stroke-width="3"/>
      <line x1="430" y1="170" x2="500" y2="205" stroke="#f59e0b" stroke-width="3"/>
      <line x1="500" y1="170" x2="570" y2="205" stroke="#f59e0b" stroke-width="3"/>
      <line x1="570" y1="170" x2="650" y2="205" stroke="#f59e0b" stroke-width="3"/>
      <!-- Crane Cable -->
      <line x1="400" y1="80" x2="350" y2="170" stroke="#facc15" stroke-width="3"/>
      <line x1="400" y1="80" x2="450" y2="170" stroke="#facc15" stroke-width="3"/>
    `
  },
  {
    filename: 'fob_after.svg',
    title: 'Pedestrian Foot Over Bridge (FOB)',
    stage: 'AFTER WORK',
    stageColor: '#10b981',
    projectId: 'PRJ_C936F1824A2B',
    gps: '17.6896° N, 83.0034° E (Demo GPS)',
    timestamp: '2026-08-28 16:15:00 IST',
    bearing: '090° E',
    accuracy: '±1.6m',
    bgGradient: '<stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>',
    graphicElements: `
      <!-- Complete FOB structure with canopy and stairs -->
      <rect x="120" y="190" width="45" height="180" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="635" y="190" width="45" height="180" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Bridge Walkway & Blue Canopy -->
      <path d="M 110 145 Q 400 130 690 145 L 690 165 Q 400 150 110 165 Z" fill="#0284c7" />
      <rect x="120" y="165" width="560" height="25" fill="#334155" stroke="#64748b" stroke-width="2"/>
      <!-- Glass / Mesh Safety Railing -->
      <rect x="120" y="155" width="560" height="15" fill="#38bdf8" opacity="0.3" stroke="#0284c7" stroke-width="1"/>
      <!-- Staircases on sides -->
      <line x1="120" y1="190" x2="60" y2="370" stroke="#64748b" stroke-width="10"/>
      <line x1="680" y1="190" x2="740" y2="370" stroke="#64748b" stroke-width="10"/>
      <!-- Station Signboard -->
      <rect x="330" y="170" width="140" height="16" rx="3" fill="#1e3a8a"/>
      <text x="400" y="182" text-anchor="middle" font-size="9" font-weight="800" fill="#ffffff">MPLADS FOB ANK</text>
    `
  }
];

images.forEach(img => {
  const content = createSvg(img);
  const filePath = path.join(targetDir, img.filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Generated:', filePath);
});

console.log('All 12 demo SVG images created successfully.');
