// Single source of truth for the marketing site.
// Every dossier figure below is copied from the generated audit reports in /public/dossiers.

/** Public contact for pilot requests. Change this one line to re-route all enquiries. */
export const CONTACT_EMAIL = "hanzilabinyounus@gmail.com";

/** EUDR application date shown on the regulation poster. */
export const EUDR_APPLIES_ISO = "2026-12-31T00:00:00";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const asset = (p: string) => `${BASE}${p}`;

export type Verdict = "compliant" | "non-compliant";

export interface Dossier {
  id: "colombia" | "ghana" | "thailand" | "indonesia";
  commodity: "Coffee" | "Cocoa" | "Rubber" | "Palm oil";
  place: string;
  region: string;
  country: string;
  refId: string;
  hectares: number;
  verdict: Verdict;
  risk: number; // risk score out of 100, as printed in the dossier
  lossHa: number;
  lossNote: string;
  stats: { label: string; value: string }[];
  finding: string;
  mapLegend: { swatch: string; label: string; outline?: boolean }[];
  heatLabel: string;
  folder: string;
  file: string;
}

export const DOSSIERS: Dossier[] = [
  {
    id: "colombia",
    commodity: "Coffee",
    place: "Salamina",
    region: "Caldas · Eje Cafetero",
    country: "Colombia",
    refId: "EUDR-CO-01230-COFFEE",
    hectares: 123.21,
    verdict: "compliant",
    risk: 0,
    lossHa: 0,
    lossNote: "zero loss pixels, 2021 to 2025",
    stats: [
      { label: "2000 baseline canopy", value: "61.78%" },
      { label: "Coffee presence, FDP 10 m", value: "61.84%" },
      { label: "Native legume shade", value: "49.30%" },
    ],
    finding:
      "Shade-grown arabica inside the UNESCO Coffee Cultural Landscape. Not one loss pixel after the cutoff, so the plot clears.",
    mapLegend: [
      { swatch: "#F5C518", label: "Sourcing unit boundary", outline: true },
      { swatch: "#F44848", label: "Post-2020 loss: none detected" },
    ],
    heatLabel: "Coffee canopy probability",
    folder: "01_Colombia_Coffee",
    file: "EUDR_Compliance_Audit_Report_Colombia_Coffee",
  },
  {
    id: "ghana",
    commodity: "Cocoa",
    place: "Ashanti belt",
    region: "Western Forest Corridor",
    country: "Ghana",
    refId: "EUDR-GH-12321-COCOA",
    hectares: 12321,
    verdict: "non-compliant",
    risk: 100,
    lossHa: 4693.3,
    lossNote: "38.41% of the unit",
    stats: [
      { label: "2000 baseline canopy", value: "95.47%" },
      { label: "Forest left at cutoff", value: "40.14%" },
      { label: "Protected reserves", value: "Tano Ofin, Tinte Bepo" },
    ],
    finding:
      "An active clearing frontier runs inside two gazetted forest reserves. 95.7% of the 2020 canopy in the unit is gone.",
    mapLegend: [
      { swatch: "#F5C518", label: "Sourcing unit boundary", outline: true },
      { swatch: "#F44848", label: "Post-2020 loss (Hansen GFC v1.13)" },
      { swatch: "#F44848", label: "Gazetted forest reserves", outline: true },
    ],
    heatLabel: "Cocoa canopy density",
    folder: "02_Ghana_Cocoa",
    file: "EUDR_Compliance_Audit_Report_Ghana_Cocoa",
  },
  {
    id: "thailand",
    commodity: "Rubber",
    place: "Sadao",
    region: "Songkhla rubber belt",
    country: "Thailand",
    refId: "EUDR-TH-10051-RUBBER",
    hectares: 122.77,
    verdict: "non-compliant",
    risk: 100,
    lossHa: 23.26,
    lossNote: "18.94% of the parcel",
    stats: [
      { label: "2000 baseline canopy", value: "56.16%" },
      { label: "Rubber model, FDP 10 m", value: "96.10%" },
      { label: "Native forest 2020", value: "56.16%" },
    ],
    finding:
      "Standing native forest was cleared inside the rubber concession after the cutoff. The red blocks are exactly where it went.",
    mapLegend: [
      { swatch: "#F5C518", label: "Sourcing unit boundary", outline: true },
      { swatch: "#F44848", label: "Post-2020 loss (Hansen GFC v1.13)" },
    ],
    heatLabel: "Rubber canopy probability",
    folder: "03_Thailand_Rubber",
    file: "EUDR_Compliance_Audit_Report_Thailand_Rubber",
  },
  {
    id: "indonesia",
    commodity: "Palm oil",
    place: "Pelalawan",
    region: "Riau · Kampar buffer",
    country: "Indonesia",
    refId: "EUDR-ID-10052-PALM",
    hectares: 123.64,
    verdict: "non-compliant",
    risk: 100,
    lossHa: 26.71,
    lossNote: "21.60% of the parcel",
    stats: [
      { label: "2000 baseline canopy", value: "86.72%" },
      { label: "Palm model, FDP 10 m", value: "37.18%" },
      { label: "Natural forest 2020", value: "84.80%" },
    ],
    finding:
      "Dense peat swamp forest cleared along the canal frontier ahead of replanting. Clear-cut between 2021 and 2024.",
    mapLegend: [
      { swatch: "#F5C518", label: "Sourcing unit boundary", outline: true },
      { swatch: "#F44848", label: "Post-2020 loss (Hansen GFC v1.13)" },
    ],
    heatLabel: "Palm canopy density",
    folder: "04_Indonesia_Palm_Oil",
    file: "EUDR_Compliance_Audit_Report_Indonesia_Palm_Oil",
  },
];

