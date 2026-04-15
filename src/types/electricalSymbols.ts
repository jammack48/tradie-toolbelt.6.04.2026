export type ElectricalSymbolCategory = "lights" | "power" | "switches" | "data" | "hvac" | "safety";

export type ElectricalSymbolGlyph =
  | "downlight"
  | "pendant-light"
  | "wall-light"
  | "fluorescent"
  | "spotlight"
  | "single-socket"
  | "double-socket"
  | "switched-socket"
  | "switch-1-way"
  | "switch-2-way"
  | "dimmer"
  | "data-outlet"
  | "tv-outlet"
  | "phone-outlet"
  | "wifi-ap"
  | "heat-pump-indoor"
  | "heat-pump-outdoor"
  | "supply-vent"
  | "return-air"
  | "thermostat"
  | "smoke-alarm"
  | "custom-tag";

export interface ElectricalSymbolDefinition {
  id: string;
  name: string;
  category: ElectricalSymbolCategory;
  glyph: ElectricalSymbolGlyph;
  size: number;
  label?: string;
  isCustom?: boolean;
}

export interface ElectricalSymbolStyle {
  baseSize: number;
  strokeWidth: number;
}

export interface ElectricalSymbolLibrarySnapshot {
  symbols: ElectricalSymbolDefinition[];
  style: ElectricalSymbolStyle;
}

export interface ElectricalSymbolPlacement {
  id: string;
  symbolId: string;
  x: number;
  y: number;
  rotation: number;
  label?: string;
  sizeOverride?: number;
}

export interface ElectricalPlanSnapshot {
  backgroundImage: string | null;
  placements: ElectricalSymbolPlacement[];
}
