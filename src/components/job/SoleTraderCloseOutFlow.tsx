import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, ChevronLeft, ChevronRight, Camera, Clock, Package, FileText, Shield,
  Truck, ShoppingCart, ClipboardList, Mic, MicOff, Maximize2, Minimize2,
  DollarSign, Receipt, Send, CheckCircle2, Plus, Trash2, Eye, EyeOff,
  AlertTriangle, Mail, MessageSquare, CalendarDays, FileCheck, Sparkles, Loader2,
} from "lucide-react";
import { ServiceReminderSection } from "@/components/job/ServiceReminderSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobDetail, MaterialItem } from "@/data/dummyJobDetails";
import { checklistTemplates, type CompletedChecklist } from "@/data/dummyChecklists";
import { toast } from "@/hooks/use-toast";
import { useDemoData } from "@/contexts/DemoDataContext";
import { stageForPipelineEvent } from "@/services/pipelineTransitions";
import { useAppMode } from "@/contexts/AppModeContext";
import { SequenceSelector } from "@/components/quote/SequenceSelector";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobDetail;
  resumeAfterBooking?: boolean;
  introMode?: boolean;
  onChecklistComplete?: (checklist: import("@/data/dummyChecklists").CompletedChecklist) => void;
}

interface PartUsed extends MaterialItem {
  used: boolean;
  source: "van-stock" | "supplier";
  supplierName?: string;
  receiptPhoto?: string;
}

interface CapturedPhoto {
  id: string;
  type: "before" | "after";
  dataUrl: string;
}