export const dossierById = (id: Dossier["id"]) => DOSSIERS.find((d) => d.id === id)!;
export const pdfHref = (d: Dossier) => asset(`/dossiers/${d.folder}/${d.file}.pdf`);
export const htmlHref = (d: Dossier) => asset(`/dossiers/${d.folder}/${d.file}.html`);

/** Commodities named on the regulation poster, in poster order starting at the top. */
export const COMMODITIES = [
  { key: "cattle", label: "Cattle", dossier: null },
  { key: "cocoa", label: "Cocoa", dossier: "ghana" },
  { key: "coffee", label: "Coffee", dossier: "colombia" },
  { key: "palm", label: "Palm oil", dossier: "indonesia" },
  { key: "rubber", label: "Rubber", dossier: "thailand" },
  { key: "soy", label: "Soy", dossier: null },
  { key: "wood", label: "Wood", dossier: null },
] as const;
export type CommodityKey = (typeof COMMODITIES)[number]["key"];

/** The six domain agents (README: agents/ A1 to A6 + supervisor). */
export const AGENT_LANES = [
  {
    lane: "Remote sensing",
    agents: [
      { code: "A1", name: "Optical", text: "Sentinel-2 10 m canopy and NDVI, read against the 2020 baseline." },
      { code: "A2", name: "SAR radar", text: "Sentinel-1 backscatter. Keeps working when cloud blinds optical." },
    ],
  },
  {
    lane: "Geospatial",
    agents: [
      { code: "A3", name: "Cadastre and WDPA", text: "Land registry and protected-area overlaps, such as gazetted reserves." },
      { code: "A4", name: "Topological carve-out", text: "Trims boundary slivers so clean ground is not condemned with the bad." },
    ],
  },
  {
    lane: "Regulatory",
    agents: [
      { code: "A5", name: "Statutory legal", text: "Applies Regulation (EU) 2023/1115, including Article 2(5) exemptions." },
      { code: "A6", name: "Biophysical yield cap", text: "Caps declared volume at what the land can physically grow. Stops laundering." },
    ],
  },
] as const;

