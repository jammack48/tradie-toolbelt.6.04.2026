import {
  DEFAULT_ELECTRICAL_SYMBOL_STYLE,
  DEFAULT_NZ_ELECTRICAL_SYMBOLS,
} from "@/data/nzElectricalSymbols";
import type {
  ElectricalPlanSnapshot,
  ElectricalSymbolCategory,
  ElectricalSymbolDefinition,
  ElectricalSymbolGlyph,
  ElectricalSymbolLibrarySnapshot,
  ElectricalSymbolPlacement,
  ElectricalSymbolStyle,
} from "@/types/electricalSymbols";

const SYMBOL_LIBRARY_KEY = "tt_nz_electrical_symbol_library_v1";
const PLAN_KEY_PREFIX = "tt_nz_electrical_plan_v1_";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isCategory = (value: unknown): value is ElectricalSymbolCategory =>
  value === "lights" ||
  value === "power" ||
  value === "switches" ||
  value === "data" ||
  value === "hvac" ||
  value === "safety";

const isGlyph = (value: unknown): value is ElectricalSymbolGlyph =>
  value === "downlight" ||
  value === "pendant-light" ||
  value === "wall-light" ||
  value === "fluorescent" ||
  value === "spotlight" ||
  value === "single-socket" ||
  value === "double-socket" ||
  value === "switched-socket" ||
  value === "switch-1-way" ||
  value === "switch-2-way" ||
  value === "dimmer" ||
  value === "data-outlet" ||
  value === "tv-outlet" ||
  value === "phone-outlet" ||
  value === "wifi-ap" ||
  value === "heat-pump-indoor" ||
  value === "heat-pump-outdoor" ||
  value === "supply-vent" ||
  value === "return-air" ||
  value === "thermostat" ||
  value === "smoke-alarm" ||
  value === "custom-tag";

const isString = (value: unknown): value is string => typeof value === "string";
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const parseStyle = (value: unknown): ElectricalSymbolStyle => {
  const style = (value ?? {}) as Partial<ElectricalSymbolStyle>;
  return {
    baseSize: clamp(isFiniteNumber(style.baseSize) ? style.baseSize : DEFAULT_ELECTRICAL_SYMBOL_STYLE.baseSize, 18, 72),
    strokeWidth: clamp(isFiniteNumber(style.strokeWidth) ? style.strokeWidth : DEFAULT_ELECTRICAL_SYMBOL_STYLE.strokeWidth, 0.8, 4),
  };
};

const parseSymbol = (value: unknown): ElectricalSymbolDefinition | null => {
  const symbol = (value ?? {}) as Partial<ElectricalSymbolDefinition>;
  if (!isString(symbol.id) || !isString(symbol.name) || !isCategory(symbol.category) || !isGlyph(symbol.glyph)) {
    return null;
  }

  return {
    id: symbol.id,
    name: symbol.name,
    category: symbol.category,
    glyph: symbol.glyph,
    size: clamp(isFiniteNumber(symbol.size) ? symbol.size : DEFAULT_ELECTRICAL_SYMBOL_STYLE.baseSize, 18, 72),
    label: isString(symbol.label) ? symbol.label : undefined,
    isCustom: Boolean(symbol.isCustom),
  };
};

const parsePlacement = (value: unknown): ElectricalSymbolPlacement | null => {
  const placement = (value ?? {}) as Partial<ElectricalSymbolPlacement>;
  if (!isString(placement.id) || !isString(placement.symbolId)) return null;

  return {
    id: placement.id,
    symbolId: placement.symbolId,
    x: clamp(isFiniteNumber(placement.x) ? placement.x : 0.5, 0, 1),
    y: clamp(isFiniteNumber(placement.y) ? placement.y : 0.5, 0, 1),
    rotation: isFiniteNumber(placement.rotation) ? placement.rotation : 0,
    label: isString(placement.label) ? placement.label : undefined,
    sizeOverride: isFiniteNumber(placement.sizeOverride) ? clamp(placement.sizeOverride, 16, 80) : undefined,
  };
};

const mergeWithDefaults = (symbols: ElectricalSymbolDefinition[]): ElectricalSymbolDefinition[] => {
  const byId = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  const mergedDefaults = DEFAULT_NZ_ELECTRICAL_SYMBOLS.map((defaultSymbol) => {
    const override = byId.get(defaultSymbol.id);
    if (!override) return defaultSymbol;
    return {
      ...defaultSymbol,
      ...override,
      isCustom: false,
    };
  });

  const customSymbols = symbols.filter((symbol) => symbol.isCustom && !DEFAULT_NZ_ELECTRICAL_SYMBOLS.some((base) => base.id === symbol.id));
  return [...mergedDefaults, ...customSymbols];
};

export function loadElectricalSymbolLibrary(): ElectricalSymbolLibrarySnapshot {
  try {
    const raw = localStorage.getItem(SYMBOL_LIBRARY_KEY);
    if (!raw) {
      return {
        symbols: DEFAULT_NZ_ELECTRICAL_SYMBOLS,
        style: DEFAULT_ELECTRICAL_SYMBOL_STYLE,
      };
    }

    const parsed = JSON.parse(raw) as Partial<ElectricalSymbolLibrarySnapshot>;
    const parsedSymbols = Array.isArray(parsed.symbols)
      ? parsed.symbols.map(parseSymbol).filter((symbol): symbol is ElectricalSymbolDefinition => Boolean(symbol))
      : [];

    return {
      symbols: mergeWithDefaults(parsedSymbols),
      style: parseStyle(parsed.style),
    };
  } catch {
    return {
      symbols: DEFAULT_NZ_ELECTRICAL_SYMBOLS,
      style: DEFAULT_ELECTRICAL_SYMBOL_STYLE,
    };
  }
}

export function saveElectricalSymbolLibrary(snapshot: ElectricalSymbolLibrarySnapshot): void {
  try {
    localStorage.setItem(
      SYMBOL_LIBRARY_KEY,
      JSON.stringify({
        symbols: snapshot.symbols,
        style: snapshot.style,
      }),
    );
  } catch {
    // Ignore quota and private browsing issues.
  }
}

const planStorageKey = (jobId: string) => `${PLAN_KEY_PREFIX}${jobId}`;

export function loadElectricalPlan(jobId: string): ElectricalPlanSnapshot {
  try {
    const raw = localStorage.getItem(planStorageKey(jobId));
    if (!raw) return { backgroundImage: null, placements: [] };
    const parsed = JSON.parse(raw) as Partial<ElectricalPlanSnapshot>;
    const placements = Array.isArray(parsed.placements)
      ? parsed.placements.map(parsePlacement).filter((placement): placement is ElectricalSymbolPlacement => Boolean(placement))
      : [];
    return {
      backgroundImage: isString(parsed.backgroundImage) ? parsed.backgroundImage : null,
      placements,
    };
  } catch {
    return { backgroundImage: null, placements: [] };
  }
}

export function saveElectricalPlan(jobId: string, snapshot: ElectricalPlanSnapshot): void {
  try {
    localStorage.setItem(
      planStorageKey(jobId),
      JSON.stringify({
        backgroundImage: snapshot.backgroundImage,
        placements: snapshot.placements,
      }),
    );
  } catch {
    // Ignore quota and private browsing issues.
  }
}
