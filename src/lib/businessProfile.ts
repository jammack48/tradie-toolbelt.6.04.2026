import type { Trade } from "@/contexts/AppModeContext";

export type StoredAppMode = "manage" | "work" | "sole-trader" | "timesheet" | "intro";

export type BusinessProfile = {
  lastWorkspaceMode?: StoredAppMode;
  trade?: Trade;
};

export function parseBusinessProfile(raw: unknown): BusinessProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const mode = o.lastWorkspaceMode;
  const trade = o.trade;
  const out: BusinessProfile = {};
  if (
    mode === "manage" ||
    mode === "work" ||
    mode === "sole-trader" ||
    mode === "timesheet" ||
    mode === "intro"
  ) {
    out.lastWorkspaceMode = mode;
  }
  const validTrades: Trade[] = [
    "electrical",
    "hvac",
    "plumbing",
    "glazing",
    "building",
    "mechanic",
    "painting",
    "landscaping",
    "roofer",
  ];
  if (typeof trade === "string" && validTrades.includes(trade as Trade)) {
    out.trade = trade as Trade;
  }
  return out;
}
