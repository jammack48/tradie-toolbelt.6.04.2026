import { supabase } from "@/lib/supabase";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import type { DemoCustomer, DemoMaterial } from "@/types/demoData";
import type { Trade } from "@/contexts/AppModeContext";
import { parseBusinessProfile, type BusinessProfile, type StoredAppMode } from "@/lib/businessProfile";
import { normalizeCustomerAddress } from "@/lib/customerAddress";

export type { StoredAppMode, BusinessProfile } from "@/lib/businessProfile";

export type ProdUserSettingsRow = Tables<"prod_user_settings">;

function stableNumberId(raw: string | number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h) || 1;
}

function rowToDemoCustomer(row: Tables<"prod_customers">): DemoCustomer {
  const notes = (row.notes ?? []) as unknown;
  const contacts = (row.contacts ?? []) as DemoCustomer["contacts"];
  const jobHistory = (row.job_history ?? []) as DemoCustomer["jobHistory"];
  const statusRaw = (row.status ?? "leads").toLowerCase();
  const status =
    statusRaw === "active" || statusRaw === "archived" || statusRaw === "leads"
      ? statusRaw
      : "leads";

  return {
    id: stableNumberId(row.id),
    name: row.name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: normalizeCustomerAddress(row.address),
    jobs: row.jobs ?? 0,
    status,
    totalSpend: row.total_spend ?? 0,
    notes: Array.isArray(notes) ? (notes as string[]) : [],
    contacts: Array.isArray(contacts) ? contacts : [],
    jobHistory: Array.isArray(jobHistory) ? jobHistory : [],
  };
}

export async function ensureProdUserSettingsRow(userId: string): Promise<void> {
  const { data, error } = await supabase.from("prod_user_settings").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return;
  const insert: TablesInsert<"prod_user_settings"> = { user_id: userId };
  const { error: insErr } = await supabase.from("prod_user_settings").insert(insert);
  if (insErr && insErr.code !== "23505") throw insErr;
}

export async function fetchProdUserSettings(userId: string): Promise<ProdUserSettingsRow | null> {
  await ensureProdUserSettingsRow(userId);
  const { data, error } = await supabase.from("prod_user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function mergeBusinessProfile(
  userId: string,
  current: unknown,
  patch: BusinessProfile
): Promise<void> {
  const prev = parseBusinessProfile(current);
  const next = { ...prev, ...patch };
  const { error } = await supabase
    .from("prod_user_settings")
    .update({ business_profile: next as Json, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function persistWorkspaceChoice(
  userId: string,
  mode: StoredAppMode,
  trade: Trade | null,
  currentProfile: unknown
): Promise<void> {
  const patch: BusinessProfile = { lastWorkspaceMode: mode };
  if (trade) patch.trade = trade;
  await mergeBusinessProfile(userId, currentProfile, patch);
}

export async function fetchProdCustomers(companyId: string): Promise<DemoCustomer[]> {
  const { data, error } = await supabase
    .from("prod_customers")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToDemoCustomer);
}

export async function fetchProdCatalogueMaterials(companyId: string): Promise<DemoMaterial[]> {
  const { data, error } = await supabase
    .from("prod_supplier_items")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const n = (v: number | null | undefined) => (v == null ? NaN : Number(v));
    let unitPrice = 0;
    if (Number.isFinite(n(row.sell_price))) unitPrice = n(row.sell_price);
    else if (Number.isFinite(n(row.unit_price))) unitPrice = n(row.unit_price);
    else if (Number.isFinite(n(row.cost_price))) unitPrice = n(row.cost_price);
    return {
      id: String(row.id),
      name: row.name ?? "Item",
      unit: row.unit ?? "ea",
      unitPrice,
    };
  });
}

export async function insertProdCustomer(
  companyId: string,
  customer: Omit<DemoCustomer, "id">
): Promise<DemoCustomer> {
  const insert: TablesInsert<"prod_customers"> = {
    company_id: companyId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    jobs: customer.jobs,
    status: customer.status,
    total_spend: customer.totalSpend,
    notes: customer.notes as unknown as Tables<"prod_customers">["notes"],
    contacts: customer.contacts as unknown as Tables<"prod_customers">["contacts"],
    job_history: customer.jobHistory as unknown as Tables<"prod_customers">["job_history"],
  };
  const { data, error } = await supabase.from("prod_customers").insert(insert).select("*").single();
  if (error) throw error;
  return rowToDemoCustomer(data);
}

export type ProdShellSettingsPatch = {
  theme?: string;
  is_dark?: boolean;
  toolbar_position?: string;
};

export async function updateProdUserShellSettings(
  userId: string,
  patch: ProdShellSettingsPatch
): Promise<void> {
  const { error } = await supabase
    .from("prod_user_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}
