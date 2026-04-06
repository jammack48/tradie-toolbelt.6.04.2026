import { supabase } from "@/lib/supabase";
import { formatVariationLabel } from "@/lib/jobNumber";

export interface MaterialItem {
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
}

export interface LabourItem {
  description: string;
  hours: number;
  rate: number;
}

export interface Variation {
  id: string;
  job_id: string;
  job_number: string;
  variation_number: number;
  description: string;
  value: number;
  status: "Pending" | "Approved" | "Rejected";
  materials: MaterialItem[];
  labour: LabourItem[];
  created_at: string;
}

export interface VariationInsert {
  job_id: string;
  job_number?: string;
  description: string;
  value: number;
  status: Variation["status"];
  materials: MaterialItem[];
  labour: LabourItem[];
}

const STORAGE_KEY = "tradie-toolbelt:variations";

function rowToVariation(r: any): Variation {
  const jobRef = r.job_number ?? r.job_id;
  const variationNumber = Number(r.variation_number ?? 1);
  return {
    id: r.id,
    job_id: r.job_id,
    job_number: jobRef,
    variation_number: Number.isFinite(variationNumber) && variationNumber > 0 ? variationNumber : 1,
    description: r.description,
    value: Number(r.value ?? 0),
    status: r.status ?? "Pending",
    materials: (r.materials ?? []) as MaterialItem[],
    labour: (r.labour ?? []) as LabourItem[],
    created_at: r.created_at,
  };
}

function isMissingVariationColumnError(error: any): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("variation_number") || message.includes("job_number");
}

function isMissingVariationsTableError(error: any): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("public.variations") || (message.includes("variations") && message.includes("schema cache"));
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLocalVariations(): Variation[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(rowToVariation);
  } catch {
    return [];
  }
}

function writeLocalVariations(variations: Variation[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(variations));
}

function getNextVariationNumber(existing: Variation[], jobId: string): number {
  const max = existing
    .filter((variation) => variation.job_id === jobId)
    .reduce((highest, variation) => Math.max(highest, variation.variation_number ?? 0), 0);
  return max + 1;
}

export function formatVariationCode(variation: Pick<Variation, "job_number" | "job_id" | "variation_number">): string {
  const jobRef = variation.job_id || variation.job_number;
  const number = variation.variation_number || 1;
  return formatVariationLabel(jobRef, number);
}

export async function fetchVariationCounts(jobIds: string[]): Promise<Record<string, number>> {
  if (jobIds.length === 0) return {};
  const uniqueJobIds = [...new Set(jobIds)];
  const { data, error } = await (supabase as any)
    .from("variations")
    .select("job_id")
    .in("job_id", uniqueJobIds);

  if (!error) {
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const key = String(row.job_id);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }

  if (!isMissingVariationsTableError(error)) {
    throw new Error("Failed to fetch variation counts: " + error.message);
  }

  const counts: Record<string, number> = {};
  for (const variation of readLocalVariations()) {
    if (!uniqueJobIds.includes(variation.job_id)) continue;
    counts[variation.job_id] = (counts[variation.job_id] ?? 0) + 1;
  }
  return counts;
}

export async function fetchVariations(jobId: string): Promise<Variation[]> {
  const { data, error } = await (supabase as any)
    .from("variations")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (!error) {
    return (data ?? []).map(rowToVariation);
  }

  if (!isMissingVariationsTableError(error)) {
    throw new Error("Failed to fetch variations: " + error.message);
  }

  return readLocalVariations()
    .filter((variation) => variation.job_id === jobId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function addVariation(v: VariationInsert): Promise<Variation> {
  const existingRows = await fetchVariations(v.job_id);
  const nextVariationNumber = getNextVariationNumber(existingRows, v.job_id);
  const payload = {
    job_id: v.job_id,
    job_number: v.job_number || v.job_id,
    variation_number: nextVariationNumber,
    description: v.description,
    value: v.value,
    status: v.status,
    materials: v.materials,
    labour: v.labour,
  };

  const { data, error } = await (supabase as any)
    .from("variations")
    .insert(payload)
    .select("*")
    .single();

  if (!error) {
    return rowToVariation(data);
  }

  if (isMissingVariationColumnError(error)) {
    const minimalPayload = {
      job_id: v.job_id,
      description: v.description,
      value: v.value,
      status: v.status,
      materials: v.materials,
      labour: v.labour,
    };

    const retry = await (supabase as any)
      .from("variations")
      .insert(minimalPayload)
      .select("*")
      .single();

    if (!retry.error) {
      return rowToVariation({
        ...retry.data,
        job_number: v.job_number || v.job_id,
        variation_number: nextVariationNumber,
      });
    }
  }

  if (!isMissingVariationsTableError(error)) {
    throw new Error("Failed to add variation: " + error.message);
  }

  const localVariation: Variation = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    job_number: v.job_number || v.job_id,
    variation_number: nextVariationNumber,
    ...payload,
  };
  const existing = readLocalVariations();
  writeLocalVariations([localVariation, ...existing]);
  return localVariation;
}

export async function updateVariationStatus(
  id: string,
  status: Variation["status"]
): Promise<void> {
  const { error } = await (supabase as any)
    .from("variations")
    .update({ status })
    .eq("id", id);

  if (!error) {
    return;
  }

  if (!isMissingVariationsTableError(error)) {
    throw new Error("Failed to update variation: " + error.message);
  }

  const existing = readLocalVariations();
  writeLocalVariations(existing.map((variation) => (variation.id === id ? { ...variation, status } : variation)));
}

export async function deleteVariation(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("variations")
    .delete()
    .eq("id", id);

  if (!error) {
    return;
  }

  if (!isMissingVariationsTableError(error)) {
    throw new Error("Failed to delete variation: " + error.message);
  }

  const existing = readLocalVariations();
  writeLocalVariations(existing.filter((variation) => variation.id !== id));
}
