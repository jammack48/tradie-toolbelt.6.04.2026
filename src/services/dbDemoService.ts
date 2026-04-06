import { supabase } from "@/integrations/supabase/client";
import type { DemoCustomer, DemoJob } from "@/types/demoData";
import type { Stage } from "@/data/dummyJobs";
import customersSeed from "@/demo-data/customers.json";

const SESSION_KEY = "demo_session_id";
const SESSION_TRADE_KEY = "demo_session_trade";

/** Get or create a session UUID in sessionStorage */
function getSessionId(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

function getSessionTrade(): string | null {
  return sessionStorage.getItem(SESSION_TRADE_KEY);
}

function storeSession(id: string, trade: string) {
  sessionStorage.setItem(SESSION_KEY, id);
  sessionStorage.setItem(SESSION_TRADE_KEY, trade);
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_TRADE_KEY);
}

/** Map DB row → DemoJob */
function rowToJob(r: any): DemoJob {
  return {
    id: r.job_id,
    client: r.client,
    jobName: r.job_name,
    value: Number(r.value ?? 0),
    ageDays: Number(r.age_days ?? 0),
    urgent: r.urgent ?? false,
    stage: r.stage as Stage,
    hasUnread: r.has_unread ?? false,
  };
}

/** Map DB row → DemoCustomer */
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
    contacts: (r.contacts ?? []) as DemoCustomer["contacts"],
    jobHistory: (r.job_history ?? []) as DemoCustomer["jobHistory"],
  };
}

/**
 * Get or create a demo session for the given trade.
 * If the session already exists for the same trade, returns existing session_id.
 * If trade changed or no session exists, creates a new one.
 */
export async function getOrCreateSession(trade: string): Promise<string> {
  const existingId = getSessionId();
  const existingTrade = getSessionTrade();

  // If we have a session for the same trade, verify it still exists in DB
  if (existingId && existingTrade === trade) {
    const { count } = await supabase
      .from("demo_session_jobs")
      .select("id", { count: "exact", head: true })
      .eq("session_id", existingId);

    if ((count ?? 0) > 0) return existingId;
  }

  // Create a new session
  const newId = crypto.randomUUID();

  // Call the init function to copy template jobs
  const { error } = await supabase.rpc("init_demo_session", {
    p_session_id: newId,
    p_trade: trade,
  });

  if (error) {
    console.error("Failed to init demo session:", error);
    throw new Error("Failed to initialize demo session");
  }

  storeSession(newId, trade);
  return newId;
}

/** Fetch session jobs (the user's isolated copy) */
export async function fetchSessionJobs(sessionId: string): Promise<DemoJob[]> {
  const { data, error } = await supabase
    .from("demo_session_jobs")
    .select("*")
    .eq("session_id", sessionId)
    .order("job_id", { ascending: true });

  if (error) throw new Error("Failed to fetch session jobs: " + error.message);
  return (data ?? []).map(rowToJob);
}

/** Update a job's stage in the session (persists to DB) */
export async function updateSessionJobStage(
  sessionId: string,
  jobId: string,
  newStage: Stage
): Promise<void> {
  const { error } = await supabase
    .from("demo_session_jobs")
    .update({ stage: newStage })
    .eq("session_id", sessionId)
    .eq("job_id", jobId);

  if (error) throw new Error("Failed to update job stage: " + error.message);
}

/** Reset session — delete all session jobs and re-copy from template */
export async function resetSession(sessionId: string, trade: string): Promise<void> {
  // Delete existing session jobs
  await supabase.from("demo_session_jobs").delete().eq("session_id", sessionId);
  // Delete the session record
  await supabase.from("demo_sessions").delete().eq("id", sessionId);

  // Clear stored session so getOrCreateSession makes a fresh one
  clearSession();
}

// ---- Customers (unchanged, shared for now) ----

async function seedCustomersIfEmpty(): Promise<void> {
  const { count, error } = await supabase
    .from("customers_demo")
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
    const { error: insertErr } = await supabase.from("customers_demo").insert(batch);
    if (insertErr) console.error("Seed customers error:", insertErr);
  }
}

export async function fetchCustomers(): Promise<DemoCustomer[]> {
  await seedCustomersIfEmpty();
  const { data, error } = await supabase
    .from("customers_demo")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw new Error("Failed to fetch customers: " + error.message);
  return (data ?? []).map(rowToCustomer);
}

export async function dbAddCustomer(customer: Omit<DemoCustomer, "id">): Promise<DemoCustomer> {
  const { data, error } = await supabase
    .from("customers_demo")
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

export async function dbUpdateCustomer(id: number, updates: Partial<DemoCustomer>): Promise<void> {
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

  const { error } = await supabase.from("customers_demo").update(dbUpdates).eq("id", id);
  if (error) throw new Error("Failed to update customer: " + error.message);
}
