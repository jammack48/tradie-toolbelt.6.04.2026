import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MaterialItem } from "@/data/dummyJobDetails";

interface MaterialsTabProps {
  materials: MaterialItem[];
}

export function MaterialsTab({ materials }: MaterialsTabProps) {
  const total = materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Materials</CardTitle>
        <Button size="sm" className="h-9 gap-1.5">
          <Plus className="w-4 h-4" /> Add Material
        </Button>
      </CardHeader>
      <CardContent>
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No materials added yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right w-16">Qty</TableHead>
                <TableHead className="text-right w-24 hidden sm:table-cell">Unit $</TableHead>
                <TableHead className="text-right w-24">Total</TableHead>
                <TableHead className="hidden sm:table-cell">Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-right">{m.quantity}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">${m.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">${(m.quantity * m.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{m.supplier}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">${total.toFixed(2)}</TableCell>
                <TableCell className="hidden sm:table-cell" />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
