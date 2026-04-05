import { supabase } from "@/lib/supabase";

interface PriceBookRow {
  sku: string;
  name: string;
  cost_price: number;
  sell_price: number;
}

/**
 * Parse a price book CSV file.
 * Expected columns: *ItemCode, ItemName, PurchasesUnitPrice, SalesUnitPrice
 */
export function parsePriceBookCsv(text: string): PriceBookRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Find column indices (case-insensitive, trimmed)
  const h = headers.map((h) => h.trim().toLowerCase().replace(/^\*/, ""));
  const skuIdx = h.findIndex((c) => c === "itemcode");
  const nameIdx = h.findIndex((c) => c === "itemname");
  const costIdx = h.findIndex((c) => c === "purchasesunitprice" || c === "purchaseunitprice");
  const sellIdx = h.findIndex((c) => c === "salesunitprice" || c === "saleunitprice");

  if (nameIdx === -1) {
    throw new Error("Could not find 'ItemName' column in CSV");
  }

  const rows: PriceBookRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const name = cols[nameIdx]?.trim() ?? "";
    if (!name) continue;

    const sku = skuIdx >= 0 ? (cols[skuIdx]?.trim() ?? "") : "";
    const costRaw = costIdx >= 0 ? cols[costIdx]?.trim() : "";
    const sellRaw = sellIdx >= 0 ? cols[sellIdx]?.trim() : "";

    rows.push({
      sku,
      name,
      cost_price: parseFloat(costRaw || "0") || 0,
      sell_price: parseFloat(sellRaw || "0") || 0,
    });
  }

  return rows;
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

/**
 * Import parsed price book rows into prod_supplier_items for a given supplier.
 * Clears existing items for this supplier first, then bulk inserts.
 */
export async function importPriceBook(supplierId: string, rows: PriceBookRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  // Delete existing items for this supplier
  const { error: delError } = await supabase
    .from("prod_supplier_items")
    .delete()
    .eq("supplier_id", supplierId);
  if (delError) throw delError;

  // Prepare inserts with searchable_text
  const inserts = rows.map((r) => ({
    supplier_id: supplierId,
    sku: r.sku,
    name: r.name,
    cost_price: r.cost_price,
    sell_price: r.sell_price,
    searchable_text: `${r.name} ${r.sku}`.toLowerCase(),
  }));

  // Batch insert in chunks of 500
  const BATCH = 500;
  let imported = 0;
  for (let i = 0; i < inserts.length; i += BATCH) {
    const chunk = inserts.slice(i, i + BATCH);
    const { error } = await supabase.from("prod_supplier_items").insert(chunk as any);
    if (error) throw error;
    imported += chunk.length;
  }

  const { error: supplierUpdateError } = await supabase
    .from("prod_suppliers")
    .update({
      last_pricebook_uploaded_at: new Date().toISOString(),
      last_pricebook_row_count: imported,
    } as any)
    .eq("id", supplierId);
  if (supplierUpdateError) throw supplierUpdateError;

  return imported;
}
