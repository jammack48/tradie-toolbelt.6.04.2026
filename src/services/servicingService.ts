import { supabase } from "@/lib/supabase";

export interface ServiceReminder {
  id: number;
  customer_id: number;
  customer_name: string;
  job_id: string | null;
  service_type: string;
  interval_months: number;
  due_date: string;
  status: "pending" | "sent" | "booked";
  channel: "email" | "sms";
  template_id: string | null;
  created_at: string;
  notes: string;
}

export type NewReminder = Omit<ServiceReminder, "id" | "created_at">;

export async function fetchReminders(): Promise<ServiceReminder[]> {
  const { data, error } = await (supabase as any)
    .from("service_reminders")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) throw new Error("Failed to fetch reminders: " + error.message);
  return (data ?? []) as ServiceReminder[];
}

export async function addReminder(r: NewReminder): Promise<ServiceReminder> {
  const { data, error } = await (supabase as any)
    .from("service_reminders")
    .insert(r)
    .select("*")
    .single();

  if (error) throw new Error("Failed to add reminder: " + error.message);
  return data as ServiceReminder;
}

export async function addRemindersBulk(reminders: NewReminder[]): Promise<void> {
  for (let i = 0; i < reminders.length; i += 20) {
    const batch = reminders.slice(i, i + 20);
    const { error } = await (supabase as any).from("service_reminders").insert(batch);
    if (error) console.error("Bulk insert error:", error);
  }
}

export async function updateReminderStatus(
  id: number,
  status: ServiceReminder["status"],
  jobId?: string
): Promise<void> {
  const updates: Record<string, any> = { status };
  if (jobId) updates.job_id = jobId;

  const { error } = await (supabase as any)
    .from("service_reminders")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error("Failed to update reminder: " + error.message);
}

export async function deleteReminder(id: number): Promise<void> {
  const { error } = await (supabase as any)
    .from("service_reminders")
    .delete()
    .eq("id", id);

  if (error) throw new Error("Failed to delete reminder: " + error.message);
}
