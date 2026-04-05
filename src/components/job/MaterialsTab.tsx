import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialSearch } from "@/components/job/MaterialSearch";
import {
  fetchJobMaterials,
  addJobMaterial,
  updateJobMaterialQty,
  deleteJobMaterial,
  type JobMaterial,
} from "@/services/jobMaterialsService";
import type { SupplierItem } from "@/services/supplierService";

interface MaterialsTabProps {
  jobId: string;
}

export function MaterialsTab({ jobId }: MaterialsTabProps) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchJobMaterials(jobId);
      setMaterials(data);
    } catch (e) {
      console.error("Failed to load job materials", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && jobId) void load();
  }, [user, jobId]);

  const handleAdd = async (item: SupplierItem) => {
    try {
      await addJobMaterial(jobId, item.id, item.sell_price, item.cost_price);
      toast({ title: "Material added" });
      await load();
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to add material", variant: "destructive" });
    }
  };

  const handleQtyChange = async (id: string, newQty: number) => {
    if (newQty < 1) return;
    try {
      await updateJobMaterialQty(id, newQty);
      setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, quantity: newQty } : m)));
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to update quantity", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteJobMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Material removed" });
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to remove material", variant: "destructive" });
    }
  };

  const total = materials.reduce((s, m) => s + m.quantity * m.unit_price, 0);
  const totalCost = materials.reduce((s, m) => s + m.quantity * m.cost_price, 0);

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">Sign in to manage materials</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Materials</CardTitle>
        </div>
        <MaterialSearch onSelect={handleAdd} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
        ) : materials.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No materials added yet — search above to add</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right w-28">Qty</TableHead>
                  <TableHead className="text-right w-24 hidden sm:table-cell">Unit $</TableHead>
                  <TableHead className="text-right w-24">Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Supplier</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <span className="font-medium">{m.item_name}</span>
                      {m.item_sku && <span className="text-xs text-muted-foreground ml-1.5">({m.item_sku})</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => void handleQtyChange(m.id, m.quantity - 1)}
                          disabled={m.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{m.quantity}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => void handleQtyChange(m.id, m.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">${m.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">${(m.quantity * m.unit_price).toFixed(2)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{m.supplier_name}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => void handleDelete(m.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">${total.toFixed(2)}</TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-2 text-xs text-muted-foreground text-right">
              Margin: ${(total - totalCost).toFixed(2)} ({totalCost > 0 ? ((((total - totalCost) / totalCost) * 100).toFixed(0)) : 0}%)
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
