import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { extractQuickQuoteWithAi, filesToDataUrls, resolveCustomerWithAi } from "@/services/aiQuoteService";
import { toast } from "@/hooks/use-toast";
import { mergeOverlappingFinalSegments, sanitizeTranscript } from "@/lib/speechText";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
  onCreateCustomer,
}: {
  customers: DemoCustomer[];
  materials: { id: string; name: string; unit: string; unitPrice: number }[];
  onApply: (draft: AiQuickQuoteDraft, matchedCustomer: DemoCustomer | null) => void;
  onCreateCustomer: (customer: Omit<DemoCustomer, "id">) => Promise<number | undefined>;
}) {
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [draft, setDraft] = useState<AiQuickQuoteDraft | null>(null);
  const [customerChoice, setCustomerChoice] = useState("none");
  const [matchScores, setMatchScores] = useState<
    Array<{ id: number; name: string; address: string; phone?: string; email?: string; score: number; reasons: string[] }>
  >([]);
  const [reviewAddress, setReviewAddress] = useState("");
  const [reviewScope, setReviewScope] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const recRef = useRef<SpeechRecognition | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef("");
  const transcriptBaseRef = useRef("");
  const sessionFinalRef = useRef("");
  const isMobile = useIsMobile();

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
    if (recRef.current) {
      return;
    }
    const w = window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Voice unavailable", description: "Use Chrome/Edge with microphone permissions.", variant: "destructive" });
      return;
    }
    transcriptBaseRef.current = transcriptRef.current.trim();
    sessionFinalRef.current = "";
    const rec = new SR();
    rec.lang = navigator.language?.startsWith("en") ? navigator.language : "en-NZ";
    rec.maxAlternatives = 1;
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      // Rebuild finals from the full `results` list (same index can grow), then merge
      // overlapping finals common on Samsung Chrome (repeated growing "1 2 3 …" chains).
      const finalChunks: string[] = [];
      for (let i = 0; i < ev.results.length; i++) {
        if (!ev.results[i].isFinal) continue;
        const chunk = ev.results[i]?.[0]?.transcript?.trim() ?? "";
        if (chunk) finalChunks.push(chunk);
      }
      sessionFinalRef.current = sanitizeTranscript(mergeOverlappingFinalSegments(finalChunks));

      const interimParts: string[] = [];
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) continue;
        const chunk = ev.results[i]?.[0]?.transcript?.trim() ?? "";
        if (chunk) interimParts.push(chunk);
      }
      const interimJoined = sanitizeTranscript(interimParts.join(" ").trim());
      const base = transcriptBaseRef.current;
      const liveSession = interimJoined
        ? mergeOverlappingFinalSegments([sessionFinalRef.current, interimJoined])
        : sessionFinalRef.current;
      setTranscript(
        sanitizeTranscript([base, liveSession].filter(Boolean).join(" ").trim())
      );
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

      let defaultChoice = "none";
      let rankedMatches: Array<{ id: number; name: string; address: string; phone?: string; email?: string; score: number; reasons: string[] }> = [];
      try {
        const resolution = await resolveCustomerWithAi({
          customerName: draft.customerName || "",
          customerPhone: draft.customerPhone || "",
          customerEmail: draft.customerEmail || "",
          siteAddress: draft.siteAddress || "",
          customers,
        });
        rankedMatches = resolution.topMatches ?? [];
        if (resolution.canAutoSelect && typeof resolution.bestMatchId === "number") {
          defaultChoice = `match:${resolution.bestMatchId}`;
        } else if (resolution.shouldCreateNew) {
          defaultChoice = "create";
        } else if (typeof resolution.bestMatchId === "number" && resolution.bestMatchScore >= 0.62) {
          defaultChoice = `match:${resolution.bestMatchId}`;
        }
        setNewCustomerName(resolution.extractedCustomer?.name || draft.customerName || "");
        setNewCustomerPhone(resolution.extractedCustomer?.phone || draft.customerPhone || "");
        setNewCustomerEmail(resolution.extractedCustomer?.email || draft.customerEmail || "");
        setNewCustomerAddress(resolution.extractedCustomer?.address || draft.siteAddress || "");
      } catch {
        // Fallback to existing extraction result if resolver endpoint fails.
        const matched = typeof draft.customerId === "number"
          ? customers.find((c) => c.id === draft.customerId) ?? null
          : null;
        if (matched) defaultChoice = `match:${matched.id}`;
        setNewCustomerName(draft.customerName || "");
        setNewCustomerPhone(draft.customerPhone || "");
        setNewCustomerEmail(draft.customerEmail || "");
        setNewCustomerAddress(draft.siteAddress || "");
      }

      setMatchScores(rankedMatches);
      setDraft(draft);
      setCustomerChoice(defaultChoice);
      setReviewAddress(draft.siteAddress || "");
      setReviewScope((draft.scopeSummary || transcript.trim()).trim());
      setExtraDetails("");
      toast({ title: "AI draft ready", description: "Confirm customer, address and scope." });
    } catch (e) {
      toast({ title: "AI extraction failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const applyReviewedDraft = async () => {
    if (!draft) return;
    const trimmedScope = reviewScope.trim();
    if (!trimmedScope) {
      toast({ title: "Scope is missing", description: "Confirm the job description before applying.", variant: "destructive" });
      return;
    }
    setApplying(true);
    try {
      let selectedCustomer: DemoCustomer | null = null;
      if (customerChoice.startsWith("match:")) {
        const selectedId = Number(customerChoice.replace("match:", ""));
        selectedCustomer = customers.find((c) => c.id === selectedId) ?? null;
      } else if (customerChoice === "create") {
        const name = newCustomerName.trim();
        if (!name) {
          toast({ title: "Customer name required", description: "Add a name to create a new customer.", variant: "destructive" });
          return;
        }
        const payload: Omit<DemoCustomer, "id"> = {
          name,
          phone: newCustomerPhone.trim(),
          email: newCustomerEmail.trim(),
          address: newCustomerAddress.trim() || reviewAddress.trim(),
          jobs: 0,
          status: "leads",
          totalSpend: 0,
          notes: [],
          contacts: [],
          jobHistory: [],
        };
        const createdId = await onCreateCustomer(payload);
        if (!createdId) {
          toast({ title: "Could not create customer", description: "Please try again or pick an existing customer.", variant: "destructive" });
          return;
        }
        selectedCustomer = { id: createdId, ...payload };
      }

      const finalScope = [trimmedScope, extraDetails.trim()]
        .filter(Boolean)
        .join("\n\n");
      const finalDraft: AiQuickQuoteDraft = {
        ...draft,
        scopeSummary: finalScope,
        siteAddress: reviewAddress.trim() || draft.siteAddress,
      };
      onApply(finalDraft, selectedCustomer);
      setDraft(null);
      setMatchScores([]);
      setCustomerChoice("none");
      setTranscript("");
      setPhotos([]);
      setExtraDetails("");
      toast({ title: "Quote details applied", description: "AI details have been reviewed and prefilled." });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/30 bg-card mb-4 space-y-4 p-4",
        isMobile && "shadow-sm"
      )}
    >
      <div className={cn("text-center", !isMobile && "text-left sm:flex sm:items-start sm:justify-between sm:gap-3")}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-card-foreground">Quick AI Quote</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap the mic, say the job, add site photos if you like, then run AI interpretation.
          </p>
        </div>
        {!isMobile && (
          <Button
            type="button"
            size="sm"
            variant={recording ? "destructive" : "default"}
            className="gap-1 shrink-0"
            onClick={() => (recording ? stop() : start())}
          >
            {recording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {recording ? "Stop" : "Record"}
          </Button>
        )}
      </div>

      {isMobile && (
        <div className="flex flex-col items-center gap-2 py-1">
          <button
            type="button"
            aria-label={recording ? "Stop recording" : "Start recording"}
            aria-pressed={recording}
            onClick={() => (recording ? stop() : start())}
            className={cn(
              "rounded-full flex items-center justify-center shadow-lg transition-all active:scale-[0.97]",
              "min-h-[5.5rem] min-w-[5.5rem] h-[5.5rem] w-[5.5rem]",
              recording ? "bg-destructive text-destructive-foreground ring-4 ring-destructive/25" : "bg-primary text-primary-foreground ring-4 ring-primary/20"
            )}
          >
            {recording ? <Square className="w-9 h-9" /> : <Mic className="w-10 h-10" />}
          </button>
          <p className="text-xs font-medium text-muted-foreground">{recording ? "Listening… tap to stop" : "Tap to dictate"}</p>
        </div>
      )}

      <Textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Example: New hot water cylinder at 12 Wai Shing Place for Jamie Mackie, standard kit, about 2 hours..."
        className={cn("min-h-[100px] text-base sm:text-sm", isMobile && "min-h-[120px]")}
      />

      <div className={cn("flex flex-col gap-3", !isMobile && "sm:flex-row sm:items-center sm:justify-between")}>
        <div className="text-xs text-muted-foreground">{photos.length} photo(s) attached</div>
        <div className={cn("flex flex-col gap-2", !isMobile && "sm:flex-row sm:items-center sm:gap-2")}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          />
          <Button
            type="button"
            variant="outline"
            size={isMobile ? "default" : "sm"}
            className={cn("gap-2 w-full", !isMobile && "sm:w-auto")}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="w-4 h-4 shrink-0" />
            Photos
          </Button>
          <Button
            type="button"
            size={isMobile ? "default" : "sm"}
            className={cn("gap-2 w-full font-semibold", !isMobile && "sm:w-auto")}
            disabled={!transcript.trim() || extracting}
            title="Send transcript and photos to AI for interpretation and line-item suggestions"
            onClick={apply}
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Zap className="w-4 h-4 shrink-0" />}
            {extracting ? "Analysing…" : "Interpret with AI"}
          </Button>
        </div>
      </div>
      {draft && (
        <div className="rounded-lg border border-border bg-background/60 p-3 space-y-4">
          <div>
            <p className="text-sm font-semibold text-card-foreground">Review AI details</p>
            <p className="text-xs text-muted-foreground">Confirm customer, site and scope before starting the quote.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer match</Label>
            <RadioGroup value={customerChoice} onValueChange={setCustomerChoice} className="space-y-2">
              {matchScores.map((m) => (
                <label
                  key={m.id}
                  htmlFor={`customer-match-${m.id}`}
                  className="flex items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2 cursor-pointer"
                >
                  <RadioGroupItem value={`match:${m.id}`} id={`customer-match-${m.id}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(m.phone || "").trim() || (m.email || "").trim() || m.address || "No contact details"}
                      {" · "}
                      match {Math.round((m.score || 0) * 100)}%
                    </p>
                    {m.reasons.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{m.reasons.join(" · ")}</p>
                    )}
                  </div>
                </label>
              ))}
              <label
                htmlFor="customer-match-create"
                className="flex items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2 cursor-pointer"
              >
                <RadioGroupItem value="create" id="customer-match-create" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-card-foreground">Create new customer</p>
                  <p className="text-xs text-muted-foreground">Use the extracted details to create a new customer record.</p>
                </div>
              </label>
              <label
                htmlFor="customer-match-none"
                className="flex items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2 cursor-pointer"
              >
                <RadioGroupItem value="none" id="customer-match-none" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-card-foreground">No customer yet</p>
                  <p className="text-xs text-muted-foreground">Continue without linking this quote to a customer.</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {customerChoice === "create" && (
            <div className="space-y-2 rounded-md border border-border bg-card p-2.5">
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Customer name"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Phone"
                />
                <Input
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>
              <Input
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                placeholder="Customer address"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Site address</Label>
            <Input
              value={reviewAddress}
              onChange={(e) => setReviewAddress(e.target.value)}
              placeholder="Confirm site address"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job description</Label>
            <Textarea
              value={reviewScope}
              onChange={(e) => setReviewScope(e.target.value)}
              placeholder="Is this job summary correct?"
              className="min-h-[90px]"
            />
            <Textarea
              value={extraDetails}
              onChange={(e) => setExtraDetails(e.target.value)}
              placeholder="Anything else to add before we build the quote?"
              className="min-h-[70px]"
            />
          </div>

          {(draft.missingFields.length > 0 || draft.reviewFlags.length > 0) && (
            <div className="rounded-md border border-amber-300/50 bg-amber-50/50 p-2.5 space-y-2">
              {draft.missingFields.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-900">AI says details are missing:</p>
                  <ul className="text-xs text-amber-900/90 list-disc pl-4">
                    {draft.missingFields.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              )}
              {draft.reviewFlags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-900">Review flags:</p>
                  <ul className="text-xs text-amber-900/90 list-disc pl-4">
                    {draft.reviewFlags.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={applying} onClick={applyReviewedDraft} className="gap-1">
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Apply reviewed draft
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={applying}
              onClick={() => {
                setDraft(null);
                setMatchScores([]);
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}
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
  const [searchParams] = useSearchParams();
  const hideQuickAi = searchParams.get("mode") === "guided";
  const { customers, materials, usingProdData, addCustomer } = useDemoData();
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
    <div className="w-full max-w-lg mx-auto">
      {!hideQuickAi && (
        <QuickAiCapture customers={customers} materials={materials} onApply={handleApplyAiDraft} onCreateCustomer={addCustomer} />
      )}
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
