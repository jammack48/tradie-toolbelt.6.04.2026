import { useState, useCallback, useRef, useMemo } from "react";
import { DollarSign, Plus, Send, Save, X, ChevronDown, ChevronUp, Package, Search, Percent, RotateCcw, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { JobDetail } from "@/data/dummyJobDetails";
import { catalogueItems, bundleTemplates } from "@/data/dummyJobDetails";
import { coverLetterTemplates } from "@/data/coverLetterTemplates";
import { QuotePreview } from "@/components/quote/QuotePreview";

interface LineItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  sellPrice: number;
  markup: number;
}

export interface QuoteBlock {
  id: string;
  name: string;
  description: string;
  qty: number;
  labour: LineItem[];
  materials: LineItem[];
  extras: LineItem[];
}

interface QuoteTabProps {
  job: JobDetail;
  initialBundle?: import("@/data/dummyJobDetails").BundleTemplate;
  initialDescription?: string;
  beforeActions?: React.ReactNode;
  onSendQuote?: (total: number) => void;
}

type Section = "labour" | "materials" | "extras";

const HOURLY_RATE = 85;

let nextId = 1;
function genId() { return `qi-${nextId++}`; }
function blockId() { return `blk-${nextId++}`; }

/* ── Section header row ─────────────────────────────────── */
function SectionHeader({ label, total, isOpen, onToggle }: { label: string; total: number; isOpen: boolean; onToggle: () => void; }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted transition-colors cursor-pointer">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">${total.toFixed(2)}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>
    </button>
  );
}

/* ── Compact 2-row mobile-friendly item row ──────────────── */
function ItemRow({ item, isLast, onUpdate, onDelete, onEnterLast, lastRef, globalMarkupValue, useGlobalMarkup, onResetToGlobal }: {
  item: LineItem; isLast: boolean;
  onUpdate: (id: string, field: keyof LineItem, value: string | number) => void;
  onDelete: (id: string) => void; onEnterLast: () => void;
  lastRef: React.RefObject<HTMLInputElement>;
  globalMarkupValue: number; useGlobalMarkup: boolean; onResetToGlobal: (id: string) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && isLast) { e.preventDefault(); onEnterLast(); } };
  const lineTotal = item.qty * item.sellPrice;
  const differsFromGlobal = useGlobalMarkup && Math.abs(item.markup - globalMarkupValue) > 0.01;

  return (
    <div className="group rounded-md p-2 hover:bg-muted/50 transition-colors space-y-1">
      {/* Row 1: Name + line total + delete */}
      <div className="flex items-center gap-1.5">
        <Input className="flex-1 h-8 text-sm" value={item.name} placeholder="Item name" onChange={(e) => onUpdate(item.id, "name", e.target.value)} onKeyDown={handleKeyDown} ref={isLast ? lastRef : undefined} />
        <span className="text-sm font-bold whitespace-nowrap min-w-[60px] text-right">${lineTotal.toFixed(2)}</span>
        <button onClick={() => onDelete(item.id)} className="shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
      </div>
      {/* Row 2: Qty × Buy | Markup% */}
      <div className="flex items-center gap-1 text-xs">
        <Input className="w-12 h-7 text-xs text-center" type="number" min={0} value={item.qty} onChange={(e) => onUpdate(item.id, "qty", parseFloat(e.target.value) || 0)} />
        <span className="text-muted-foreground">×</span>
        <Input className="w-16 h-7 text-xs text-center" type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => onUpdate(item.id, "unitPrice", parseFloat(e.target.value) || 0)} />
        <span className="text-muted-foreground ml-1">+</span>
        <Input className="w-14 h-7 text-xs text-center" type="number" min={0} step={1} value={Math.round(item.markup * 100) / 100} onChange={(e) => onUpdate(item.id, "markup", parseFloat(e.target.value) || 0)} />
        <Percent className="w-3 h-3 text-muted-foreground" />
        {differsFromGlobal && <button onClick={() => onResetToGlobal(item.id)} className="p-0.5 text-muted-foreground hover:text-primary transition-colors" title="Reset to global markup"><RotateCcw className="w-3 h-3" /></button>}
      </div>
    </div>
  );
}

