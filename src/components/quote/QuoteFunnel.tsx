import { useState, useMemo, useRef, useEffect } from "react";
import { Search, ArrowLeft, ArrowRight, Wrench, Zap, Settings, Hammer, Bath, Pencil, ChevronsUpDown, Package, X, Mic, Square, Loader2, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDemoData } from "@/contexts/DemoDataContext";
import { bundleTemplates, type BundleTemplate } from "@/data/dummyJobDetails";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { DemoCustomer } from "@/types/demoData";
import { formatCustomerAddressSubtitle } from "@/lib/customerAddress";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import type { AiQuickQuoteDraft } from "@/types/aiQuickQuote";
import { extractQuickQuoteWithAi, filesToDataUrls } from "@/services/aiQuoteService";
import { toast } from "@/hooks/use-toast";

export interface FunnelResult {
  customer: DemoCustomer | null;
  address: string;
  bundle: BundleTemplate | null;
  description: string;
  aiDraft?: AiQuickQuoteDraft;
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

function QuickAiCapture({
  customers,
  materials,
  onApply,
}: {
  customers: DemoCustomer[];
  materials: { id: string; name: string; unit: string; unitPrice: number }[];
  onApply: (draft: AiQuickQuoteDraft, matchedCustomer: DemoCustomer | null) => void;
}) {
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const recRef = useRef<SpeechRecognition | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef("");
  const transcriptBaseRef = useRef("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setRecording(false);
  };

  const start = () => {
    const w = window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Voice unavailable", description: "Use Chrome/Edge with microphone permissions.", variant: "destructive" });
      return;
    }
    transcriptBaseRef.current = transcriptRef.current.trim();
    const rec = new SR();
    rec.lang = navigator.language?.startsWith("en") ? navigator.language : "en-NZ";
    rec.maxAlternatives = 1;
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      const finalParts: string[] = [];
      const interimParts: string[] = [];
      for (let i = 0; i < ev.results.length; i++) {
        const chunk = ev.results[i]?.[0]?.transcript?.trim() ?? "";
        if (!chunk) continue;
        if (ev.results[i].isFinal) {
          finalParts.push(chunk);
        } else {
          interimParts.push(chunk);
        }
      }
      const recognized = [...finalParts, ...interimParts].join(" ").trim();
      const base = transcriptBaseRef.current;
      setTranscript([base, recognized].filter(Boolean).join(" ").trim());
    };
    rec.onerror = () => {
      toast({ title: "Mic error", description: "Check microphone permission.", variant: "destructive" });
      stop();
    };
    rec.onend = () => {
      recRef.current = null;
      setRecording(false);
    };
    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      toast({ title: "Could not start microphone", variant: "destructive" });
      stop();
    }
  };

  const apply = async () => {
    if (!transcript.trim()) return;
    setExtracting(true);
    try {
      const photoDataUrls = await filesToDataUrls(photos);
      const draft = await extractQuickQuoteWithAi({
        transcript: transcript.trim(),
        photoDataUrls,
        customers,
        materials,
      });
      const matched = typeof draft.customerId === "number"
        ? customers.find((c) => c.id === draft.customerId) ?? null
        : null;
      onApply(draft, matched);
      toast({ title: "AI draft ready", description: "Review prefilled quote details." });
    } catch (e) {
      toast({ title: "AI extraction failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-card-foreground">Quick AI Quote</p>
          <p className="text-xs text-muted-foreground">Tap mic, narrate the job, optionally add photos, then auto-fill.</p>
        </div>
        <Button type="button" size="sm" variant={recording ? "destructive" : "default"} className="gap-1" onClick={() => (recording ? stop() : start())}>
          {recording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {recording ? "Stop" : "Record"}
        </Button>
      </div>
      <Textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Example: New hot water cylinder at 12 Wai Shing Place for Jamie Mackie, standard kit, about 2 hours..."
        className="min-h-[90px]"
      />
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">{photos.length} photo(s) attached</div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          />
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => fileRef.current?.click()}>
            <Camera className="w-3.5 h-3.5" />
            Photos
          </Button>
          <Button type="button" size="sm" className="gap-1" disabled={!transcript.trim() || extracting} onClick={apply}>
            {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Extract
          </Button>
        </div>
      </div>
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
        (c.phone ?? "").includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.address ?? "").toLowerCase().includes(q)
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
              {(() => {
                const phone = (c.phone ?? "").trim();
                const addr = formatCustomerAddressSubtitle(c.address);
                if (phone && addr) return `${phone} · ${addr}`;
                if (phone) return phone;
                if (addr) return addr;
                return (c.email ?? "").trim() || "No contact on file";
              })()}
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
  customer,
}: {
  address: string;
  onAddressChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  customer: DemoCustomer | null;
}) {
  const primary = (customer?.address ?? "").trim();

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-lg font-bold text-card-foreground">Site Address</h2>

      {customer && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {primary
            ? "Loaded from the customer record. Change it if this job is at a different site."
            : "No address on file for this customer — enter the job site below."}
        </p>
      )}

      <Input
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        placeholder="Enter site address…"
        className="h-12"
      />

      {customer && primary ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-10 text-xs"
            onClick={() => onAddressChange(primary)}
          >
            Reset to customer&apos;s address
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full h-9 text-xs text-muted-foreground"
            onClick={() => onAddressChange("")}
          >
            Different site — clear and type a new address
          </Button>
        </div>
      ) : null}

      <Button type="button" className="w-full h-12 gap-2" onClick={onNext}>
        Next <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ── Bundle Search Dropdown ─────────────────────────────── */
function BundleSearchDropdown({ bundles, onSelect }: { bundles: BundleTemplate[]; onSelect: (b: BundleTemplate) => void }) {
  const [active, setActive] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return bundles;
    const q = search.toLowerCase();
    return bundles.filter((b) => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
  }, [bundles, search]);

  useEffect(() => {
    if (active && bundles.length > 0) {
      // Scroll into view without forcing focus — avoids mobile keyboard covering the list until user taps search.
      setTimeout(() => containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, [active, bundles.length]);

  if (bundles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
        No bundles in your library yet. Use <span className="font-medium text-foreground">Custom Job</span> above.
      </div>
    );
  }

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
          autoComplete="off"
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
  bundles,
  onSelectBundle,
  onCustom,
  onBack,
}: {
  bundles: BundleTemplate[];
  onSelectBundle: (b: BundleTemplate) => void;
  onCustom: (desc: string) => void;
  onBack: () => void;
}) {
  const [customDesc, setCustomDesc] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [descUnlocked, setDescUnlocked] = useState(false);

  useEffect(() => {
    if (showCustom) setDescUnlocked(false);
  }, [showCustom]);

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
              <div className="flex gap-2 items-start">
                <Textarea
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Describe the work — tap to type, or use the mic"
                  className="min-h-[80px] flex-1 min-w-0"
                  readOnly={!descUnlocked}
                  onPointerDown={() => setDescUnlocked(true)}
                  onFocus={() => setDescUnlocked(true)}
                  inputMode="text"
                />
                <VoiceInputButton
                  className="h-10 w-10 shrink-0 mt-0.5"
                  onTranscript={(t) => {
                    setDescUnlocked(true);
                    setCustomDesc((prev) => {
                      const p = prev.trim();
                      return p ? `${p} ${t}` : t;
                    });
                  }}
                />
              </div>
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
        {bundles.length > 0 && (
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or choose a bundle</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* Searchable bundle dropdown */}
        <BundleSearchDropdown bundles={bundles} onSelect={onSelectBundle} />
      </div>
    </div>
  );
}

/* ── Main Funnel (pure content, no page shell) ─────────── */
export function QuoteFunnel({ onComplete, onStepChange, label = "quote", initialCustomer }: QuoteFunnelProps) {
  const { customers, materials, usingProdData } = useDemoData();
  const demoBundles = usingProdData ? [] : bundleTemplates;
  const startStep = initialCustomer ? 2 : 1;
  const [step, _setStep] = useState(startStep);
  const setStep = (s: number) => { _setStep(s); onStepChange?.(s); };
  const [customer, setCustomer] = useState<DemoCustomer | null>(initialCustomer || null);
  const [address, setAddress] = useState(() => (initialCustomer?.address ?? "").trim());

  useEffect(() => {
    if (step !== 2 || !customer) return;
    const fromCustomer = (customer.address ?? "").trim();
    if (!fromCustomer) return;
    setAddress((prev) => (prev.trim() ? prev : fromCustomer));
  }, [step, customer]);

  const handleSelectCustomer = (c: DemoCustomer) => {
    setCustomer(c);
    setAddress((c.address ?? "").trim());
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

  const handleApplyAiDraft = (draft: AiQuickQuoteDraft, matchedCustomer: DemoCustomer | null) => {
    const nextCustomer = matchedCustomer ?? customer;
    const nextAddress = (draft.siteAddress || nextCustomer?.address || address || "").trim();
    onComplete({
      customer: nextCustomer,
      address: nextAddress,
      bundle: null,
      description: (draft.scopeSummary || transcriptFallback(draft) || "").trim(),
      aiDraft: draft,
    });
  };

  return (
    <div className="max-w-lg mx-auto">
      <QuickAiCapture customers={customers} materials={materials} onApply={handleApplyAiDraft} />
      {step === 1 && (
        <StepCustomer onSelect={handleSelectCustomer} onSkip={handleSkipCustomer} label={label} customers={customers} />
      )}
      {step === 2 && (
        <StepAddress
          address={address}
          onAddressChange={setAddress}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
          customer={customer}
        />
      )}
      {step === 3 && (
        <StepBundle
          bundles={demoBundles}
          onSelectBundle={handleSelectBundle}
          onCustom={handleCustomDescription}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}

function transcriptFallback(draft: AiQuickQuoteDraft): string {
  const bits: string[] = [];
  if (draft.scopeSummary?.trim()) bits.push(draft.scopeSummary.trim());
  if (draft.materialsSuggested?.length) {
    const top = draft.materialsSuggested.slice(0, 3).map((m) => `${m.qty} ${m.unit} ${m.name}`).join(", ");
    bits.push(`Materials: ${top}`);
  }
  if (draft.labourSuggested?.length) {
    const h = draft.labourSuggested.reduce((s, l) => s + (l.hours || 0), 0);
    if (h > 0) bits.push(`Labour: ${h} hours`);
  }
  return bits.join(". ");
}

/* Export step hook for parent to track current step */
export function useQuoteFunnelStep() {
  const [step, setStep] = useState(1);
  return { step, setStep };
}
