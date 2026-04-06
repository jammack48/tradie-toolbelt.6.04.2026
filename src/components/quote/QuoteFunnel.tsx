import { useState, useMemo, useRef, useEffect } from "react";
import { Search, ArrowLeft, ArrowRight, Wrench, Zap, Settings, Hammer, Bath, Pencil, ChevronsUpDown, Package, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDemoData } from "@/contexts/DemoDataContext";
import { bundleTemplates, type BundleTemplate } from "@/data/dummyJobDetails";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { DemoCustomer } from "@/types/demoData";

export interface FunnelResult {
  customer: DemoCustomer | null;
  address: string;
  bundle: BundleTemplate | null;
  description: string;
}

interface QuoteFunnelProps {
  onComplete: (data: FunnelResult) => void;
  onStepChange?: (step: number) => void;
  label?: string;
  initialCustomer?: DemoCustomer | null;
}

const BUNDLE_ICONS: Record<string, React.ElementType> = {
  b1: Wrench,
  b2: Zap,
  b3: Settings,
  b4: Hammer,
  b5: Bath,
};

function getBundleTotal(b: BundleTemplate) {
  const labour = b.labour.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const materials = b.materials.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const extras = b.extras.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  return labour + materials + extras;
}

/* ── Progress dots (exported for parent heading bar) ──── */
export function StepIndicator({ current }: { current: number }) {
  const labels = ["Customer", "Address", "Scope"];
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-1.5">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              n <= current ? "bg-primary" : "bg-muted"
            }`}
          />
          <span className={`text-xs ${n <= current ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {labels[n - 1]}
          </span>
          {n < 3 && <span className="text-muted-foreground/40 text-xs mx-0.5">›</span>}
        </div>
      ))}
    </div>
  );
}

/* ── Step 1: Select Customer ───────────────────────────── */
function StepCustomer({ onSelect, onSkip, label = "quote", customers }: { onSelect: (c: DemoCustomer) => void; onSkip: () => void; label?: string; customers: DemoCustomer[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-card-foreground">Who is this {label} for?</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="pl-10 h-12"
          autoFocus
        />
      </div>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="w-full text-left rounded-lg border border-border bg-card p-4 min-h-[56px] hover:bg-muted/60 active:bg-muted transition-colors cursor-pointer"
          >
            <div className="font-medium text-sm text-card-foreground">{c.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {c.phone} · {c.address}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No customers found</p>
        )}
      </div>

      <Button
        variant="ghost"
        className="w-full h-12 text-muted-foreground"
        onClick={onSkip}
      >
        Skip — no customer yet
      </Button>
    </div>
  );
}

/* ── Step 2: Confirm Address ───────────────────────────── */
function StepAddress({
  address,
  onAddressChange,
  onNext,
  onBack,
}: {
  address: string;
  onAddressChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-lg font-bold text-card-foreground">Site Address</h2>

      <Input
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        placeholder="Enter site address…"
        className="h-12"
        autoFocus
      />

      <Button className="w-full h-12 gap-2" onClick={onNext}>
        Next <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ── Bundle Search Dropdown ─────────────────────────────── */
function BundleSearchDropdown({ onSelect }: { onSelect: (b: BundleTemplate) => void }) {
  const [active, setActive] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return bundleTemplates;
    const q = search.toLowerCase();
    return bundleTemplates.filter(b => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
  }, [search]);

  useEffect(() => {
    if (active && inputRef.current) {
      inputRef.current.focus();
      // Scroll container into view so keyboard doesn't hide it
      setTimeout(() => containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, [active]);

  if (!active) {
    return (
      <Button
        variant="outline"
        className="w-full h-12 justify-between text-sm font-normal"
        onClick={() => setActive(true)}
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Package className="w-4 h-4" /> Select a bundle…
        </span>
        <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <div ref={containerRef} className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Sticky search bar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 sticky top-0 bg-card z-10">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search bundles…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button onClick={() => { setActive(false); setSearch(""); }} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results list */}
      <div className="max-h-[45vh] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No bundles found</p>
        )}
        {filtered.map(b => {
          const Icon = BUNDLE_ICONS[b.id] || Wrench;
          const total = getBundleTotal(b);
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              className="w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-muted/60 active:bg-muted transition-colors cursor-pointer border-b border-border last:border-b-0"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-card-foreground">{b.name}</div>
                <div className="text-xs text-muted-foreground truncate">{b.description}</div>
              </div>
              <span className="text-xs font-semibold text-primary shrink-0">~${total.toLocaleString()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 3: Bundle or Custom ──────────────────────────── */
function StepBundle({
  onSelectBundle,
  onCustom,
  onBack,
}: {
  onSelectBundle: (b: BundleTemplate) => void;
  onCustom: (desc: string) => void;
  onBack: () => void;
}) {
  const [customDesc, setCustomDesc] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-lg font-bold text-card-foreground">What's the job?</h2>

      <div className="space-y-3 max-h-[55vh] overflow-y-auto">
        {/* Custom job — prominent first */}
        <div className="rounded-xl border-2 border-primary/30 bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Pencil className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-card-foreground">Custom Job</div>
              <div className="text-xs text-muted-foreground mt-0.5">Describe the work in your own words</div>
            </div>
          </div>

          {!showCustom ? (
            <Button
              className="w-full mt-3 h-12 gap-2"
              onClick={() => setShowCustom(true)}
            >
              <Pencil className="w-4 h-4" /> Write a description
            </Button>
          ) : (
            <div className="mt-3 space-y-3">
              <Textarea
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Describe the work — e.g. 'Replace hot water cylinder and reroute pipework in ground floor bathroom'"
                className="min-h-[80px]"
                autoFocus
              />
              <Button
                className="w-full h-12"
                disabled={!customDesc.trim()}
                onClick={() => onCustom(customDesc.trim())}
              >
                Start Quote
              </Button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">or choose a bundle</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Searchable bundle dropdown */}
        <BundleSearchDropdown onSelect={onSelectBundle} />
      </div>
    </div>
  );
}

/* ── Main Funnel (pure content, no page shell) ─────────── */
export function QuoteFunnel({ onComplete, onStepChange, label = "quote", initialCustomer }: QuoteFunnelProps) {
  const { customers } = useDemoData();
  const startStep = initialCustomer ? 2 : 1;
  const [step, _setStep] = useState(startStep);
  const setStep = (s: number) => { _setStep(s); onStepChange?.(s); };
  const [customer, setCustomer] = useState<DemoCustomer | null>(initialCustomer || null);
  const [address, setAddress] = useState(initialCustomer?.address || "");

  const handleSelectCustomer = (c: DemoCustomer) => {
    setCustomer(c);
    setAddress(c.address);
    setStep(2);
  };

  const handleSkipCustomer = () => {
    setCustomer(null);
    setAddress("");
    setStep(2);
  };

  const handleSelectBundle = (b: BundleTemplate) => {
    onComplete({ customer, address, bundle: b, description: b.description || b.name });
  };

  const handleCustomDescription = (desc: string) => {
    onComplete({ customer, address, bundle: null, description: desc });
  };

  return (
    <div className="max-w-lg mx-auto">
      {step === 1 && (
        <StepCustomer onSelect={handleSelectCustomer} onSkip={handleSkipCustomer} label={label} customers={customers} />
      )}
      {step === 2 && (
        <StepAddress
          address={address}
          onAddressChange={setAddress}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepBundle
          onSelectBundle={handleSelectBundle}
          onCustom={handleCustomDescription}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}

/* Export step hook for parent to track current step */
export function useQuoteFunnelStep() {
  const [step, setStep] = useState(1);
  return { step, setStep };
}