/* ── Block section (labour/materials/extras within a block) ── */
function BlockSection({ label, items, section, isOpen, onToggle, onUpdate, onDelete, onAddBlank, onOpenPalette, lastRef, globalMarkupValue, useGlobalMarkup, onResetToGlobal }: {
  label: string; items: LineItem[]; section: Section; isOpen: boolean; onToggle: () => void;
  onUpdate: (id: string, field: keyof LineItem, value: string | number) => void;
  onDelete: (id: string) => void; onAddBlank: () => void; onOpenPalette: () => void;
  lastRef: React.RefObject<HTMLInputElement>;
  globalMarkupValue: number; useGlobalMarkup: boolean; onResetToGlobal: (id: string) => void;
}) {
  const total = items.reduce((s, i) => s + i.qty * i.sellPrice, 0);
  return (
    <div>
      <SectionHeader label={label} total={total} isOpen={isOpen} onToggle={onToggle} />
      <Collapsible open={isOpen}>
        <CollapsibleContent>
          <div className="space-y-1 mt-1">
            {items.map((item, idx) => (
              <ItemRow key={item.id} item={item} isLast={idx === items.length - 1} onUpdate={onUpdate} onDelete={onDelete} onEnterLast={onAddBlank} lastRef={lastRef} globalMarkupValue={globalMarkupValue} useGlobalMarkup={useGlobalMarkup} onResetToGlobal={onResetToGlobal} />
            ))}
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground mt-1" onClick={onOpenPalette}><Plus className="w-4 h-4" /> Add</Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/* ── Main QuoteTab ──────────────────────────────────────── */
export function QuoteTab({ job, initialBundle, initialDescription, beforeActions, onSendQuote }: QuoteTabProps) {
  const mkItem = (name: string, qty: number, unitPrice: number): LineItem => ({
    id: genId(), name, qty, unitPrice, sellPrice: unitPrice, markup: 0,
  });

  const createBlockFromBundle = (bundle: import("@/data/dummyJobDetails").BundleTemplate, multiplier: number = 1, markup: number = 0): QuoteBlock => {
    const mkWithMarkup = (name: string, qty: number, unitPrice: number) => {
      const sellPrice = unitPrice * (1 + markup / 100);
      return { id: genId(), name, qty: qty * multiplier, unitPrice, sellPrice, markup };
    };
    return {
      id: blockId(),
      name: bundle.name,
      description: bundle.description,
      qty: multiplier,
      labour: bundle.labour.map((i) => mkWithMarkup(i.name, i.qty, i.unitPrice)),
      materials: bundle.materials.map((i) => mkWithMarkup(i.name, i.qty, i.unitPrice)),
      extras: bundle.extras.map((i) => mkWithMarkup(i.name, i.qty, i.unitPrice)),
    };
  };

  const createBlockFromJob = (): QuoteBlock => {
    // Map staff names to roles using staffPool
    const staffRoleMap: Record<string, string> = {};
    const staffPool = [
      { name: "Jake Turner", role: "Lead Sparky" },
      { name: "Ben Kowalski", role: "Apprentice" },
      { name: "Maia Johnson", role: "Plumber" },
      { name: "Craig Foster", role: "Roofer" },
      { name: "Sam Te Reo", role: "Electrician" },
    ];
    staffPool.forEach((s) => { staffRoleMap[s.name] = s.role; });

    // Aggregate hours by role
    const roleHours: Record<string, number> = {};
    job.timeEntries.forEach((t) => {
      const role = staffRoleMap[t.staff] || t.staff;
      roleHours[role] = (roleHours[role] || 0) + t.hours;
    });

    return {
      id: blockId(),
      name: job.jobName || "Job",
      description: job.description || "",
      qty: 1,
      labour: Object.entries(roleHours).map(([role, hours]) => mkItem(role, hours, HOURLY_RATE)),
      materials: job.materials.map((m) => mkItem(m.name, m.quantity, m.unitPrice)),
      extras: [],
    };
  };

  const createEmptyBlock = (): QuoteBlock => ({
    id: blockId(), name: "", description: "", qty: 1, labour: [], materials: [], extras: [],
  });

  const initialBlocks: QuoteBlock[] = initialBundle
    ? [createBlockFromBundle(initialBundle)]
    : (job.timeEntries.length > 0 || job.materials.length > 0)
      ? [createBlockFromJob()]
      : [{ id: blockId(), name: initialDescription ? "Custom Job" : "", description: initialDescription || "", qty: 1, labour: [], materials: [], extras: [] }];

  const [blocks, setBlocks] = useState<QuoteBlock[]>(initialBlocks);
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [coverLetterTemplate, setCoverLetterTemplate] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [useGlobalMarkup, setUseGlobalMarkup] = useState(false);
  const [globalMarkupValue, setGlobalMarkupValue] = useState(15);

  // Section collapse state per block
  const [openSections, setOpenSections] = useState<Record<string, Record<Section, boolean>>>(() => {
    const init: Record<string, Record<Section, boolean>> = {};
    initialBlocks.forEach((b) => {
      init[b.id] = { labour: true, materials: b.materials.length > 0, extras: b.extras.length > 0 };
    });
    return init;
  });

  const toggleSection = (blockId: string, section: Section) => {
    setOpenSections((prev) => ({
      ...prev,
      [blockId]: { ...prev[blockId], [section]: !prev[blockId]?.[section] },
    }));
  };

  const openSection = (blkId: string, section: Section) => {
    setOpenSections((prev) => ({
      ...prev,
      [blkId]: { ...prev[blkId], [section]: true },
    }));
  };

  // Palette state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSection, setPaletteSection] = useState<Section | null>(null);
  const [paletteBlockId, setPaletteBlockId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Bundle add dialog
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [bundleQty, setBundleQty] = useState(1);

  const lastInputRef = useRef<HTMLInputElement>(null);

  // Apply global markup to all items in all blocks
  const applyGlobalMarkup = useCallback((markupVal: number) => {
    setBlocks((prev) => prev.map((block) => ({
      ...block,
      labour: block.labour.map((i) => ({ ...i, markup: markupVal, sellPrice: i.unitPrice * (1 + markupVal / 100) })),
      materials: block.materials.map((i) => ({ ...i, markup: markupVal, sellPrice: i.unitPrice * (1 + markupVal / 100) })),
      extras: block.extras.map((i) => ({ ...i, markup: markupVal, sellPrice: i.unitPrice * (1 + markupVal / 100) })),
    })));
  }, []);

  const handleToggleGlobal = useCallback((on: boolean) => {
    setUseGlobalMarkup(on);
    if (on) applyGlobalMarkup(globalMarkupValue);
  }, [globalMarkupValue, applyGlobalMarkup]);

  const handleGlobalValueChange = useCallback((val: number) => {
    setGlobalMarkupValue(val);
    if (useGlobalMarkup) applyGlobalMarkup(val);
  }, [useGlobalMarkup, applyGlobalMarkup]);

  // Block updaters
  const updateBlockField = (blkId: string, field: "name" | "description", value: string) => {
    setBlocks((prev) => prev.map((b) => b.id === blkId ? { ...b, [field]: value } : b));
  };

  const deleteBlock = (blkId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blkId));
    setOpenSections((prev) => { const n = { ...prev }; delete n[blkId]; return n; });
  };

  const updateItem = (blkId: string, section: Section) => (id: string, field: keyof LineItem, value: string | number) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blkId) return b;
      const updateList = (items: LineItem[]) => items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const v = typeof value === "number" ? value : parseFloat(value) || 0;
        if (field === "unitPrice") updated.sellPrice = v * (1 + item.markup / 100);
        else if (field === "sellPrice") updated.markup = v > 0 && item.unitPrice > 0 ? ((v - item.unitPrice) / item.unitPrice) * 100 : 0;
        else if (field === "markup") updated.sellPrice = item.unitPrice * (1 + v / 100);
        return updated;
      });
      return { ...b, [section]: updateList(b[section]) };
    }));
  };

  const deleteItem = (blkId: string, section: Section) => (id: string) => {
    setBlocks((prev) => prev.map((b) => b.id !== blkId ? b : { ...b, [section]: b[section].filter((i) => i.id !== id) }));
  };

  const resetToGlobal = (blkId: string, section: Section) => (id: string) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blkId) return b;
      return { ...b, [section]: b[section].map((item) => item.id !== id ? item : { ...item, markup: globalMarkupValue, sellPrice: item.unitPrice * (1 + globalMarkupValue / 100) }) };
    }));
  };

  const addBlankTo = (blkId: string, section: Section) => {
    const defaultMarkup = useGlobalMarkup ? globalMarkupValue : 0;
    setBlocks((prev) => prev.map((b) => b.id !== blkId ? b : { ...b, [section]: [...b[section], { id: genId(), name: "", qty: 1, unitPrice: 0, sellPrice: 0, markup: defaultMarkup }] }));
    openSection(blkId, section);
  };

  const addCatalogueItem = useCallback((item: typeof catalogueItems[0]) => {
    if (!paletteBlockId) return;
    const defaultMarkup = useGlobalMarkup ? globalMarkupValue : 0;
    const sellPrice = item.unitPrice * (1 + defaultMarkup / 100);
    const newItem: LineItem = { id: genId(), name: item.name, qty: 1, unitPrice: item.unitPrice, sellPrice, markup: defaultMarkup };
    setBlocks((prev) => prev.map((b) => b.id !== paletteBlockId ? b : { ...b, [item.section]: [...b[item.section], newItem] }));
    openSection(paletteBlockId, item.section);
    setPaletteOpen(false);
  }, [paletteBlockId, useGlobalMarkup, globalMarkupValue]);

  // Add bundle as new block
  const openBundleDialog = (bundleId: string) => { setSelectedBundleId(bundleId); setBundleQty(1); setBundleDialogOpen(true); };

  const confirmBundleAdd = useCallback(() => {
    if (!selectedBundleId) return;
    const bundle = bundleTemplates.find((b) => b.id === selectedBundleId);
    if (!bundle) return;
    const markup = useGlobalMarkup ? globalMarkupValue : 0;
    const newBlock = createBlockFromBundle(bundle, bundleQty, markup);
    setBlocks((prev) => [...prev, newBlock]);
    setOpenSections((prev) => ({ ...prev, [newBlock.id]: { labour: true, materials: true, extras: newBlock.extras.length > 0 } }));
    setBundleDialogOpen(false);
    toast({ title: `${bundle.name} ×${bundleQty} added` });
  }, [selectedBundleId, bundleQty, useGlobalMarkup, globalMarkupValue]);

  const addCustomBlock = () => {
    const newBlock = createEmptyBlock();
    setBlocks((prev) => [...prev, newBlock]);
    setOpenSections((prev) => ({ ...prev, [newBlock.id]: { labour: true, materials: false, extras: false } }));
  };

  // Totals across all blocks
  const calcBlockTotals = (block: QuoteBlock) => {
    const all = [...block.labour, ...block.materials, ...block.extras];
    const cost = all.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const sell = all.reduce((s, i) => s + i.qty * i.sellPrice, 0);
    return { cost, sell };
  };

  const totals = blocks.reduce((acc, b) => {
    const t = calcBlockTotals(b);
    return { cost: acc.cost + t.cost, sell: acc.sell + t.sell };
  }, { cost: 0, sell: 0 });

  const costTotal = totals.cost;
  const sellSubtotal = totals.sell;
  const markupAmount = sellSubtotal - costTotal;
  const gst = sellSubtotal * 0.15;
  const grandTotal = sellSubtotal + gst;

  const labourCatalogue = catalogueItems.filter((i) => i.section === "labour");
  const materialsCatalogue = catalogueItems.filter((i) => i.section === "materials");
  const extrasCatalogue = catalogueItems.filter((i) => i.section === "extras");

  return (
    <div className="space-y-4">
      {/* ── Global markup (set first) ────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2">
          <Switch checked={useGlobalMarkup} onCheckedChange={handleToggleGlobal} className="scale-90" />
          <Label className="text-xs font-medium">Global Markup</Label>
        </div>
        {useGlobalMarkup && (
          <div className="flex items-center gap-1">
            <Input className="w-16 h-7 text-xs text-center" type="number" min={0} value={globalMarkupValue} onChange={(e) => handleGlobalValueChange(parseFloat(e.target.value) || 0)} />
            <Percent className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* ── Empty state ──────────────────────────────────── */}
      {blocks.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3">
          <Package className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No jobs added yet. Add a bundle or custom job to start building your quote.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" size="sm" onClick={addCustomBlock} className="gap-1"><Plus className="w-4 h-4" /> Custom Job</Button>
            <Select onValueChange={(val) => openBundleDialog(val)}>
              <SelectTrigger className="h-9 w-auto min-w-[160px] text-sm gap-1">
                <Package className="w-4 h-4 shrink-0" />
                <SelectValue placeholder="Add Bundle" />
              </SelectTrigger>
              <SelectContent>
                {bundleTemplates.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── Quote blocks ─────────────────────────────────── */}
      {blocks.map((block, blockIdx) => {
        const blockTotals = calcBlockTotals(block);
        const sections = openSections[block.id] || { labour: true, materials: true, extras: false };

        return (
          <Card key={block.id} className="border-border">
            <CardContent className="pt-4 space-y-3">
              {/* Block header */}
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    value={block.name}
                    onChange={(e) => updateBlockField(block.id, "name", e.target.value)}
                    placeholder="Job name — e.g. Install Heat Pump"
                    className="h-9 text-base font-bold border-0 bg-transparent px-0 focus-visible:ring-0"
                  />
                  <Textarea
                    value={block.description}
                    onChange={(e) => {
                      updateBlockField(block.id, "description", e.target.value);
                      // Auto-resize
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    ref={(el) => {
                      if (el) {
                        el.style.height = "auto";
                        el.style.height = el.scrollHeight + "px";
                      }
                    }}
                    placeholder="Describe scope of this job…"
                    className="min-h-[80px] bg-muted/20 rounded-lg px-3 py-2 border border-border focus-visible:ring-1 focus-visible:ring-ring text-sm resize-none overflow-hidden"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {block.qty > 1 && (
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">×{block.qty}</span>
                  )}
                  <button onClick={() => deleteBlock(block.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Labour / Materials / Extras sections */}
              <BlockSection label="Labour" items={block.labour} section="labour" isOpen={sections.labour} onToggle={() => toggleSection(block.id, "labour")} onUpdate={updateItem(block.id, "labour")} onDelete={deleteItem(block.id, "labour")} onAddBlank={() => addBlankTo(block.id, "labour")} onOpenPalette={() => { setPaletteBlockId(block.id); setPaletteSection("labour"); setPaletteOpen(true); }} lastRef={lastInputRef} globalMarkupValue={globalMarkupValue} useGlobalMarkup={useGlobalMarkup} onResetToGlobal={resetToGlobal(block.id, "labour")} />
              <BlockSection label="Materials" items={block.materials} section="materials" isOpen={sections.materials} onToggle={() => toggleSection(block.id, "materials")} onUpdate={updateItem(block.id, "materials")} onDelete={deleteItem(block.id, "materials")} onAddBlank={() => addBlankTo(block.id, "materials")} onOpenPalette={() => { setPaletteBlockId(block.id); setPaletteSection("materials"); setPaletteOpen(true); }} lastRef={lastInputRef} globalMarkupValue={globalMarkupValue} useGlobalMarkup={useGlobalMarkup} onResetToGlobal={resetToGlobal(block.id, "materials")} />
              <BlockSection label="Extras" items={block.extras} section="extras" isOpen={sections.extras} onToggle={() => toggleSection(block.id, "extras")} onUpdate={updateItem(block.id, "extras")} onDelete={deleteItem(block.id, "extras")} onAddBlank={() => addBlankTo(block.id, "extras")} onOpenPalette={() => { setPaletteBlockId(block.id); setPaletteSection("extras"); setPaletteOpen(true); }} lastRef={lastInputRef} globalMarkupValue={globalMarkupValue} useGlobalMarkup={useGlobalMarkup} onResetToGlobal={resetToGlobal(block.id, "extras")} />

              {/* Block subtotal */}
              <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-muted/20 border border-border text-sm">
                <span className="font-medium text-muted-foreground">{block.name || "Job"} subtotal</span>
                <span className="font-bold">${blockTotals.sell.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* ── Add another section ──────────────────────────── */}
      {blocks.length > 0 && (
        <div className="border border-dashed border-border rounded-lg p-4 space-y-2">
          <p className="text-xs text-muted-foreground text-center">Add another job to this quote</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" size="sm" onClick={addCustomBlock} className="gap-1"><Plus className="w-4 h-4" /> Custom Job</Button>
            <Select onValueChange={(val) => openBundleDialog(val)}>
              <SelectTrigger className="h-9 w-auto min-w-[160px] text-sm gap-1">
                <Package className="w-4 h-4 shrink-0" />
                <SelectValue placeholder="Add Bundle" />
              </SelectTrigger>
              <SelectContent>
                {bundleTemplates.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── Bundle qty dialog ────────────────────────────── */}
      <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
        <DialogContent className="max-w-xs">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-card-foreground">Add {bundleTemplates.find((b) => b.id === selectedBundleId)?.name}</h3>
            <p className="text-xs text-muted-foreground">{bundleTemplates.find((b) => b.id === selectedBundleId)?.description}</p>
            <div className="flex items-center gap-3">
              <Label className="text-xs">Quantity</Label>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setBundleQty((q) => Math.max(1, q - 1))}>−</Button>
                <Input className="w-14 h-8 text-center text-sm" type="number" min={1} value={bundleQty} onChange={(e) => setBundleQty(Math.max(1, parseInt(e.target.value) || 1))} />
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setBundleQty((q) => q + 1)}>+</Button>
              </div>
            </div>
            <Button className="w-full" onClick={confirmBundleAdd}><Plus className="w-4 h-4 mr-1" /> Add ×{bundleQty}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Notes ────────────────────────────────────────── */}
      <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground w-full justify-start">
            {notesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Notes
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes for this quote…" className="mt-2 min-h-[60px]" /></CollapsibleContent>
      </Collapsible>

      {/* ── Summary card ─────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost</span><span className="font-medium">${costTotal.toFixed(2)}</span></div>
          {markupAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Markup</span><span className="font-medium text-[hsl(var(--status-green))]">+${markupAmount.toFixed(2)}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">${sellSubtotal.toFixed(2)}</span></div>
          <div className="border-t my-1" />
          <div className="flex justify-between text-sm text-muted-foreground"><span>GST (15%)</span><span>${gst.toFixed(2)}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span>${grandTotal.toFixed(2)}</span></div>
        </CardContent>
      </Card>

      {beforeActions}

      {/* ── Cover Letter ─────────────────────────────────── */}
      <Collapsible open={coverLetterOpen} onOpenChange={setCoverLetterOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground w-full justify-start">
            {coverLetterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Cover Letter
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          <Select value={coverLetterTemplate} onValueChange={(val) => { setCoverLetterTemplate(val); const tpl = coverLetterTemplates.find((t) => t.id === val); if (tpl) setCoverLetter(tpl.body); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose a template…" /></SelectTrigger>
            <SelectContent>{coverLetterTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Write your cover letter… Use {{customer_name}}, {{business_name}}, {{quote_total}}, {{job_address}}" className="min-h-[100px] text-sm" />
          <p className="text-[10px] text-muted-foreground">Variables: {"{{customer_name}}"}, {"{{business_name}}"}, {"{{quote_total}}"}, {"{{job_address}}"}</p>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Action buttons ───────────────────────────────── */}
      <div className="flex gap-2">
        <Button
          size="lg"
          className="flex-1 h-12 gap-2"
          onClick={() => {
            toast({ title: "Quote sent!", description: `$${grandTotal.toFixed(2)} quote sent to ${job.client}` });
            onSendQuote?.(grandTotal);
          }}
        ><Send className="w-5 h-5" /> Send Quote</Button>
        <QuotePreview blocks={blocks} coverLetter={coverLetter} customerName={job.client} jobAddress={job.address || ""} />
        <Button size="lg" variant="outline" className="h-12 gap-2" onClick={() => toast({ title: "Draft saved" })}><Save className="w-4 h-4" /> Save</Button>
      </div>

      {/* ── Section-filtered command palette dialog ──────── */}
      <Dialog open={paletteOpen} onOpenChange={(open) => { setPaletteOpen(open); if (!open) { setPaletteSection(null); setPaletteBlockId(null); } }}>
        <DialogContent className="p-0 max-w-md">
          <Command>
            <CommandInput placeholder={`Search ${paletteSection ?? "all"} items…`} />
            <CommandList>
              <CommandEmpty>
                <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm" onClick={() => { if (paletteBlockId) addBlankTo(paletteBlockId, paletteSection ?? "materials"); setPaletteOpen(false); setPaletteSection(null); setPaletteBlockId(null); }}>+ Add as custom item</button>
              </CommandEmpty>
              {(!paletteSection || paletteSection === "labour") && labourCatalogue.length > 0 && (
                <CommandGroup heading="Labour">{labourCatalogue.map((m) => <CommandItem key={m.id} onSelect={() => addCatalogueItem(m)}><div className="flex justify-between w-full"><span>{m.name}</span><span className="text-muted-foreground text-xs">${m.unitPrice.toFixed(2)} / {m.unit}</span></div></CommandItem>)}</CommandGroup>
              )}
              {(!paletteSection || paletteSection === "materials") && materialsCatalogue.length > 0 && (
                <CommandGroup heading="Materials">{materialsCatalogue.map((m) => <CommandItem key={m.id} onSelect={() => addCatalogueItem(m)}><div className="flex justify-between w-full"><span>{m.name}</span><span className="text-muted-foreground text-xs">${m.unitPrice.toFixed(2)} / {m.unit}</span></div></CommandItem>)}</CommandGroup>
              )}
              {(!paletteSection || paletteSection === "extras") && extrasCatalogue.length > 0 && (
                <CommandGroup heading="Extras">{extrasCatalogue.map((m) => <CommandItem key={m.id} onSelect={() => addCatalogueItem(m)}><div className="flex justify-between w-full"><span>{m.name}</span><span className="text-muted-foreground text-xs">${m.unitPrice.toFixed(2)} / {m.unit}</span></div></CommandItem>)}</CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
