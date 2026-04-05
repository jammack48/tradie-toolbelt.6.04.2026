import { useEffect, useRef, useState } from "react";
import { Plus, Upload, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierItemCount,
  type Supplier,
} from "@/services/supplierService";
import { parsePriceBookCsv, importPriceBook } from "@/services/supplierImportService";

export function SuppliersSettings() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPriority, setNewPriority] = useState(10);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchSuppliers();
      setSuppliers(data);
      // Fetch item counts in parallel
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (s) => {
          counts[s.id] = await getSupplierItemCount(s.id);
        })
      );
      setItemCounts(counts);
    } catch (e) {
      console.error("Failed to load suppliers", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createSupplier(newName.trim(), newPriority, suppliers.length === 0);
      setNewName("");
      setNewPriority(10);
      setShowAdd(false);
      toast({ title: "Supplier added" });
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to add supplier", variant: "destructive" });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await updateSupplier(id, { is_default: true });
      toast({ title: "Default supplier updated" });
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateSupplier(id, { is_active: isActive });
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSupplier(id);
      toast({ title: "Supplier deleted" });
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to delete", description: "Remove job materials using this supplier first.", variant: "destructive" });
    }
  };

  const handleCsvUpload = async (supplierId: string, file: File) => {
    try {
      setUploading(supplierId);
      const text = await file.text();
      const rows = parsePriceBookCsv(text);
      if (rows.length === 0) {
        toast({ title: "No items found", description: "CSV had no valid rows.", variant: "destructive" });
        return;
      }
      const count = await importPriceBook(supplierId, rows);
      toast({ title: "Price book imported", description: `${count} items loaded.` });
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Import failed", description: e instanceof Error ? e.message : "Check CSV format.", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  if (!user) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-card-foreground">Suppliers</h2>
        <p className="text-sm text-muted-foreground">Sign in to manage suppliers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-card-foreground">Suppliers</h2>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-lg bg-card border border-border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Supplier Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. JA Russell" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Priority (1 = highest)</label>
              <Input type="number" value={newPriority} onChange={(e) => setNewPriority(parseInt(e.target.value) || 10)} min={1} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>Save</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading suppliers...</p>
      ) : suppliers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No suppliers yet. Add one to get started.</p>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.id} className="p-3 rounded-lg bg-card border border-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-card-foreground truncate">{s.name}</span>
                  {s.is_default && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> Default
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">Priority: {s.priority}</span>
                  <span className="text-xs text-muted-foreground">({itemCounts[s.id] ?? 0} items)</span>
                  <span className="text-xs text-muted-foreground">
                    Date uploaded: {s.last_pricebook_uploaded_at ? new Date(s.last_pricebook_uploaded_at).toLocaleDateString() : "Not uploaded"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => void handleToggleActive(s.id, v)}
                  />
                  {!s.is_default && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => void handleSetDefault(s.id)}>
                      Set Default
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => void handleDelete(s.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={(el) => { fileRefs.current[s.id] = el; }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleCsvUpload(s.id, f);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  disabled={uploading === s.id}
                  onClick={() => fileRefs.current[s.id]?.click()}
                >
                  <Upload className="w-3 h-3" />
                  {uploading === s.id ? "Importing..." : (itemCounts[s.id] ?? 0) > 0 ? "Refresh Price Book" : "Upload Price Book"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
