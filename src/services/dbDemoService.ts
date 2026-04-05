import { supabase } from "@/lib/supabase";
import { getTable } from "@/lib/modeTable";
import type { DemoCustomer } from "@/types/demoData";
import customersSeed from "@/demo-data/customers.json";

function parseMaybeJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToCustomer(r: any): DemoCustomer {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? "",
    email: r.email ?? "",
    address: r.address ?? "",
    jobs: r.jobs ?? 0,
    status: (r.status ?? "leads") as DemoCustomer["status"],
    totalSpend: Number(r.total_spend ?? 0),
    notes: (r.notes ?? []) as string[],
    contacts: parseMaybeJsonArray<DemoCustomer["contacts"][number]>(r.contacts),
    jobHistory: (r.job_history ?? []) as DemoCustomer["jobHistory"],
  };
}

async function seedCustomersIfEmpty(): Promise<void> {
  const { count, error } = await supabase
    .from(getTable("customers", true))
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const rows = (customersSeed as unknown as DemoCustomer[]).map((c) => ({
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    jobs: c.jobs,
    status: c.status,
    total_spend: c.totalSpend,
    notes: c.notes,
    contacts: c.contacts,
    job_history: c.jobHistory,
  }));

  for (let i = 0; i < rows.length; i += 20) {
    const batch = rows.slice(i, i + 20);
    const { error: insertErr } = await supabase.from(getTable("customers", true)).insert(batch as any);
    if (insertErr) console.error("Seed customers error:", insertErr);
  }
}

export async function fetchCustomers(isDemo: boolean): Promise<DemoCustomer[]> {
  if (isDemo) {
    await seedCustomersIfEmpty();
  }

  const { data, error } = await supabase
    .from(getTable("customers", isDemo))
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    if (!isDemo && String(error.message).toLowerCase().includes("does not exist")) return [];
    throw new Error("Failed to fetch customers: " + error.message);
  }
  return (data ?? []).map(rowToCustomer);
}

export async function dbAddCustomer(customer: Omit<DemoCustomer, "id">, isDemo: boolean): Promise<DemoCustomer> {
  const { data, error } = await supabase
    .from(getTable("customers", isDemo))
    .insert({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      jobs: customer.jobs,
      status: customer.status,
      total_spend: customer.totalSpend,
      notes: customer.notes,
      contacts: customer.contacts,
      job_history: customer.jobHistory,
    })
    .select("*")
    .single();

  if (error) throw new Error("Failed to add customer: " + error.message);
  return rowToCustomer(data);
}

export async function dbUpdateCustomer(id: number, updates: Partial<DemoCustomer>, isDemo: boolean): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.address !== undefined) dbUpdates.address = updates.address;
  if (updates.jobs !== undefined) dbUpdates.jobs = updates.jobs;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.totalSpend !== undefined) dbUpdates.total_spend = updates.totalSpend;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.contacts !== undefined) dbUpdates.contacts = updates.contacts;
  if (updates.jobHistory !== undefined) dbUpdates.job_history = updates.jobHistory;

  const { error } = await supabase
    .from(getTable("customers", isDemo))
    .update(dbUpdates as any)
    .eq("id", id);

  if (error) throw new Error("Failed to update customer: " + error.message);
}
