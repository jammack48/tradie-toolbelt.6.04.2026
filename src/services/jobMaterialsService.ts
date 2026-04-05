import { supabase } from "@/lib/supabase";

export interface JobMaterial {
  id: string;
  job_id: string;
  supplier_item_id: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  created_at: string;
  // joined
  item_name: string;
  item_sku: string;
  supplier_name: string;
}

/** Fetch all materials for a job */
export async function fetchJobMaterials(jobId: string): Promise<JobMaterial[]> {
  const { data, error } = await supabase
    .from("prod_job_materials")
    .select("*, prod_supplier_items!inner(name, sku, prod_suppliers!inner(name))")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    job_id: row.job_id,
    supplier_item_id: row.supplier_item_id,
    quantity: row.quantity,
    unit_price: Number(row.unit_price),
    cost_price: Number(row.cost_price),
    created_at: row.created_at,
    item_name: row.prod_supplier_items?.name ?? "",
    item_sku: row.prod_supplier_items?.sku ?? "",
    supplier_name: row.prod_supplier_items?.prod_suppliers?.name ?? "",
  }));
}

/** Add a material to a job */
export async function addJobMaterial(
  jobId: string,
  supplierItemId: string,
  sellPrice: number,
  costPrice: number,
  quantity = 1
): Promise<void> {
  const { error } = await supabase.from("prod_job_materials").insert({
    job_id: jobId,
    supplier_item_id: supplierItemId,
    quantity,
    unit_price: sellPrice,
    cost_price: costPrice,
  } as any);
  if (error) throw error;
}

/** Update quantity for a job material */
export async function updateJobMaterialQty(id: string, quantity: number): Promise<void> {
  const { error } = await supabase
    .from("prod_job_materials")
    .update({ quantity } as any)
    .eq("id", id);
  if (error) throw error;
}

/** Remove a material from a job */
export async function deleteJobMaterial(id: string): Promise<void> {
  const { error } = await supabase.from("prod_job_materials").delete().eq("id", id);
  if (error) throw error;
}
