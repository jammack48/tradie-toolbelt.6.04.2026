import { supabase } from "@/lib/supabase";

export interface Supplier {
  id: string;
  name: string;
  priority: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  last_pricebook_uploaded_at?: string | null;
  last_pricebook_row_count?: number | null;
}

export interface SupplierItem {
  id: string;
  supplier_id: string;
  sku: string;
  name: string;
  cost_price: number;
  sell_price: number;
  searchable_text: string;
  // joined fields
  supplier_name?: string;
  supplier_priority?: number;
}

/** Fetch all suppliers for current user */
export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("prod_suppliers")
    .select("*")
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Supplier[];
}

/** Create a new supplier */
export async function createSupplier(name: string, priority: number, isDefault: boolean): Promise<Supplier> {
  // If setting as default, unset others first
  if (isDefault) {
    await supabase.from("prod_suppliers").update({ is_default: false } as any).eq("is_default", true);
  }
  const { data, error } = await supabase
    .from("prod_suppliers")
    .insert({ name, priority, is_default: isDefault } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as Supplier;
}

/** Update a supplier */
export async function updateSupplier(id: string, updates: Partial<Pick<Supplier, "name" | "priority" | "is_default" | "is_active">>): Promise<void> {
  if (updates.is_default) {
    await supabase.from("prod_suppliers").update({ is_default: false } as any).eq("is_default", true);
  }
  const { error } = await supabase.from("prod_suppliers").update(updates as any).eq("id", id);
  if (error) throw error;
}

/** Delete a supplier and its items */
export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from("prod_suppliers").delete().eq("id", id);
  if (error) throw error;
}

/** Search supplier items across all active suppliers */
export async function searchSupplierItems(query: string, limit = 20): Promise<SupplierItem[]> {
  const searchTerm = `%${query.toLowerCase()}%`;
  const { data, error } = await supabase
    .from("prod_supplier_items")
    .select("*, prod_suppliers!inner(name, priority, is_active)")
    .ilike("searchable_text", searchTerm)
    .eq("prod_suppliers.is_active", true)
    .order("prod_suppliers(priority)", { ascending: true })
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    supplier_id: row.supplier_id,
    sku: row.sku,
    name: row.name,
    cost_price: Number(row.cost_price),
    sell_price: Number(row.sell_price),
    searchable_text: row.searchable_text,
    supplier_name: row.prod_suppliers?.name ?? "",
    supplier_priority: row.prod_suppliers?.priority ?? 99,
  }));
}

/** Get item count for a supplier */
export async function getSupplierItemCount(supplierId: string): Promise<number> {
  const { count, error } = await supabase
    .from("prod_supplier_items")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", supplierId);
  if (error) throw error;
  return count ?? 0;
}
