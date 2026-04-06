import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Search, Plus, ChevronDown, ChevronRight, Wrench, Zap, Settings, Hammer, Bath, Trash2 } from "lucide-react";
import { PageToolbar } from "@/components/PageToolbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { bundleTemplates as defaultBundles, catalogueItems, type BundleTemplate, type CatalogueItem } from "@/data/dummyJobDetails";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { BUNDLES_EXTRAS, handleCommonTab } from "@/config/toolbarTabs";

const BUNDLE_ICONS: Record<string, React.ElementType> = {
  b1: Wrench, b2: Zap, b3: Settings, b4: Hammer, b5: Bath,
};

function getBundleTotal(b: BundleTemplate) {
  return [...b.labour, ...b.materials, ...b.extras].reduce((s, i) => s + i.qty * i.unitPrice, 0);
}



type BundleTab = "browse" | "create";

function LineItemSection({ title, items }: { title: string; items: { name: string; qty: number; unitPrice: number }[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground py-1 cursor-pointer">
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {title} ({items.length}) — ${total.toLocaleString()}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-5 space-y-1 pt-1">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-xs text-foreground/80">
            <span>{item.name} × {item.qty}</span>
            <span className="text-muted-foreground">${(item.qty * item.unitPrice).toLocaleString()}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function BrowseTab({ bundles }: { bundles: BundleTemplate[] }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return bundles;
    const q = search.toLowerCase();
    return bundles.filter(b => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
  }, [search, bundles]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bundles…" className="pl-10 h-11" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(b => {
          const Icon = BUNDLE_ICONS[b.id] || Package;
          const total = getBundleTotal(b);
          const expanded = expandedId === b.id;
          return (
            <Card
              key={b.id}
              className={`p-4 cursor-pointer transition-colors hover:bg-muted/40 ${expanded ? "ring-2 ring-primary/30" : ""}`}
              onClick={() => setExpandedId(expanded ? null : b.id)}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-card-foreground">{b.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.description}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-semibold text-primary">~${total.toLocaleString()}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {b.labour.length + b.materials.length + b.extras.length} items
                    </Badge>
                  </div>
                </div>
              </div>
              {expanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-1">
                  <LineItemSection title="Labour" items={b.labour} />
                  <LineItemSection title="Materials" items={b.materials} />
                  <LineItemSection title="Extras" items={b.extras} />
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">No bundles found</p>
        )}
      </div>
    </div>
  );
}

function CatalogueAdder({ section, onAdd }: { section: "labour" | "materials" | "extras"; onAdd: (item: CatalogueItem) => void }) {
  const [open, setOpen] = useState(false);
  const items = catalogueItems.filter(i => i.section === section);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Plus className="w-3 h-3" /> Add
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="start">
        <Command>
          <CommandInput placeholder={`Search ${section}…`} />
          <CommandList>
            <CommandEmpty>No items found</CommandEmpty>
            <CommandGroup>
              {items.map(item => (
                <CommandItem key={item.id} onSelect={() => { onAdd(item); setOpen(false); }}>
                  <span className="text-sm">{item.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">${item.unitPrice}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CreateTab({ onSave }: { onSave: (b: BundleTemplate) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [labour, setLabour] = useState<{ name: string; qty: number; unitPrice: number }[]>([]);
  const [materials, setMaterials] = useState<{ name: string; qty: number; unitPrice: number }[]>([]);
  const [extras, setExtras] = useState<{ name: string; qty: number; unitPrice: number }[]>([]);

  const addTo = (section: "labour" | "materials" | "extras") => (item: CatalogueItem) => {
    const entry = { name: item.name, qty: item.quantity, unitPrice: item.unitPrice };
    if (section === "labour") setLabour(p => [...p, entry]);
    else if (section === "materials") setMaterials(p => [...p, entry]);
    else setExtras(p => [...p, entry]);
  };

  const removeFrom = (section: "labour" | "materials" | "extras", idx: number) => {
    if (section === "labour") setLabour(p => p.filter((_, i) => i !== idx));
    else if (section === "materials") setMaterials(p => p.filter((_, i) => i !== idx));
    else setExtras(p => p.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: `b-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      labour, materials, extras,
    });
    setName(""); setDescription(""); setLabour([]); setMaterials([]); setExtras([]);
  };

  const renderSection = (title: string, section: "labour" | "materials" | "extras", items: { name: string; qty: number; unitPrice: number }[]) => (
    <Collapsible defaultOpen>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground py-2 cursor-pointer">
          <ChevronDown className="w-4 h-4" />
          {title} ({items.length})
        </CollapsibleTrigger>
        <CatalogueAdder section={section} onAdd={addTo(section)} />
      </div>
      <CollapsibleContent className="space-y-1 pl-6">
        {items.length === 0 && <p className="text-xs text-muted-foreground py-2">No items yet</p>}
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1">
            <span>{item.name} × {item.qty}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">${(item.qty * item.unitPrice).toLocaleString()}</span>
              <button onClick={() => removeFrom(section, i)} className="text-destructive/60 hover:text-destructive cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  const total = [...labour, ...materials, ...extras].reduce((s, i) => s + i.qty * i.unitPrice, 0);

  return (
    <div className="max-w-xl space-y-4">
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Bundle name…" className="h-11" autoFocus />
      <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description…" />

      <div className="space-y-2">
        {renderSection("Labour", "labour", labour)}
        {renderSection("Materials", "materials", materials)}
        {renderSection("Extras", "extras", extras)}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm font-semibold">Total: ${total.toLocaleString()}</span>
        <Button onClick={handleSave} disabled={!name.trim()} className="gap-1">
          <Package className="w-4 h-4" /> Save Bundle
        </Button>
      </div>
    </div>
  );
}

export default function BundlesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<BundleTab>("browse");
  const [customBundles, setCustomBundles] = useState<BundleTemplate[]>([]);
  const allBundles = useMemo(() => [...defaultBundles, ...customBundles], [customBundles]);

  const handleTabChange = (id: string) => {
    if (id === "back") { navigate("/"); return; }
    handleCommonTab(id, navigate);
  };

  return (
    <PageToolbar
      tabs={BUNDLES_EXTRAS}
      activeTab="bundles"
      onTabChange={handleTabChange}
      pageHeading={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-card-foreground font-bold text-base">Bundle Templates</span>
            <Badge variant="secondary" className="text-xs">{allBundles.length}</Badge>
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <Button
              variant="ghost" size="sm"
              onClick={() => setTab("browse")}
              className={`h-7 px-2.5 gap-1.5 text-xs ${tab === "browse" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
            >
              <Search className="w-3.5 h-3.5" /> Browse
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => setTab("create")}
              className={`h-7 px-2.5 gap-1.5 text-xs ${tab === "create" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
            >
              <Plus className="w-3.5 h-3.5" /> Create
            </Button>
          </div>
        </div>
      }
    >
      {tab === "browse" ? (
        <BrowseTab bundles={allBundles} />
      ) : (
        <CreateTab onSave={b => { setCustomBundles(p => [...p, b]); setTab("browse"); }} />
      )}
    </PageToolbar>
  );
}
