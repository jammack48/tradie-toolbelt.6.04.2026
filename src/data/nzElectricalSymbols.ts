import type {
  ElectricalSymbolCategory,
  ElectricalSymbolDefinition,
  ElectricalSymbolStyle,
} from "@/types/electricalSymbols";

export const ELECTRICAL_SYMBOL_CATEGORY_ORDER: ElectricalSymbolCategory[] = [
  "lights",
  "power",
  "switches",
  "data",
  "hvac",
  "safety",
];

export const ELECTRICAL_SYMBOL_CATEGORY_LABELS: Record<ElectricalSymbolCategory, string> = {
  lights: "Lights",
  power: "Power",
  switches: "Switches",
  data: "Data",
  hvac: "HVAC",
  safety: "Safety",
};

export const DEFAULT_ELECTRICAL_SYMBOL_STYLE: ElectricalSymbolStyle = {
  baseSize: 30,
  strokeWidth: 1.8,
};

export const DEFAULT_NZ_ELECTRICAL_SYMBOLS: ElectricalSymbolDefinition[] = [
  { id: "light-downlight", name: "Downlight", category: "lights", glyph: "downlight", size: 30, label: "DL" },
  { id: "light-pendant", name: "Pendant Light", category: "lights", glyph: "pendant-light", size: 32, label: "P" },
  { id: "light-wall", name: "Wall Light", category: "lights", glyph: "wall-light", size: 30, label: "WL" },
  { id: "light-fluoro", name: "Fluorescent Batten", category: "lights", glyph: "fluorescent", size: 34, label: "FL" },
  { id: "light-spot", name: "Spotlight", category: "lights", glyph: "spotlight", size: 30, label: "SP" },

  { id: "power-single", name: "Single Socket Outlet", category: "power", glyph: "single-socket", size: 32, label: "GPO" },
  { id: "power-double", name: "Double Socket Outlet", category: "power", glyph: "double-socket", size: 32, label: "DGPO" },
  { id: "power-switched", name: "Socket Outlet With Switch", category: "power", glyph: "switched-socket", size: 34, label: "SGPO" },

  { id: "switch-1way", name: "One Way Switch", category: "switches", glyph: "switch-1-way", size: 28, label: "S1" },
  { id: "switch-2way", name: "Two Way Switch", category: "switches", glyph: "switch-2-way", size: 28, label: "S2" },
  { id: "switch-dimmer", name: "Dimmer Switch", category: "switches", glyph: "dimmer", size: 28, label: "DIM" },

  { id: "data-rj45", name: "Data Outlet", category: "data", glyph: "data-outlet", size: 30, label: "DATA" },
  { id: "data-tv", name: "TV Outlet", category: "data", glyph: "tv-outlet", size: 30, label: "TV" },
  { id: "data-phone", name: "Phone Outlet", category: "data", glyph: "phone-outlet", size: 30, label: "TEL" },
  { id: "data-wifi", name: "WiFi Access Point", category: "data", glyph: "wifi-ap", size: 30, label: "AP" },

  { id: "hvac-indoor", name: "Heat Pump Indoor", category: "hvac", glyph: "heat-pump-indoor", size: 34, label: "HP-I" },
  { id: "hvac-outdoor", name: "Heat Pump Outdoor", category: "hvac", glyph: "heat-pump-outdoor", size: 34, label: "HP-O" },
  { id: "hvac-supply", name: "Supply Vent", category: "hvac", glyph: "supply-vent", size: 30, label: "SV" },
  { id: "hvac-return", name: "Return Air", category: "hvac", glyph: "return-air", size: 30, label: "RA" },
  { id: "hvac-thermostat", name: "Thermostat", category: "hvac", glyph: "thermostat", size: 28, label: "T" },

  { id: "safe-smoke", name: "Smoke Alarm", category: "safety", glyph: "smoke-alarm", size: 30, label: "SA" },
];
