import { useState, useRef, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import {
  BenchmarkFlagIcon,
  DrawParcelIcon,
  SwipeCompareIcon,
  SentinelTimelapseIcon,
  DossierIcon,
  PixelInspectorIcon,
} from "@/components/icons/EOIcons";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { getMap } from "@/components/map/MapCanvas";
import type { EUDRCommodity } from "@oxeous/shared-types";

export interface BenchmarkCase {
  id: string;
  commodityKey: "coffee" | "cocoa" | "rubber" | "palm_oil" | "soya";
  commodity: EUDRCommodity;
  label: string;
  country: string;
  countryCode: string;
  verdict: "COMPLIANT" | "NON-COMPLIANT" | "COMPLIANT (Art. 2(5) Exemption)";
  score: number;
  bbox: [number, number, number, number];
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
}

export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    id: "01_Colombia_Coffee",
    commodityKey: "coffee",
    commodity: "coffee",
    label: "Colombia Coffee (Terraces)",
    country: "Colombia",
    countryCode: "CO",
    verdict: "COMPLIANT",
    score: 0,
    bbox: [-75.482, 5.377, -75.4645, 5.3905],
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [-75.4820, 5.3820],
            [-75.4775, 5.3855],
            [-75.4740, 5.3830],
            [-75.4725, 5.3795],
            [-75.4760, 5.3770],
            [-75.4805, 5.3780],
            [-75.4820, 5.3820],
          ],
        ],
        [
          [
            [-75.4710, 5.3880],
            [-75.4670, 5.3905],
            [-75.4645, 5.3875],
            [-75.4660, 5.3840],
            [-75.4700, 5.3850],
            [-75.4710, 5.3880],
          ],
        ],
      ],
    },
  },
  {
    id: "02_Ghana_Cocoa",
    commodityKey: "cocoa",
    commodity: "cocoa",
    label: "Ghana Cocoa (Cooperative)",
    country: "Ghana",
    countryCode: "GH",
    verdict: "NON-COMPLIANT",
    score: 100,
    bbox: [-1.9835, 6.8615, -1.9645, 6.8865],
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [-1.9835, 6.8785],
            [-1.9790, 6.8815],
            [-1.9765, 6.8790],
            [-1.9750, 6.8750],
            [-1.9785, 6.8720],
            [-1.9830, 6.8735],
            [-1.9835, 6.8785],
          ],
        ],
        [
          [
            [-1.9720, 6.8840],
            [-1.9675, 6.8865],
            [-1.9645, 6.8825],
            [-1.9665, 6.8780],
            [-1.9710, 6.8795],
            [-1.9720, 6.8840],
          ],
        ],
        [
          [
            [-1.9810, 6.8670],
            [-1.9770, 6.8690],
            [-1.9740, 6.8655],
            [-1.9780, 6.8615],
            [-1.9820, 6.8630],
            [-1.9810, 6.8670],
          ],
        ],
      ],
    },
  },
  {
    id: "03_Thailand_Rubber",
    commodityKey: "rubber",
    commodity: "rubber",
    label: "Thailand Rubber (River Bend)",
    country: "Thailand",
    countryCode: "TH",
    verdict: "COMPLIANT (Art. 2(5) Exemption)",
    score: 18,
    bbox: [100.505, 6.8065, 100.5225, 6.8195],
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [100.5050, 6.8120],
          [100.5085, 6.8160],
          [100.5130, 6.8185],
          [100.5180, 6.8195],
          [100.5215, 6.8170],
          [100.5225, 6.8130],
          [100.5200, 6.8095],
          [100.5160, 6.8075],
          [100.5120, 6.8065],
          [100.5080, 6.8075],
          [100.5055, 6.8095],
          [100.5050, 6.8120],
        ],
      ],
    },
  },
  {
    id: "04_Indonesia_Palm_Oil",
    commodityKey: "palm_oil",
    commodity: "palm_oil",
    label: "Indonesia Palm Oil (Peat Blocks)",
    country: "Indonesia",
    countryCode: "ID",
    verdict: "NON-COMPLIANT",
    score: 100,
    bbox: [102.188, 0.2565, 102.206, 0.2745],
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [102.1880, 0.2620],
            [102.1950, 0.2635],
            [102.1965, 0.2580],
            [102.1895, 0.2565],
            [102.1880, 0.2620],
          ],
        ],
        [
          [
            [102.1980, 0.2680],
            [102.2045, 0.2695],
            [102.2060, 0.2635],
            [102.1995, 0.2620],
            [102.1980, 0.2680],
          ],
        ],
        [
          [
            [102.1910, 0.2730],
            [102.1975, 0.2745],
            [102.1990, 0.2690],
            [102.1925, 0.2675],
            [102.1910, 0.2730],
          ],
        ],
      ],
    },
  },
  {
    id: "05_Brazil_Soya",
    commodityKey: "soya",
    commodity: "soya",
    label: "Brazil Soya (Riparian Frontier)",
    country: "Brazil",
    countryCode: "BR",
    verdict: "NON-COMPLIANT",
    score: 92,
    bbox: [-55.345, -11.588, -55.321, -11.567],
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-55.3450, -11.5780],
          [-55.3390, -11.5720],
          [-55.3320, -11.5680],
          [-55.3260, -11.5670],
          [-55.3220, -11.5710],
          [-55.3210, -11.5770],
          [-55.3235, -11.5830],
          [-55.3280, -11.5865],
          [-55.3340, -11.5880],
          [-55.3400, -11.5860],
          [-55.3440, -11.5825],
          [-55.3450, -11.5780],
        ],
      ],
    },
  },
  {
    id: "06_Cote_dIvoire_Cocoa",
    commodityKey: "cocoa",
    commodity: "cocoa",
    label: "Côte d'Ivoire Cocoa (Agroforestry)",
    country: "Côte d'Ivoire",
    countryCode: "CI",
    verdict: "COMPLIANT",
    score: 5,
    bbox: [-7.385, 6.7115, -7.367, 6.7335],
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [-7.3850, 6.7250],
            [-7.3800, 6.7280],
            [-7.3770, 6.7240],
            [-7.3790, 6.7200],
            [-7.3840, 6.7215],
            [-7.3850, 6.7250],
          ],
        ],
        [
          [
            [-7.3740, 6.7310],
            [-7.3700, 6.7335],
            [-7.3670, 6.7300],
            [-7.3690, 6.7265],
            [-7.3735, 6.7275],
            [-7.3740, 6.7310],
          ],
        ],
        [
          [
            [-7.3820, 6.7160],
            [-7.3775, 6.7185],
            [-7.3750, 6.7145],
            [-7.3785, 6.7115],
            [-7.3825, 6.7130],
            [-7.3820, 6.7160],
          ],
        ],
      ],
    },
  },
];

