import type { Trade } from "@/contexts/AppModeContext";

export type StoredAppMode = "manage" | "work" | "sole-trader" | "timesheet" | "intro";

export type BusinessProfile = {
  lastWorkspaceMode?: StoredAppMode;
  trade?: Trade;
  /** First name or nickname for tools / schedule greeting */
  displayName?: string;
  businessName?: string;
  abn?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
};

function pickStr(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" ? v : undefined;
}

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
  const s = (k: keyof BusinessProfile) => pickStr(o, k as string);
  out.displayName = s("displayName");
  out.businessName = s("businessName");
  out.abn = s("abn");
  out.phone = s("phone");
  out.email = s("email");
  out.address = s("address");
  out.website = s("website");
  return out;
}

/** First word of display name, else first word of business name — for “G'day, X”. */
export function toolsGreetingFirstName(profile: BusinessProfile): string {
  const d = (profile.displayName ?? "").trim();
  if (d) return d.split(/\s+/)[0] ?? d;
  const b = (profile.businessName ?? "").trim();
  if (b) return b.split(/\s+/)[0] ?? b;
  return "";
}

export function toolsGreetingLabel(profile: BusinessProfile): string {
  const n = toolsGreetingFirstName(profile);
  return n || "Not set";
}