function ChecklistStepInline({ category, onComplete }: { category: "arrival" | "completion"; onComplete: (cl: CompletedChecklist) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<string[]>([]);
  const filtered = checklistTemplates.filter((t) => t.category === category || t.category === "both");
  const selected = selectedId ? checklistTemplates.find((t) => t.id === selectedId) : null;
  const mandatoryDone = selected ? selected.items.filter((i) => i.mandatory).every((i) => checked[i.id]) : false;

  function handleComplete() {
    if (!selected) return;
    const cl: CompletedChecklist = {
      templateId: selected.id, templateName: selected.name, category: selected.category,
      completedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      items: selected.items.map((i) => ({ label: i.label, checked: !!checked[i.id] })),
    };
    onComplete(cl);
    setCompleted((prev) => [...prev, selected.id]);
    setSelectedId(null);
    setChecked({});
  }

  if (selected) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedId(null); setChecked({}); }} className="gap-1 -ml-2 text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <div className="space-y-1.5">
          {selected.items.map((item) => {
            const isChecked = !!checked[item.id];
            return (
              <button key={item.id} onClick={() => setChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                className={cn("w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                  isChecked ? "border-[hsl(var(--status-green))] bg-[hsl(var(--status-green)/0.1)]" : "border-border bg-card hover:bg-accent/50")}>
                <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                  isChecked ? "bg-[hsl(var(--status-green))] border-[hsl(var(--status-green))] text-white" : "border-muted-foreground/40")}>
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                </div>
                <span className="text-sm font-medium text-card-foreground">{item.label}</span>
                {item.mandatory && !isChecked && <span className="text-[10px] text-[hsl(var(--status-orange))] font-semibold ml-auto">Required</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">{Object.values(checked).filter(Boolean).length}/{selected.items.length}</span>
          <Button onClick={handleComplete} disabled={!mandatoryDone} className="gap-1.5"><Check className="w-4 h-4" /> Complete</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Select a checklist to complete (optional).</p>
      {filtered.map((t) => (
        <button key={t.id} onClick={() => setSelectedId(t.id)} disabled={completed.includes(t.id)}
          className={cn("w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left",
            completed.includes(t.id) ? "bg-[hsl(var(--status-green)/0.1)] border border-[hsl(var(--status-green)/0.3)]" : "bg-secondary/50 hover:bg-accent/50")}>
          <div>
            <div className="text-sm font-medium text-card-foreground">{t.name}</div>
            <div className="text-xs text-muted-foreground">{completed.includes(t.id) ? "✓ Completed" : `${t.items.length} items`}</div>
          </div>
          {!completed.includes(t.id) && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
      ))}
    </div>
  );
}

interface InvoiceLine {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  visible: boolean;
}

const ALL_STEPS = [
  { id: "status", label: "Job Status", icon: CheckCircle2 },
  { id: "checklist", label: "Checklist", icon: ClipboardList },
  { id: "time", label: "Labour", icon: Clock },
  { id: "materials", label: "Materials Used", icon: Package },
  { id: "paperwork", label: "Paperwork", icon: FileCheck },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "certificates", label: "Certificates", icon: Shield },
  { id: "invoice", label: "Invoice", icon: Receipt },
  { id: "done", label: "Done", icon: CheckCircle2 },
];

function buildInvoiceLines(job: JobDetail, parts: PartUsed[], actualHours: number): InvoiceLine[] {
  const lines: InvoiceLine[] = [];
  // Labour first
  lines.push({ id: "inv-labour", description: "Labour", qty: actualHours, unitPrice: 85, visible: true });
  // Then materials
  parts.filter(p => p.used).forEach((p, i) => {
    lines.push({ id: `inv-mat-${i}`, description: p.name, qty: p.quantity, unitPrice: p.unitPrice, visible: true });
  });
  return lines;
}

export function SoleTraderCloseOutFlow({ open, onOpenChange, job, resumeAfterBooking, introMode = false, onChecklistComplete }: Props) {
  const navigate = useNavigate();
  const { updateJobStage } = useDemoData();
  const { soleTraderPrefs } = useAppMode();
  const [step, setStep] = useState(resumeAfterBooking ? 1 : 0);

  const initialJobSheet = useMemo(() => {
    const existingDescription = job.description?.trim();
    return existingDescription
      ? `Job: ${job.jobName}\n${existingDescription}`
      : `Job: ${job.jobName}\n`;
  }, [job.description, job.jobName]);

  // Status step state
  const [jobFinished, setJobFinished] = useState(true);
  const [invoiceNow, setInvoiceNow] = useState(true);
  const [returnNote, setReturnNote] = useState("");

  // Job notes state
  const [jobSheet, setJobSheet] = useState(initialJobSheet);
  const [jobSheetExpanded, setJobSheetExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const jobSheetRef = useRef<HTMLTextAreaElement>(null);
  const autoResize = useCallback(() => {
    const el = jobSheetRef.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  }, []);
  useEffect(() => { autoResize(); }, [jobSheet, jobSheetExpanded, autoResize]);
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  // Time state
  const budgetedHours = job.timeEntries.reduce((s, t) => s + t.hours, 0);
  const [actualHours, setActualHours] = useState(budgetedHours.toString());

  // Materials state
  const [parts, setParts] = useState<PartUsed[]>(() => job.materials.map((m) => ({ ...m, used: true, source: introMode ? "supplier" as const : "van-stock" as const })));
  const [extraPartName, setExtraPartName] = useState("");
  const [extraPartQty, setExtraPartQty] = useState("1");
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptTargetIdx, setReceiptTargetIdx] = useState<number | null>(null);

  // Photos state
  const [jobPhotos, setJobPhotos] = useState<CapturedPhoto[]>([]);
  const [activePhotoType, setActivePhotoType] = useState<"before" | "after" | null>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const galleryPhotoInputRef = useRef<HTMLInputElement>(null);

  // Certificates state
  const [complianceRequired, setComplianceRequired] = useState(false);
  const [cocNumber, setCocNumber] = useState("");

  // Invoice state
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [invoiceNote, setInvoiceNote] = useState("");
  const [sequenceId, setSequenceId] = useState<string | null>(null);

  // Send state
  const [sendMethod, setSendMethod] = useState<"email" | "sms" | "both">("email");

  // Paperwork state
  const [paperworkFiles, setPaperworkFiles] = useState<{ id: string; name: string }[]>([]);
  const paperworkInputRef = useRef<HTMLInputElement>(null);

  const vanStockUsed = parts.filter((p) => p.used && p.source === "van-stock");

  // Build active steps based on prefs and status
  const activeSteps = useMemo(() => {
    return ALL_STEPS.filter((s) => {
      if (introMode) {
        return ["status", "time", "materials", "photos", "invoice"].includes(s.id);
      }
      // If coming back and NOT invoicing now, only show status + done
      if (!jobFinished && !invoiceNow) {
        return s.id === "status" || s.id === "done";
      }
      if (["jobsheet", "send", "done"].includes(s.id)) return false;
      // Paperwork only if reconcileDocs pref is on
      if (s.id === "paperwork" && !soleTraderPrefs.reconcileDocs) return false;
      return true;
    });
  }, [introMode, jobFinished, invoiceNow, soleTraderPrefs.reconcileDocs]);

  const currentStep = activeSteps[step];
  const canNext = step < activeSteps.length - 1;
  const canPrev = step > 0;

  const invoiceSubtotal = invoiceLines.filter((l) => l.visible).reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const gst = invoiceSubtotal * 0.15;
  const invoiceTotal = invoiceSubtotal + gst;

  const toggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast({ title: "Not supported", description: "Voice dictation isn't available in this browser.", duration: 3000 }); return; }
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-AU";
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setInterimTranscript(interim.trim());
      if (finalTranscript) {
        setJobSheet((prev) => (prev ? `${prev} ${finalTranscript.trim()}` : finalTranscript.trim()));
        setInterimTranscript("");
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => { setIsListening(false); setInterimTranscript(""); };
    recognitionRef.current = recognition; recognition.start(); setIsListening(true);
  };

  const isAiCleanupMode = jobSheet.trim().length > 0;

  const handleAiJobSheetAssist = () => {
    toast({ title: "Coming soon", description: "AI suggestions will be available once the backend is connected." });
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activePhotoType) return;
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        setJobPhotos((prev) => [...prev, { id: `${activePhotoType}-${Date.now()}-${index}`, type: activePhotoType, dataUrl: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleReceiptCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || receiptTargetIdx === null) return;
    const reader = new FileReader();
    reader.onload = () => { setParts(prev => prev.map((pp, ii) => ii === receiptTargetIdx ? { ...pp, receiptPhoto: reader.result as string } : pp)); };
    reader.readAsDataURL(file); e.target.value = ""; setReceiptTargetIdx(null);
  };

  const handlePaperworkAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPaperworkFiles(prev => [...prev, { id: `pw-${Date.now()}`, name: file.name }]);
    e.target.value = "";
  };

  function handleAddExtra() {
    if (!extraPartName.trim()) return;
    setParts((prev) => [...prev, { id: `extra-${Date.now()}`, name: extraPartName.trim(), quantity: Number(extraPartQty) || 1, unit: "pcs", unitPrice: 0, supplier: "", used: true, source: "supplier" as const }]);
    setExtraPartName(""); setExtraPartQty("1");
  }

  function updateInvoiceLine(id: string, patch: Partial<InvoiceLine>) { setInvoiceLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))); }
  function addInvoiceLine() { setInvoiceLines((prev) => [...prev, { id: `inv-new-${Date.now()}`, description: "New item", qty: 1, unitPrice: 0, visible: true }]); }
  function removeInvoiceLine(id: string) { setInvoiceLines((prev) => prev.filter((l) => l.id !== id)); }

  function goToStep(next: number) {
    // Build invoice lines when entering invoice step
    if (activeSteps[next]?.id === "invoice") {
      setInvoiceLines(buildInvoiceLines(job, parts, Number(actualHours) || 0));
    }
    setStep(next);
  }

  function handleOpenSchedule() {
    onOpenChange(false);
    const params = new URLSearchParams({
      returnJob: job.id,
      returnJobName: job.jobName,
      returnClient: job.client,
      returnAddress: job.address,
    });
    navigate(`/schedule?${params.toString()}`);
  }

  function handleBookLater() {
    toast({ title: "Return visit noted ✅", description: "Continuing to job notes…", duration: 3000 });
    setJobFinished(true);
    goToStep(1);
  }

  function handleComplete() {
    toast({ title: "Invoice Sent ✅", description: `$${invoiceTotal.toFixed(2)} invoice sent to ${job.client}. Job closed out.`, duration: 4000 });
    updateJobStage(job.id, stageForPipelineEvent("invoice_sent"));
    onOpenChange(false);
    navigate("/");
  }

  const StepIcon = currentStep?.icon || FileText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StepIcon className="w-5 h-5 text-primary" />
            {currentStep?.label}
          </DialogTitle>
          <DialogDescription className="sr-only">Close out flow for {job.jobName}</DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {activeSteps.map((s, i) => (
            <button key={s.id} onClick={() => i <= step && goToStep(i)} className={cn("w-2 h-2 rounded-full transition-colors", i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-muted-foreground/20")} />
          ))}
        </div>

        <div className="space-y-4 min-h-[200px]">

          {/* ===== STATUS ===== */}
          {currentStep?.id === "status" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Is this job finished?</Label>
                <div className="flex gap-2">
                  <button onClick={() => setJobFinished(true)} className={cn("flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all", jobFinished ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent")}>
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1" /> Job Finished
                  </button>
                  {!introMode && (
                    <button onClick={() => setJobFinished(false)} className={cn("flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all", !jobFinished ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent")}>
                      <CalendarDays className="w-5 h-5 mx-auto mb-1" /> Coming Back
                    </button>
                  )}
                </div>
              </div>

              {!jobFinished && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Invoice now for work so far?</Label>
                    <Switch checked={invoiceNow} onCheckedChange={setInvoiceNow} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Return visit notes</Label>
                    <Textarea className="bg-white dark:bg-[hsl(30,12%,24%)] border-2 border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-400" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} placeholder="e.g. Waiting on parts, need to finish wiring..." rows={2} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button className="flex-1 h-10 gap-2" onClick={handleOpenSchedule}>
                      <CalendarDays className="w-4 h-4" /> Open Schedule
                    </Button>
                    <Button variant="outline" className="flex-1 h-10 gap-2" onClick={handleBookLater}>
                      <Clock className="w-4 h-4" /> Book Later
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== JOB NOTES ===== */}
          {currentStep?.id === "jobsheet" && (
            <div className="space-y-3">
              <Label>Quick phrases</Label>
              <div className="flex flex-wrap gap-1.5">
                {["Arrived on site", "Spoke with customer", "Diagnosed fault", "Tested and commissioned", "Cleaned up site", "Left materials on site", "Isolated power/water", "Work completed as quoted"].map((phrase) => {
                  const active = selectedPhrases.includes(phrase);
                  return (
                    <button key={phrase} type="button" onClick={() => {
                      if (active) { setSelectedPhrases((p) => p.filter((x) => x !== phrase)); setJobSheet((prev) => prev.replace(`\n• ${phrase}`, "").replace(`• ${phrase}\n`, "").replace(`• ${phrase}`, "").trim()); }
                      else { setSelectedPhrases((p) => [...p, phrase]); setJobSheet((prev) => (prev ? `${prev}\n• ${phrase}` : `• ${phrase}`)); }
                    }} className={cn("text-xs px-2.5 py-1.5 rounded-full border transition-colors font-medium", active ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/50 text-muted-foreground border-border hover:bg-accent")}>
                      {active && <Check className="w-3 h-3 inline mr-1" />}{phrase}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <Label>{introMode ? "Work done" : "What was done on this job?"}</Label>
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8" disabled={aiLoading} onClick={handleAiJobSheetAssist}>
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {isAiCleanupMode ? "AI Cleanup" : "AI Suggest"}
                  </Button>
                  <Button type="button" variant={isListening ? "default" : "outline"} size="sm" onClick={toggleDictation} className={cn("gap-1.5 h-8", isListening && "animate-pulse")}>
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}{isListening ? "Stop" : "Dictate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={!jobSheet.trim()}
                    onClick={() => {
                      setJobSheet("");
                      setSelectedPhrases([]);
                      setInterimTranscript("");
                    }}
                  >
                    Clear text
                  </Button>
                </div>
              </div>
              {isListening && (
                <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="inline-flex gap-1 items-end h-3" aria-hidden>
                      {[0, 1, 2, 3].map((bar) => (
                        <span
                          key={bar}
                          className="w-1 rounded-full bg-primary/80 animate-pulse"
                          style={{ height: `${8 + (bar % 2) * 4}px`, animationDelay: `${bar * 120}ms` }}
                        />
                      ))}
                    </span>
                    Listening… speak now
                  </div>
                  {interimTranscript && <p className="text-primary/80">Heard: “{interimTranscript}”</p>}
                </div>
              )}
              <Textarea ref={jobSheetRef} className={cn("bg-white dark:bg-[hsl(30,12%,24%)] border-2 border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-400 min-h-[120px] resize-none transition-all", jobSheetExpanded ? "overflow-hidden" : "max-h-[50vh] overflow-y-auto")} value={jobSheet} onChange={(e) => setJobSheet(e.target.value)} placeholder="Describe the work completed..." />
              {jobSheet && jobSheet.length > 100 && (
                <Button type="button" variant="ghost" size="sm" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => setJobSheetExpanded(!jobSheetExpanded)}>
                  {jobSheetExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}{jobSheetExpanded ? "Collapse" : "Expand"}
                </Button>
              )}
            </div>
          )}

          {/* ===== LABOUR ===== */}
          {currentStep?.id === "time" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Budgeted</span><span className="font-semibold">{budgetedHours} hrs</span></div>
              <div className="space-y-1.5"><Label>Actual hours</Label><Input className="bg-white dark:bg-[hsl(30,12%,24%)] border-2 border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-400" type="number" step="0.5" value={actualHours} onChange={(e) => setActualHours(e.target.value)} /></div>
              {Number(actualHours) > budgetedHours && <p className="text-xs text-[hsl(var(--status-orange))]">⚠ {(Number(actualHours) - budgetedHours).toFixed(1)} hrs over budget</p>}
            </div>
          )}

          {/* ===== MATERIALS USED ===== */}
          {currentStep?.id === "materials" && (
            <div className="space-y-3">
              {soleTraderPrefs.vanStock && !introMode ? (
                <p className="text-sm text-muted-foreground">Mark items as <strong>Van Stock</strong> or <strong>Supplier</strong>.</p>
              ) : (
                <p className="text-sm text-muted-foreground">List the parts and materials used on this job.</p>
              )}
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {parts.map((p, i) => (
                  <div key={p.id} className={cn("p-2.5 rounded-lg border transition-colors space-y-2", p.used ? "bg-accent/20 border-border" : "bg-muted/20 border-transparent opacity-50")}>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={p.used} onCheckedChange={(checked) => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, used: !!checked } : pp))} />
                      <span className={cn("text-sm flex-1 font-medium", !p.used && "line-through text-muted-foreground")}>{p.name}</span>
                      <Input type="number" className="w-16 h-7 text-xs text-right" value={p.quantity} disabled={!p.used} onChange={(e) => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, quantity: Number(e.target.value) || 0 } : pp))} />
                      <span className="text-xs text-muted-foreground w-8">{p.unit}</span>
                    </div>
                    {p.used && soleTraderPrefs.vanStock && !introMode && (
                      <div className="flex items-center gap-1.5 pl-6 flex-wrap">
                        <button type="button" onClick={() => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, source: "van-stock" } : pp))} className={cn("flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors", p.source === "van-stock" ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-muted text-muted-foreground hover:bg-accent")}>
                          <Truck className="w-3 h-3" /> Van Stock
                        </button>
                        <button type="button" onClick={() => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, source: "supplier" } : pp))} className={cn("flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors", p.source === "supplier" ? "bg-[hsl(var(--status-orange)/0.15)] text-[hsl(var(--status-orange))] ring-1 ring-[hsl(var(--status-orange)/0.3)]" : "bg-muted text-muted-foreground hover:bg-accent")}>
                          <ShoppingCart className="w-3 h-3" /> Supplier
                        </button>
                        {p.source === "supplier" && (
                          <button type="button" onClick={() => { setReceiptTargetIdx(i); receiptInputRef.current?.click(); }} className={cn("flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border-2 border-dashed transition-all", p.receiptPhoto ? "border-primary/40 bg-primary/10 text-primary" : "border-muted-foreground/30 text-muted-foreground hover:border-primary/30 hover:bg-accent")}>
                            <Camera className="w-3.5 h-3.5" />{p.receiptPhoto ? "Receipt Added ✓" : "Attach Receipt"}
                          </button>
                        )}
                      </div>
                    )}
                    {p.used && soleTraderPrefs.vanStock && !introMode && p.source === "supplier" && (
                      <Input className="h-7 text-xs ml-6 w-auto bg-white dark:bg-[hsl(30,12%,24%)] border-2 border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-400" placeholder="Supplier name..." value={p.supplierName || ""} onChange={(e) => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, supplierName: e.target.value } : pp))} />
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 pt-1 border-t border-border">
                <Label className="text-xs">Add extra item</Label>
                <div className="flex gap-2">
                  <Input placeholder="Item name..." value={extraPartName} onChange={(e) => setExtraPartName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExtra(); } }} className="flex-1" />
                  <Input type="number" placeholder="Qty" value={extraPartQty} onChange={(e) => setExtraPartQty(e.target.value)} className="w-16" />
                  <Button type="button" size="sm" onClick={handleAddExtra} disabled={!extraPartName.trim()}>Add</Button>
                </div>
              </div>

              {/* Inline Restock PO if vanStock is on and items used from van */}
              {soleTraderPrefs.vanStock && !introMode && vanStockUsed.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3 mt-2">
                  <div className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /><p className="text-sm font-bold text-foreground">Restock PO</p></div>
                  <div className="border-t border-border pt-2 space-y-1">
                    <div className="grid grid-cols-[1fr_60px_50px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase pb-1"><span>Item</span><span className="text-right">Qty</span><span className="text-right">Unit</span></div>
                    {vanStockUsed.map((p) => (<div key={p.id} className="grid grid-cols-[1fr_60px_50px] gap-2 text-sm items-center"><span className="font-medium truncate">{p.name}</span><span className="text-right font-mono text-xs">{p.quantity}</span><span className="text-right text-xs text-muted-foreground">{p.unit}</span></div>))}
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">{vanStockUsed.length} items to restock</span><Badge variant="secondary" className="text-xs">Auto-generated</Badge></div>
                </div>
              )}
            </div>
          )}

          {/* ===== PAPERWORK ===== */}
          {currentStep?.id === "paperwork" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Attach supplier receipts or invoices for this job.</p>
              <div className="space-y-2">
                {paperworkFiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-accent/20">
                    <FileCheck className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm flex-1 truncate">{f.name}</span>
                    <button onClick={() => setPaperworkFiles(prev => prev.filter(x => x.id !== f.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => paperworkInputRef.current?.click()}>
                <Plus className="w-4 h-4" /> Attach Document
              </Button>
            </div>
          )}

          {/* ===== PHOTOS ===== */}
          {currentStep?.id === "photos" && (
            <div className="space-y-3">
              <Label>Job photos</Label>
              <div className="grid grid-cols-2 gap-2">
                <Card className="border-dashed cursor-pointer" onClick={() => setActivePhotoType("before")}><CardContent className="p-6 flex flex-col items-center justify-center text-center"><Camera className="w-8 h-8 text-muted-foreground mb-2" /><p className="text-xs text-muted-foreground">Before photos</p><p className="text-xs font-medium text-primary mt-1">Tap to add</p></CardContent></Card>
                <Card className="border-dashed cursor-pointer" onClick={() => setActivePhotoType("after")}><CardContent className="p-6 flex flex-col items-center justify-center text-center"><Camera className="w-8 h-8 text-muted-foreground mb-2" /><p className="text-xs text-muted-foreground">After photos</p><p className="text-xs font-medium text-primary mt-1">Tap to add</p></CardContent></Card>
              </div>
              {activePhotoType && (
                <div className="rounded-lg border border-border p-3 bg-accent/20 space-y-2">
                  <p className="text-xs text-muted-foreground">Adding <span className="font-semibold text-card-foreground">{activePhotoType}</span> photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => cameraPhotoInputRef.current?.click()}>Take Pic</Button>
                    <Button size="sm" variant="outline" onClick={() => galleryPhotoInputRef.current?.click()}>Gallery</Button>
                    <Button size="sm" onClick={() => setActivePhotoType(null)}>Finished</Button>
                  </div>
                </div>
              )}
              {jobPhotos.length > 0 && (<div className="space-y-2"><p className="text-xs text-muted-foreground">{jobPhotos.length} photo(s) added</p><div className="flex gap-2 flex-wrap">{jobPhotos.map((photo) => (<div key={photo.id} className="relative"><img src={photo.dataUrl} alt={photo.type} className="w-16 h-16 rounded-lg object-cover border border-border" /><span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1 rounded-full uppercase">{photo.type[0]}</span></div>))}</div></div>)}
            </div>
          )}

          {/* ===== CHECKLIST ===== */}
          {currentStep?.id === "checklist" && (
            <ChecklistStepInline category="completion" onComplete={(cl) => onChecklistComplete?.(cl)} />
          )}

          {/* ===== CERTIFICATES ===== */}
          {currentStep?.id === "certificates" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label>Compliance certificates required?</Label><Switch checked={complianceRequired} onCheckedChange={setComplianceRequired} /></div>
              {complianceRequired && (<div className="space-y-2"><Label>COC / Certificate Number</Label><Input className="bg-white dark:bg-[hsl(30,12%,24%)] border-2 border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-400" value={cocNumber} onChange={(e) => setCocNumber(e.target.value)} placeholder="e.g. COC-2025-001" /><div className="space-y-1"><div className="flex items-center gap-2"><Checkbox /> <span className="text-sm">Testing completed</span></div><div className="flex items-center gap-2"><Checkbox /> <span className="text-sm">Certificate issued</span></div></div></div>)}
            </div>
          )}

          {/* ===== INVOICE SUMMARY ===== */}
          {currentStep?.id === "invoice" && (
            <div className="space-y-3">
              <Card><CardContent className="pt-4 space-y-1"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Client</span><span className="font-semibold text-card-foreground">{job.client}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Job</span><span className="font-medium text-card-foreground">{job.jobName}</span></div></CardContent></Card>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider px-1"><span className="w-5" /><span className="flex-1">Description</span><span className="w-12 text-center">Qty</span><span className="w-16 text-center">Price</span><span className="w-14 text-right">Total</span><span className="w-6" /></div>
                {invoiceLines.map((line) => (
                  <div key={line.id} className={cn("flex items-center gap-2 py-1 border-b border-border/30", !line.visible && "opacity-40")}>
                    <button onClick={() => updateInvoiceLine(line.id, { visible: !line.visible })} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground">{line.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                    <Input value={line.description} onChange={(e) => updateInvoiceLine(line.id, { description: e.target.value })} className="flex-1 h-7 text-xs" />
                    <Input type="number" value={line.qty} onChange={(e) => updateInvoiceLine(line.id, { qty: parseFloat(e.target.value) || 0 })} className="w-12 h-7 text-xs text-center" />
                    <Input type="number" value={Math.round(line.unitPrice * 100) / 100} onChange={(e) => updateInvoiceLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })} className="w-16 h-7 text-xs text-center" />
                    <span className="w-14 text-right text-xs font-semibold text-card-foreground">${(line.qty * line.unitPrice).toFixed(0)}</span>
                    <button onClick={() => removeInvoiceLine(line.id)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="gap-1 text-xs mt-1" onClick={addInvoiceLine}><Plus className="w-3.5 h-3.5" /> Add Line Item</Button>
              </div>

              {/* Sequence selector */}
              <SequenceSelector category="invoices" selectedId={sequenceId} onSelect={setSequenceId} />

              <Card><CardContent className="pt-3 pb-3 space-y-1"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold text-card-foreground">${invoiceSubtotal.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">GST (15%)</span><span className="text-card-foreground">${gst.toFixed(2)}</span></div><div className="flex justify-between text-base font-bold pt-1 border-t border-border"><span>Total</span><span>${invoiceTotal.toFixed(2)}</span></div></CardContent></Card>
              <div className="space-y-1.5"><Label>Invoice note (optional)</Label><Textarea value={invoiceNote} onChange={(e) => setInvoiceNote(e.target.value)} placeholder="e.g. Payment due within 14 days..." rows={2} className="text-sm" /></div>

              <Card><CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">To</span><span className="font-semibold text-card-foreground">{job.client}</span></div>
                {job.clientEmail && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span className="text-card-foreground">{job.clientEmail}</span></div>}
                {job.clientPhone && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Phone</span><span className="text-card-foreground">{job.clientPhone}</span></div>}
                <div className="flex justify-between text-sm font-bold"><span>Invoice Total</span><span>${invoiceTotal.toFixed(2)}</span></div>
              </CardContent></Card>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Delivery Method</Label>
                <div className="flex gap-2">
                  {([{ id: "email" as const, label: "Email", icon: Mail }, { id: "sms" as const, label: "SMS", icon: MessageSquare }, { id: "both" as const, label: "Both", icon: Send }]).map((m) => (
                    <button key={m.id} onClick={() => setSendMethod(m.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 text-sm font-medium transition-all", sendMethod === m.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent")}>
                      <m.icon className="w-4 h-4" />{m.label}
                    </button>
                  ))}
                </div>
              </div>

              {!introMode && <ServiceReminderSection customerName={job.client} jobName={job.jobName} />}

              <Button size="lg" className="w-full h-12 gap-2" onClick={handleComplete}><Send className="w-5 h-5" /> Send Invoice & Close Out</Button>
            </div>
          )}

          {/* ===== DONE ===== */}
          {currentStep?.id === "done" && (
            <div className="space-y-4 text-center py-4">
              {!jobFinished && !invoiceNow ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto"><CalendarDays className="w-8 h-8 text-primary" /></div>
                  <div><h3 className="text-lg font-bold text-card-foreground">Return Visit Saved</h3><p className="text-sm text-muted-foreground mt-1">Schedule when ready</p>{returnNote && <p className="text-xs text-muted-foreground mt-1">"{returnNote}"</p>}</div>
                  <Button size="lg" className="w-full h-12 gap-2" onClick={handleBookLater}><CheckCircle2 className="w-5 h-5" /> Save & Close</Button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--status-green)/0.15)] flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8 text-[hsl(var(--status-green))]" /></div>
                  <div><h3 className="text-lg font-bold text-card-foreground">Invoice Ready to Send</h3><p className="text-sm text-muted-foreground mt-1">${invoiceTotal.toFixed(2)} to {job.client} via {sendMethod === "both" ? "email & SMS" : sendMethod}</p></div>
                  <Card><CardContent className="pt-3 pb-3"><div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground text-xs">Invoice Total</span><div className="font-semibold">${invoiceTotal.toFixed(2)}</div></div>
                    <div><span className="text-muted-foreground text-xs">Delivery</span><div className="font-semibold capitalize">{sendMethod === "both" ? "Email + SMS" : sendMethod}</div></div>
                    {!jobFinished && <div className="col-span-2"><span className="text-muted-foreground text-xs">Status</span><div className="font-semibold text-primary">Partial Invoice — Coming Back</div></div>}
                  </div></CardContent></Card>
                  <Button size="lg" className="w-full h-12 gap-2" onClick={handleComplete}><Send className="w-5 h-5" /> Send Invoice & Close Out</Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        {currentStep?.id !== "done" && currentStep?.id !== "invoice" && !(currentStep?.id === "status" && !jobFinished && !invoiceNow) && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => goToStep(step - 1)} disabled={!canPrev} className="gap-1"><ChevronLeft className="w-4 h-4" /> Back</Button>
            <span className="text-xs text-muted-foreground">{step + 1} of {activeSteps.length}</span>
            <Button size="sm" onClick={() => goToStep(step + 1)} disabled={!canNext} className="gap-1">Next <ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}

        {/* Hidden inputs */}
        <input ref={cameraPhotoInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoCapture} />
        <input ref={galleryPhotoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoCapture} />
        <input ref={receiptInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptCapture} />
        <input ref={paperworkInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handlePaperworkAttach} />
      </DialogContent>
    </Dialog>
  );
}
