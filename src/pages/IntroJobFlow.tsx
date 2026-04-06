import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, User, Phone, Mail, MapPin, FileText,
  Mic, MicOff, Clock, DollarSign,
  Package, Plus, Trash2, Send, Receipt, Truck, PhoneCall, Settings2,
  HelpCircle, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAppMode } from "@/contexts/AppModeContext";
import { useToolbarPosition } from "@/contexts/ToolbarPositionContext";

const INTRO_INVOICES_KEY = "introSentInvoices";

export interface IntroInvoiceRecord {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  total: number;
  sentAt: string;
}

export function loadIntroInvoices(): IntroInvoiceRecord[] {
  try {
    const raw = localStorage.getItem(INTRO_INVOICES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIntroInvoice(invoice: IntroInvoiceRecord) {
  const invoices = loadIntroInvoices();
  localStorage.setItem(INTRO_INVOICES_KEY, JSON.stringify([invoice, ...invoices]));
}

/* ─── Types ─── */
interface LabourLine { id: string; hours: number; rate: number; }
interface AddOn { id: string; label: string; amount: number; enabled: boolean; icon: typeof Truck; }
interface MaterialLine { id: string; name: string; costPrice: number; markup: number; qty: number; }

const GST_RATE = 0.15;
const fmtGST = (ex: number) => `$${ex.toFixed(0)} +GST ($${(ex * GST_RATE).toFixed(0)})`;

const QUICK_PHRASES = [
  "Arrived on site", "Spoke with customer", "Diagnosed fault", "Completed repair",
  "Tested & commissioned", "Cleaned up site", "Left materials on site", "Isolated power/water",
];

const DEFAULT_ADDONS: AddOn[] = [
  { id: "van", label: "Van Charge", amount: 25, enabled: false, icon: Truck },
  { id: "callout", label: "Call-out Fee", amount: 85, enabled: false, icon: PhoneCall },
  { id: "admin", label: "Admin Fee", amount: 15, enabled: false, icon: Settings2 },
];

/* ─── Guided tooltip data per step ─── */
const STEP_TIPS: Record<number, { text: string; delay: number; duration: number }[]> = {
  0: [{ text: "Tap the little bars icon top-right to move your menu or change colours.", delay: 300, duration: 5000 }],
  1: [
    { text: "👆 Tap the blue chips to quickly add what you did", delay: 300, duration: 4000 },
    { text: "🎤 Or hit Dictate and speak — it types for you!", delay: 4500, duration: 4000 },
  ],
  2: [
    { text: "⏱ Set your hours and hourly rate — GST is added automatically", delay: 300, duration: 4000 },
    { text: "👆 Tap the extras to add them — tap again to remove", delay: 4500, duration: 4000 },
  ],
  3: [{ text: "📦 Add materials with your cost & markup — the sell price calculates itself!", delay: 300, duration: 5000 }],
  4: [{ text: "✅ Check everything looks right, then hit Send!", delay: 300, duration: 4000 }],
};

/* ─── Auto-dismissing tooltip banner ─── */
function GuidedTip({ tips, guidedMode }: { tips: typeof STEP_TIPS[0]; guidedMode: boolean }) {
  const [visibleIdx, setVisibleIdx] = useState(-1);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!guidedMode) return;
    setVisibleIdx(-1);
    setDismissed(false);
    const timers: ReturnType<typeof setTimeout>[] = [];
    tips.forEach((tip, i) => {
      timers.push(setTimeout(() => setVisibleIdx(i), tip.delay));
      timers.push(setTimeout(() => setVisibleIdx(prev => prev === i ? -1 : prev), tip.delay + tip.duration));
    });
    return () => timers.forEach(clearTimeout);
  }, [tips, guidedMode]);

  if (!guidedMode || dismissed || visibleIdx < 0 || !tips[visibleIdx]) return null;

  return (
    <div className="absolute left-0 right-0 top-2 z-20 bg-blue-600 border border-blue-500 rounded-xl px-3 py-2 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300 shadow-md">
      <HelpCircle className="w-5 h-5 text-blue-50 shrink-0 mt-0.5" />
      <p className="text-sm font-medium text-blue-50 flex-1">{tips[visibleIdx].text}</p>
      <button onClick={() => setDismissed(true)} className="text-blue-100/80 hover:text-blue-50">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Step dots ─── */
function StepDots({ current }: { current: number }) {
  const labels = ["Customer", "Work", "Labour", "Materials", "Invoice"];
  return (
    <div className="flex items-center gap-1.5">
      {labels.map((lbl, i) => (
        <div key={lbl} className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors",
          i === current ? "bg-primary text-primary-foreground" : i < current ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {i < current ? "✓" : i + 1}
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export default function IntroJobFlow() {
  const { clearMode } = useAppMode();
  const { position } = useToolbarPosition();
  const [formKey, setFormKey] = useState(0);

  // Reset key forces full remount of inner form
  return <IntroJobFlowInner key={formKey} onReset={() => setFormKey(k => k + 1)} clearMode={clearMode} position={position} />;
}

function IntroJobFlowInner({ onReset, clearMode, position }: { onReset: () => void; clearMode: () => void; position: string }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [guidedMode, setGuidedMode] = useState(() => {
    try { return localStorage.getItem("introGuided") !== "false"; } catch { return true; }
  });

  // Step 0: Customer
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // Step 1: What was done
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [workDescription, setWorkDescription] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Step 2: Labour
  const [labourLines, setLabourLines] = useState<LabourLine[]>([{ id: "lab-1", hours: 1, rate: 95 }]);
  const [addOns, setAddOns] = useState<AddOn[]>(DEFAULT_ADDONS);

  // Step 3: Materials
  const [materials, setMaterials] = useState<MaterialLine[]>([]);

  // Toggle guided mode
  const toggleGuided = () => {
    const next = !guidedMode;
    setGuidedMode(next);
    localStorage.setItem("introGuided", String(next));
  };

  // Dictation
  const toggleDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: "Not supported", description: "Voice dictation isn't available in this browser.", duration: 3000 }); return; }
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); return; }
    const recognition = new SR();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-AU";
    recognition.onresult = (event: any) => {
      let finalT = ""; let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalT += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setInterimTranscript(interim.trim());
      if (finalT) { setWorkDescription(prev => (prev ? `${prev} ${finalT.trim()}` : finalT.trim())); setInterimTranscript(""); }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => { setIsListening(false); setInterimTranscript(""); };
    recognitionRef.current = recognition; recognition.start(); setIsListening(true);
  };

  const togglePhrase = (phrase: string) => {
    if (selectedPhrases.includes(phrase)) {
      setSelectedPhrases(p => p.filter(x => x !== phrase));
      setWorkDescription(prev => prev.replace(`\n• ${phrase}`, "").replace(`• ${phrase}\n`, "").replace(`• ${phrase}`, "").trim());
    } else {
      setSelectedPhrases(p => [...p, phrase]);
      setWorkDescription(prev => (prev ? `${prev}\n• ${phrase}` : `• ${phrase}`));
    }
  };

  // Labour helpers
  const addLabourLine = () => setLabourLines(prev => [...prev, { id: `lab-${Date.now()}`, hours: 1, rate: 95 }]);
  const removeLabourLine = (id: string) => setLabourLines(prev => prev.filter(l => l.id !== id));
  const updateLabour = (id: string, patch: Partial<LabourLine>) => setLabourLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  const toggleAddOn = (id: string) => setAddOns(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  const updateAddOnAmount = (id: string, amount: number) => setAddOns(prev => prev.map(a => a.id === id ? { ...a, amount } : a));

  // Material helpers
  const addMaterial = () => setMaterials(prev => [...prev, { id: `mat-${Date.now()}`, name: "", costPrice: 0, markup: 20, qty: 1 }]);
  const removeMaterial = (id: string) => setMaterials(prev => prev.filter(m => m.id !== id));
  const updateMaterial = (id: string, patch: Partial<MaterialLine>) => setMaterials(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  // Totals
  const labourTotal = labourLines.reduce((s, l) => s + l.hours * l.rate, 0);
  const addOnsTotal = addOns.filter(a => a.enabled).reduce((s, a) => s + a.amount, 0);
  const materialsTotal = materials.reduce((s, m) => s + m.costPrice * m.qty * (1 + m.markup / 100), 0);
  const subtotal = labourTotal + addOnsTotal + materialsTotal;
  const gst = subtotal * GST_RATE;
  const total = subtotal + gst;
  const labourStepTotal = labourTotal + addOnsTotal;

  const customerName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const step0Valid = firstName.trim().length > 0 && phone.trim().length > 0;
  const step1Valid = workDescription.trim().length > 0;

  const handleSendInvoice = () => {
    saveIntroInvoice({
      id: `inv-${Date.now()}`,
      customerName,
      phone,
      email,
      total,
      sentAt: new Date().toISOString(),
    });
    toast({ title: "Invoice Sent ✅", description: `$${total.toFixed(2)} invoice sent to ${customerName}.`, duration: 4000 });
    onReset();
  };

  const STEPS = [
    { label: "Customer", icon: User },
    { label: "Work Done", icon: FileText },
    { label: "Labour & Extras", icon: Clock },
    { label: "Materials", icon: Package },
    { label: "Invoice", icon: Receipt },
  ];

  const StepIcon = STEPS[step]?.icon || FileText;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        position === "bottom" || position === "top" ? "h-[calc(100dvh-104px)]" : "h-[calc(100dvh-48px)]"
      )}
    >
      {/* Header bar */}
      <div className="px-3 py-2 border-b border-border bg-background flex items-center gap-3 shrink-0">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : clearMode()}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2 truncate">
            <StepIcon className="w-5 h-5 text-primary shrink-0" />
            {STEPS[step]?.label}
          </h1>
        </div>
        <button
          onClick={toggleGuided}
          className={cn(
            "text-xs font-semibold px-2 py-1 rounded-full border transition-colors",
            guidedMode ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground border-border"
          )}
        >
          <HelpCircle className="w-3.5 h-3.5 inline mr-1" />
          Tutorial {guidedMode ? "ON" : "OFF"}
        </button>
        <StepDots current={step} />
      </div>

      {/* Scrollable content area */}
      <div className={cn("relative flex-1 px-3 sm:px-6 py-3 max-w-lg mx-auto w-full", step === 4 ? "overflow-hidden" : "overflow-y-auto")}>
        {/* Guided tip */}
        {STEP_TIPS[step] && <GuidedTip tips={STEP_TIPS[step]} guidedMode={guidedMode} />}

        {/* ===== STEP 0: CUSTOMER ===== */}
        {step === 0 && (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">First Name *</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" className="h-12 text-base" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Last Name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" className="h-12 text-base" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Phone className="w-4 h-4" /> Phone *</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="021 555 1234" type="tel" className="h-12 text-base" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Mail className="w-4 h-4" /> Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" type="email" className="h-12 text-base" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Address</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="42 Queen Street, Auckland" className="h-12 text-base" />
            </div>
          </div>
        )}

        {/* ===== STEP 1: WHAT WAS DONE ===== */}
        {step === 1 && (
          <div className="space-y-3 mt-2">
            <div className="flex flex-wrap gap-2">
              {QUICK_PHRASES.map(phrase => {
                const active = selectedPhrases.includes(phrase);
                return (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => togglePhrase(phrase)}
                    className={cn(
                      "text-sm px-3 py-2 rounded-xl border-2 transition-all font-medium",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-card-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {active && <Check className="w-4 h-4 inline mr-1" />}{phrase}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Notes</Label>
              <Button
                type="button"
                variant={isListening ? "default" : "outline"}
                size="sm"
                onClick={toggleDictation}
                className={cn("gap-1.5 h-9 text-sm", isListening && "animate-pulse")}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? "Stop" : "🎤 Dictate"}
              </Button>
            </div>

            {isListening && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary flex items-center gap-2">
                <span className="inline-flex gap-1 items-end h-4" aria-hidden>
                  {[0, 1, 2, 3].map(bar => (
                    <span key={bar} className="w-1 rounded-full bg-primary/80 animate-pulse" style={{ height: `${10 + (bar % 2) * 4}px`, animationDelay: `${bar * 120}ms` }} />
                  ))}
                </span>
                Listening… {interimTranscript && <span className="text-primary/70">"{interimTranscript}"</span>}
              </div>
            )}

            <Textarea
              className="bg-card border-2 border-border text-base min-h-[100px] max-h-[140px] resize-none"
              value={workDescription}
              onChange={e => setWorkDescription(e.target.value)}
              placeholder="Describe the work completed…"
            />
          </div>
        )}

        {/* ===== STEP 2: LABOUR + ADD-ONS ===== */}
        {step === 2 && (
          <div className="space-y-3 mt-2">
            {labourLines.map(line => (
              <div key={line.id} className="flex items-center gap-2 p-3 rounded-xl border-2 border-border bg-card">
                <Clock className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Hours</span>
                    <Input type="number" step="0.5" min="0" value={line.hours} onChange={e => updateLabour(line.id, { hours: parseFloat(e.target.value) || 0 })} className="h-11 text-lg font-bold" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">$ / hr</span>
                    <Input type="number" min="0" value={line.rate} onChange={e => updateLabour(line.id, { rate: parseFloat(e.target.value) || 0 })} className="h-11 text-lg font-bold" />
                  </div>
                </div>
                <div className="text-right min-w-[95px] self-end pb-1">
                  <span className="block text-xl font-extrabold leading-none text-foreground">${(line.hours * line.rate).toFixed(0)}</span>
                  <span className="block whitespace-pre-line text-[11px] leading-tight text-muted-foreground">{fmtGST(line.hours * line.rate)}</span>
                </div>
                {labourLines.length > 1 && (
                  <button onClick={() => removeLabourLine(line.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" className="gap-1.5 text-sm" onClick={addLabourLine}>
              <Plus className="w-4 h-4" /> Add Labour Line
            </Button>

            {/* Add-ons - clear tap to choose */}
            <div className="space-y-1.5">
              <Label className="text-sm font-bold flex items-center gap-1.5">
                <Settings2 className="w-4 h-4" /> Optional Extras — tap to add
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {addOns.map(addon => {
                  const Icon = addon.icon;
                  return (
                    <button
                      key={addon.id}
                      onClick={() => toggleAddOn(addon.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center",
                        addon.enabled
                          ? "border-primary bg-primary/15 shadow-sm"
                          : "border-dashed border-border bg-card hover:border-primary/40"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        addon.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {addon.enabled ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={cn("text-xs font-semibold", addon.enabled ? "text-primary" : "text-muted-foreground")}>
                        {addon.label}
                      </span>
                      <span className="text-sm font-bold text-foreground">${addon.amount}</span>
                      <span className="text-[10px] text-muted-foreground">+GST</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step running total */}
            <div className="bg-muted/50 rounded-xl p-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground">Labour</span>
                <span className="text-2xl font-extrabold text-foreground">${labourTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">GST</span>
                <span>${(labourTotal * GST_RATE).toFixed(0)}</span>
              </div>
              {addOnsTotal > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Extras</span>
                  <span>${addOnsTotal.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-border pt-1">
                <span className="text-sm font-semibold text-muted-foreground">This step total</span>
                <span className="text-xl font-extrabold text-foreground">${labourStepTotal.toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: MATERIALS ===== */}
        {step === 3 && (
          <div className="space-y-3 mt-2">
            {materials.map(mat => (
              <div key={mat.id} className="p-3 rounded-xl border-2 border-border bg-card space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={mat.name}
                    onChange={e => updateMaterial(mat.id, { name: e.target.value })}
                    placeholder="Material name"
                    className="flex-1 h-11 text-base"
                  />
                  <Input
                    type="number" min="1" value={mat.qty}
                    onChange={e => updateMaterial(mat.id, { qty: parseInt(e.target.value) || 1 })}
                    className="w-16 h-11 text-base text-center font-bold"
                    placeholder="Qty"
                  />
                  <button onClick={() => removeMaterial(mat.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Cost $</span>
                    <Input type="number" min="0" step="0.01" value={mat.costPrice} onChange={e => updateMaterial(mat.id, { costPrice: parseFloat(e.target.value) || 0 })} className="h-10 text-base font-bold" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Markup %</span>
                    <Input type="number" min="0" value={mat.markup} onChange={e => updateMaterial(mat.id, { markup: parseFloat(e.target.value) || 0 })} className="h-10 text-base font-bold" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Sell $</span>
                    <div className="h-10 flex items-center text-base font-bold text-foreground">
                      ${(mat.costPrice * mat.qty * (1 + mat.markup / 100)).toFixed(0)}
                      <span className="text-[10px] text-muted-foreground ml-1">+GST</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full gap-2 h-12 text-base" onClick={addMaterial}>
              <Plus className="w-5 h-5" /> Add Material
            </Button>

            {materials.length > 0 && (
              <div className="bg-muted/50 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground">Materials total</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">${materialsTotal.toFixed(0)}</span>
                  <span className="text-xs text-muted-foreground ml-1">+GST (${(materialsTotal * GST_RATE).toFixed(0)})</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 4: INVOICE SUMMARY ===== */}
        {step === 4 && (
          <div className="space-y-2 mt-1 text-sm">
            <div className="rounded-xl border border-border bg-card p-2.5 space-y-0.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-bold text-foreground">{customerName}</span>
              </div>
              {phone && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Phone</span><span>{phone}</span></div>}
              {email && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span>{email}</span></div>}
              {address && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Address</span><span className="truncate ml-4">{address}</span></div>}
            </div>

            {workDescription && (
              <div className="rounded-xl border border-border bg-card p-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Work Done</Label>
                <p className="text-xs text-foreground mt-1 whitespace-pre-line line-clamp-3">{workDescription}</p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-2.5 space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Invoice Lines</Label>
              {labourLines.map(l => (
                <div key={l.id} className="flex justify-between text-sm">
                  <span className="truncate pr-2">Labour {l.hours}h @ ${l.rate}</span>
                  <span className="font-bold">${(l.hours * l.rate).toFixed(0)}</span>
                </div>
              ))}
              {addOns.filter(a => a.enabled).map(a => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span className="truncate pr-2">{a.label}</span>
                  <span className="font-bold">${a.amount.toFixed(0)}</span>
                </div>
              ))}
              {materials.filter(m => m.name.trim()).map(m => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className="truncate pr-2">{m.name} × {m.qty}</span>
                  <span className="font-bold">${(m.costPrice * m.qty * (1 + m.markup / 100)).toFixed(0)}</span>
                </div>
              ))}

              <div className="border-t border-border pt-1.5 space-y-0.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (ex GST)</span>
                  <span className="font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST (15%)</span>
                  <span>${gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-1 border-t border-border">
                  <span>TOTAL</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom button */}
      <div className="shrink-0 px-3 sm:px-6 py-3 border-t border-border bg-background max-w-lg mx-auto w-full">
        {step === 0 && (
          <Button className="w-full h-14 text-lg gap-2 font-bold" disabled={!step0Valid} onClick={() => setStep(1)}>
            Next — What was done? <ArrowRight className="w-5 h-5" />
          </Button>
        )}
        {step === 1 && (
          <Button className="w-full h-14 text-lg gap-2 font-bold" disabled={!step1Valid} onClick={() => setStep(2)}>
            Next — Labour & Extras <ArrowRight className="w-5 h-5" />
          </Button>
        )}
        {step === 2 && (
          <Button className="w-full h-14 text-lg gap-2 font-bold" onClick={() => setStep(3)}>
            Next — Materials <ArrowRight className="w-5 h-5" />
          </Button>
        )}
        {step === 3 && (
          <Button className="w-full h-14 text-lg gap-2 font-bold" onClick={() => setStep(4)}>
            Review Invoice <ArrowRight className="w-5 h-5" />
          </Button>
        )}
        {step === 4 && (
          <Button className="w-full h-14 text-lg gap-2 font-bold" onClick={handleSendInvoice}>
            <Send className="w-5 h-5" /> Send Invoice — ${total.toFixed(2)}
          </Button>
        )}
      </div>
    </div>
  );
}
