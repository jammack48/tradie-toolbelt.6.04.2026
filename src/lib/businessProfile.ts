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
  /** Quote delivery: email subject (placeholders {{customer_name}}, {{business_name}}, {{quote_total}}, {{job_address}}) */
  quoteEmailSubject?: string;
  quoteEmailBody?: string;
  quoteSmsBody?: string;
};

/** Defaults aligned with dummyTemplates e-q-1 / s-q-1 */
export const DEFAULT_QUOTE_EMAIL_SUBJECT = "Your quote from {{business_name}} is ready";

export const DEFAULT_QUOTE_EMAIL_BODY =
  "Hi {{customer_name}},\n\nThanks for getting in touch. Please find your quote for ${{quote_total}} below.\n\nLet us know if you have any questions.\n\nCheers,\n{{business_name}}";

export const DEFAULT_QUOTE_SMS_BODY =
  "Hi {{customer_name}}, your quote for ${{quote_total}} from {{business_name}} is ready. Check your email for details!";

export const QUOTE_TEMPLATE_VARIABLE_HINTS = [
  "{{customer_name}}",
  "{{business_name}}",
  "{{quote_total}}",
  "{{job_address}}",
] as const;

export function quoteMessagingFromProfile(profile: BusinessProfile): {
  quoteEmailSubject: string;
  quoteEmailBody: string;
  quoteSmsBody: string;
} {
  return {
    quoteEmailSubject: (profile.quoteEmailSubject ?? "").trim() || DEFAULT_QUOTE_EMAIL_SUBJECT,
    quoteEmailBody: (profile.quoteEmailBody ?? "").trim() || DEFAULT_QUOTE_EMAIL_BODY,
    quoteSmsBody: (profile.quoteSmsBody ?? "").trim() || DEFAULT_QUOTE_SMS_BODY,
  };
}

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
  out.quoteEmailSubject = s("quoteEmailSubject");
  out.quoteEmailBody = s("quoteEmailBody");
  out.quoteSmsBody = s("quoteSmsBody");
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