export default function TopFloatingBar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    setActiveGeoJSON,
    setEudrPanelOpen,
    setActiveDossier,
    drawingAOI,
    setDrawingAOI,
    compareMode,
    setCompareMode,
    pixelInspectorOpen,
    setPixelInspectorOpen,
    rightPanel,
    setRightPanel,
    setEudrAuditTab,
  } = useStore();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCase = (c: BenchmarkCase) => {
    setActiveGeoJSON(c.geometry);
    setEudrPanelOpen(true);
    setDropdownOpen(false);

    const fn = (window as Window & { oxeousFlyTo?: (b: [number, number, number, number]) => void }).oxeousFlyTo;
    fn?.(c.bbox);
  };

  return (
    <div className="absolute bottom-4 right-3 z-30 flex flex-col items-center gap-1.5 bg-white/95 backdrop-blur-md border border-[#C8CFD5] shadow-panel rounded-xl p-1.5 select-none transition-all">

      {/* 1. Map Zoom In & Zoom Out Controls */}
      <button
        onClick={() => getMap()?.zoomIn()}
        aria-label="Zoom In (+)"
        title="Zoom In (+)"
        className="group relative p-2.5 rounded-lg text-[#343B42] hover:bg-[#E3E7EA] hover:text-[#1D2227] transition-all cursor-pointer active:scale-95"
      >
        <Plus className="w-5 h-5 text-[#343B42]" />
        <span className="oxe-tip" data-side="left">
          Zoom In <small>Enlarge map (+)</small>
        </span>
      </button>

      <button
        onClick={() => getMap()?.zoomOut()}
        aria-label="Zoom Out (-)"
        title="Zoom Out (-)"
        className="group relative p-2.5 rounded-lg text-[#343B42] hover:bg-[#E3E7EA] hover:text-[#1D2227] transition-all cursor-pointer active:scale-95"
      >
        <Minus className="w-5 h-5 text-[#343B42]" />
        <span className="oxe-tip" data-side="left">
          Zoom Out <small>Reduce map (-)</small>
        </span>
      </button>

      <div className="w-6 h-[1px] bg-[#C8CFD5]/80 my-0.5" />

      {/* 2. Benchmark Case Studies Trigger (Opens popover to the LEFT) */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label={`Benchmark Case Studies (${BENCHMARK_CASES.length})`}
          className={cn(
            "group relative flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-medium transition-all cursor-pointer",
            dropdownOpen
              ? "bg-[#315F50]/15 text-[#315F50] border border-[#315F50]/40 shadow-xs font-semibold"
              : "text-[#343B42] hover:bg-[#E3E7EA] hover:text-[#1D2227]"
          )}
        >
          <BenchmarkFlagIcon className="w-5 h-5 text-[#315F50]" />
          <span className="text-[9px] font-mono font-bold text-[#315F50] -mt-0.5">{BENCHMARK_CASES.length}</span>

          {/* Glass Tooltip */}
          <span className="oxe-tip" data-side="left">
            Benchmarks <small>{BENCHMARK_CASES.length} statutory test plots</small>
          </span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-full bottom-0 mr-2.5 w-64 bg-white border border-[#C8CFD5] rounded-xl shadow-panel-lg p-1.5 z-50 animate-in fade-in slide-in-from-right-1 duration-150">
            <div className="px-2 py-1 border-b border-[#E3E7EA] mb-1 flex items-center justify-between text-[10px] text-[#747F88] font-mono">
              <span>EUDR BENCHMARK PLOTS</span>
              <span>{BENCHMARK_CASES.length} PLOTS</span>
            </div>
            <div className="space-y-0.5 max-h-72 overflow-y-auto">
              {BENCHMARK_CASES.map((c) => {
                const isCompliant = c.verdict.startsWith("COMPLIANT");
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCase(c)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-[#F4F5F6] transition-colors group cursor-pointer"
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border",
                      isCompliant ? "bg-[rgba(49,95,80,0.1)] border-[rgba(49,95,80,0.25)] text-[#315F50]" : "bg-[rgba(166,75,69,0.1)] border-[rgba(166,75,69,0.25)] text-[#A64B45]"
                    )}>
                      <BenchmarkFlagIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-[#1D2227] group-hover:text-[#315F50] transition-colors truncate">
                        {c.label}
                      </p>
                      <p className="text-[10px] text-[#747F88] font-mono truncate">
                        {c.country} - Score: {c.score}/100
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Draw AOI Polygon Button */}
      <button
        onClick={() => setDrawingAOI(!drawingAOI)}
        aria-label={drawingAOI ? "Finish Polygon Drawing" : "Draw Area of Interest (AOI)"}
        className={cn(
          "group relative p-2.5 rounded-lg transition-all cursor-pointer border",
          drawingAOI
            ? "bg-[#315F50]/15 text-[#315F50] border-[#315F50]/40 shadow-xs font-semibold"
            : "border-transparent text-[#343B42] hover:bg-[#E3E7EA] hover:text-[#1D2227]"
        )}
      >
        <DrawParcelIcon className="w-5 h-5 text-[#315F50]" />
        <span className="oxe-tip" data-side="left">
          {drawingAOI ? "Finish AOI" : "Draw AOI"} <small>Custom polygon tool</small>
        </span>
      </button>

      {/* 4. Compare Cutoff Splitter Toggle */}
      <button
        onClick={() => setCompareMode(!compareMode)}
        aria-label={compareMode ? "Exit Swipe Compare" : "Compare Dec 2020 Baseline vs Disturbance"}
        className={cn(
          "group relative p-2.5 rounded-lg transition-all cursor-pointer border",
          compareMode
            ? "bg-[#315F50]/15 text-[#315F50] border-[#315F50]/40 shadow-xs font-semibold"
            : "border-transparent text-[#343B42] hover:bg-[#E3E7EA] hover:text-[#1D2227]"
        )}
      >
        <SwipeCompareIcon className="w-5 h-5 text-[#315F50]" />
        <span className="oxe-tip" data-side="left">
          {compareMode ? "Comparing" : "Swipe Compare"} <small>2020 Baseline vs Disturbance</small>
        </span>
      </button>

      {/* 5. 10m Sentinel-2 Plot Timelapse Toggle */}
      <button
        onClick={() => {
          setEudrAuditTab("timelapse");
          setRightPanel(rightPanel === "timelapse" ? null : "timelapse");
        }}
        aria-label={rightPanel === "timelapse" ? "Close Plot Timelapse" : "10m Sentinel-2 Plot Timelapse (2020–2025)"}
        className={cn(
          "group relative p-2.5 rounded-lg transition-all cursor-pointer border",
          rightPanel === "timelapse"
            ? "bg-[#315F50]/15 text-[#315F50] border-[#315F50]/40 shadow-xs font-semibold"
            : "border-transparent text-[#343B42] hover:bg-[#E3E7EA] hover:text-[#1D2227]"
        )}
      >
        <SentinelTimelapseIcon className="w-5 h-5 text-[#315F50]" />
        <span className="oxe-tip" data-side="left">
          Plot Timelapse <small>10m S2 video (2020–2025)</small>
        </span>
      </button>

      {/* 6. Pixel Inspector Toggle */}
      <button
        onClick={() => setPixelInspectorOpen(!pixelInspectorOpen)}
        aria-label={pixelInspectorOpen ? "Close Pixel Inspector" : "Spatial Pixel Inspector"}
        className={cn(
          "group relative p-2.5 rounded-lg transition-all cursor-pointer border",
          pixelInspectorOpen
            ? "bg-[#315F50]/15 text-[#315F50] border-[#315F50]/40 shadow-xs font-semibold"
            : "border-transparent text-[#343B42] hover:bg-[#E3E7EA] hover:text-[#1D2227]"
        )}
      >
        <PixelInspectorIcon className="w-5 h-5 text-[#315F50]" />
        <span className="oxe-tip" data-side="left">
          {pixelInspectorOpen ? "Close Inspector" : "Pixel Inspector"} <small>Inspect plot pixels</small>
        </span>
      </button>

      {/* 6. View Dossier Library Button */}
      <button
        onClick={() => setActiveDossier("cocoa")}
        aria-label="Publication Dossier Library"
        className="group relative p-2.5 rounded-lg text-[#343B42] hover:bg-[#E3E7EA] hover:text-[#1D2227] transition-all cursor-pointer border border-transparent"
      >
        <DossierIcon className="w-5 h-5 text-[#315F50]" />
        <span className="oxe-tip" data-side="left">
          Dossier Library <small>Official publication report</small>
        </span>
      </button>

    </div>
  );
}
