import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Camera, Clock, Package, FileText, Shield, RotateCcw, FileImage, Truck, ShoppingCart, ClipboardList, Mic, MicOff, Maximize2, Minimize2, CheckCircle2, CalendarDays, Sparkles, Loader2 } from "lucide-react";
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


interface JobCompletionFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobDetail;
  /** When true, skip the status step and start at Job Sheet with jobFinished=true */
  resumeAfterBooking?: boolean;
  onChecklistComplete?: (checklist: import("@/data/dummyChecklists").CompletedChecklist) => void;
}

const STEPS = [
  { id: "status", label: "Job Status", icon: CheckCircle2 },
  { id: "checklist", label: "Checklist", icon: ClipboardList },
  { id: "jobsheet", label: "Job Sheet", icon: FileText },
  { id: "time", label: "Time", icon: Clock },
  { id: "parts", label: "Parts Used", icon: Package },
  { id: "po-review", label: "Restock PO", icon: ClipboardList },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "compliance", label: "Compliance", icon: Shield },
];

interface PartUsed extends MaterialItem {
  used: boolean;
  source: "van-stock" | "supplier";
  supplierName?: string;
  receiptPhoto?: string; // data URL of captured photo
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

export function JobCompletionFlow({ open, onOpenChange, job, resumeAfterBooking, onChecklistComplete }: JobCompletionFlowProps) {
  const navigate = useNavigate();
  const { updateJobStage } = useDemoData();
  const [step, setStep] = useState(resumeAfterBooking ? 1 : 0);
  const [jobFinished, setJobFinished] = useState(true);

  const initialJobSheet = useMemo(() => {
    const existingDescription = job.description?.trim();
    return existingDescription
      ? `Job: ${job.jobName}\n${existingDescription}`
      : `Job: ${job.jobName}\n`;
  }, [job.description, job.jobName]);

  const [returnNeeded, setReturnNeeded] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [jobSheet, setJobSheet] = useState(initialJobSheet);
  const [jobSheetExpanded, setJobSheetExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const jobSheetRef = useRef<HTMLTextAreaElement>(null);
  const autoResizeJobSheet = useCallback(() => {
    const el = jobSheetRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, []);

  // Auto-resize whenever jobSheet content changes (quick phrases, dictation, typing)
  useEffect(() => {
    autoResizeJobSheet();
  }, [jobSheet, jobSheetExpanded, autoResizeJobSheet]);
  const budgetedHours = job.timeEntries.reduce((s, t) => s + t.hours, 0);
  const [actualHours, setActualHours] = useState(budgetedHours.toString());
  const [parts, setParts] = useState<PartUsed[]>(() =>
    job.materials.map((m) => ({ ...m, used: true, source: "van-stock" as const }))
  );
  const [extraPartName, setExtraPartName] = useState("");
  const [extraPartQty, setExtraPartQty] = useState("1");
  const [jobPhotos, setJobPhotos] = useState<CapturedPhoto[]>([]);
  const [activePhotoType, setActivePhotoType] = useState<"before" | "after" | null>(null);
  const [complianceRequired, setComplianceRequired] = useState(false);
  const [cocNumber, setCocNumber] = useState("");
  const [poConfirmed, setPoConfirmed] = useState(false);
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const galleryPhotoInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptTargetIdx, setReceiptTargetIdx] = useState<number | null>(null);

  const toggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not supported", description: "Voice dictation isn't available in this browser.", duration: 3000 });
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-AU";
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(interim.trim());
      if (finalTranscript) {
        setJobSheet((prev) => (prev ? `${prev} ${finalTranscript.trim()}` : finalTranscript.trim()));
        setInterimTranscript("");
      }
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event?.error && event.error !== "aborted") {
        toast({ title: "Dictation issue", description: `Microphone error: ${event.error}.`, duration: 3000 });
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e: any) {
      setIsListening(false);
      toast({ title: "Couldn't start dictation", description: e?.message || "Please try again.", duration: 3000 });
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

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
    const file = e.target.files?.[0];
    if (!file || receiptTargetIdx === null) return;
    const reader = new FileReader();
    reader.onload = () => {
      setParts(prev => prev.map((pp, ii) => ii === receiptTargetIdx ? { ...pp, receiptPhoto: reader.result as string } : pp));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setReceiptTargetIdx(null);
  };

  const vanStockUsed = parts.filter((p) => p.used && p.source === "van-stock");
  const supplierItems = parts.filter((p) => p.used && p.source === "supplier");

  // Build active steps: skip completion steps when coming back
  const activeSteps = useMemo(() => {
    return STEPS.filter((s) => {
      if (!jobFinished) {
        // Coming back: only show status step
        return s.id === "status";
      }
      // Skip PO step if no van stock items
      if (s.id === "po-review" && vanStockUsed.length === 0) return false;
      return true;
    });
  }, [jobFinished, vanStockUsed.length]);

  const currentStep = activeSteps[step];
  const canNext = step < activeSteps.length - 1;
  const canPrev = step > 0;
  const isAiCleanupMode = jobSheet.trim().length > 0;

  function handleAddExtra() {
    if (!extraPartName.trim()) return;
    setParts((prev) => [...prev, {
      id: `extra-${Date.now()}`,
      name: extraPartName.trim(),
      quantity: Number(extraPartQty) || 1,
      unit: "pcs",
      unitPrice: 0,
      supplier: "",
      used: true,
      source: "supplier" as const,
    }]);
    setExtraPartName("");
    setExtraPartQty("1");
  }

  function handleSubmit() {
    toast({
      title: returnNeeded ? "Return Visit Flagged" : "Job Completed ✅",
      description: returnNeeded
        ? `${job.jobName} marked as needing a return visit.`
        : `${job.jobName} marked as complete.`,
      duration: 3000,
    });

    if (vanStockUsed.length > 0 && poConfirmed) {
      setTimeout(() => {
        toast({
          title: "Restock PO Sent 📋",
          description: `${vanStockUsed.length} item(s) sent to supervisor for approval.`,
          duration: 4000,
        });
      }, 500);
    }

    if (jobFinished) updateJobStage(job.id, stageForPipelineEvent("job_finished"));
    onOpenChange(false);
    navigate("/");
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
    toast({ title: "Return visit noted ✅", description: "Continuing to job sheet…", duration: 3000 });
    setJobFinished(true);
    setStep(1);
  }

  const StepIcon = currentStep?.icon || Package;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StepIcon className="w-5 h-5 text-primary" />
            {currentStep?.label}
          </DialogTitle>
          <DialogDescription className="sr-only">Completion flow for {job.jobName}</DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {activeSteps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-colors",
                i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-muted-foreground/20"
              )}
            />
          ))}
        </div>

        <div className="space-y-4 min-h-[200px]">
          {/* Status — first step */}
          {currentStep?.id === "status" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Is this job finished?</Label>
                <div className="flex gap-2">
                  <button onClick={() => setJobFinished(true)} className={cn("flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all", jobFinished ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent")}>
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1" /> Job Finished
                  </button>
                  <button onClick={() => setJobFinished(false)} className={cn("flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all", !jobFinished ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent")}>
                    <CalendarDays className="w-5 h-5 mx-auto mb-1" /> Coming Back
                  </button>
                </div>
              </div>

              {!jobFinished && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
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

          {/* Job sheet */}
          {currentStep?.id === "jobsheet" && (
            <div className="space-y-3">
              <Label>Quick phrases</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Arrived on site",
                  "Spoke with customer",
                  "Diagnosed fault",
                  "Tested and commissioned",
                  "Cleaned up site",
                  "Left materials on site",
                  "Isolated power/water",
                  "Work completed as quoted",
                ].map((phrase) => {
                  const active = selectedPhrases.includes(phrase);
                  return (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setSelectedPhrases((p) => p.filter((x) => x !== phrase));
                          setJobSheet((prev) => prev.replace(`\n• ${phrase}`, "").replace(`• ${phrase}\n`, "").replace(`• ${phrase}`, "").trim());
                        } else {
                          setSelectedPhrases((p) => [...p, phrase]);
                          setJobSheet((prev) => (prev ? `${prev}\n• ${phrase}` : `• ${phrase}`));
                        }
                      }}
                      className={cn(
                        "text-xs px-2.5 py-1.5 rounded-full border transition-colors font-medium",
                        active
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted/50 text-muted-foreground border-border hover:bg-accent"
                      )}
                    >
                      {active && <Check className="w-3 h-3 inline mr-1" />}
                      {phrase}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <Label>What was done on this job?</Label>
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8" disabled={aiLoading} onClick={handleAiJobSheetAssist}>
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {isAiCleanupMode ? "AI Cleanup" : "AI Suggest"}
                  </Button>
                  <Button
                    type="button"
                    variant={isListening ? "default" : "outline"}
                    size="sm"
                    onClick={toggleDictation}
                    className={cn("gap-1.5 h-8", isListening && "animate-pulse")}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isListening ? "Stop" : "Dictate"}
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
              <Textarea
                ref={jobSheetRef}
                className={cn(
                  "bg-white dark:bg-[hsl(30,12%,24%)] border-2 border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-400 min-h-[120px] resize-none transition-all",
                  jobSheetExpanded ? "overflow-hidden" : "max-h-[50vh] overflow-y-auto"
                )}
                value={jobSheet}
                onChange={(e) => setJobSheet(e.target.value)}
                placeholder="Describe the work completed..."
              />
              {jobSheet && jobSheet.length > 100 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7 text-xs text-muted-foreground self-end"
                  onClick={() => setJobSheetExpanded(!jobSheetExpanded)}
                >
                  {jobSheetExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  {jobSheetExpanded ? "Collapse" : "Expand"}
                </Button>
              )}
            </div>
          )}

          {/* Time */}
          {currentStep?.id === "time" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Budgeted</span>
                <span className="font-semibold">{budgetedHours} hrs</span>
              </div>
              <div className="space-y-1.5">
                <Label>Actual hours</Label>
                <Input className="bg-white dark:bg-[hsl(30,12%,24%)] border-2 border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-400" type="number" step="0.5" value={actualHours} onChange={(e) => setActualHours(e.target.value)} />
              </div>
              {Number(actualHours) > budgetedHours && (
                <p className="text-xs text-[hsl(var(--status-orange))]">⚠ {(Number(actualHours) - budgetedHours).toFixed(1)} hrs over budget</p>
              )}
            </div>
          )}

          {/* Parts */}
          {currentStep?.id === "parts" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Mark source: <strong>Van Stock</strong> (generates restock PO) or <strong>Supplier</strong> (attach receipt).
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {parts.map((p, i) => (
                  <div key={p.id} className={cn(
                    "p-2.5 rounded-lg border transition-colors space-y-2",
                    p.used ? "bg-accent/20 border-border" : "bg-muted/20 border-transparent opacity-50"
                  )}>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={p.used} onCheckedChange={(checked) => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, used: !!checked } : pp))} />
                      <span className={cn("text-sm flex-1 font-medium", !p.used && "line-through text-muted-foreground")}>{p.name}</span>
                      <Input type="number" className="w-16 h-7 text-xs text-right" value={p.quantity} disabled={!p.used} onChange={(e) => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, quantity: Number(e.target.value) || 0 } : pp))} />
                      <span className="text-xs text-muted-foreground w-8">{p.unit}</span>
                    </div>
                    {p.used && (
                      <div className="flex items-center gap-1.5 pl-6 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, source: "van-stock" } : pp))}
                          className={cn("flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors", p.source === "van-stock" ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "bg-muted text-muted-foreground hover:bg-accent")}
                        >
                          <Truck className="w-3 h-3" /> Van Stock
                        </button>
                        <button
                          type="button"
                          onClick={() => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, source: "supplier" } : pp))}
                          className={cn("flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors", p.source === "supplier" ? "bg-[hsl(var(--status-orange)/0.15)] text-[hsl(var(--status-orange))] ring-1 ring-[hsl(var(--status-orange)/0.3)]" : "bg-muted text-muted-foreground hover:bg-accent")}
                        >
                          <ShoppingCart className="w-3 h-3" /> Supplier
                        </button>
                        {p.source === "supplier" && (
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptTargetIdx(i);
                              receiptInputRef.current?.click();
                            }}
                            className={cn(
                              "flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border-2 border-dashed transition-all",
                              p.receiptPhoto
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-muted-foreground/30 text-muted-foreground hover:border-primary/30 hover:bg-accent"
                            )}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {p.receiptPhoto ? "Receipt Added ✓" : "Attach Receipt"}
                          </button>
                        )}
                        {p.source === "supplier" && p.receiptPhoto && (
                          <img src={p.receiptPhoto} alt="Receipt" className="w-10 h-10 rounded object-cover border border-border" />
                        )}
                      </div>
                    )}
                    {p.used && p.source === "supplier" && (
                      <Input className="h-7 text-xs ml-6 w-auto bg-white dark:bg-[hsl(30,12%,24%)] border-2 border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-400" placeholder="Supplier name..." value={p.supplierName || ""} onChange={(e) => setParts((prev) => prev.map((pp, ii) => ii === i ? { ...pp, supplierName: e.target.value } : pp))} />
                    )}
                  </div>
                ))}
              </div>

              {/* Add extra item */}
              <div className="space-y-1.5 pt-1 border-t border-border">
                <Label className="text-xs">Add extra item</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Item name..."
                    value={extraPartName}
                    onChange={(e) => setExtraPartName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExtra(); } }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={extraPartQty}
                    onChange={(e) => setExtraPartQty(e.target.value)}
                    className="w-16"
                  />
                  <Button type="button" size="sm" onClick={handleAddExtra} disabled={!extraPartName.trim()}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {vanStockUsed.length > 0 && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Truck className="w-3 h-3" /> {vanStockUsed.length} van stock
                  </Badge>
                )}
                {supplierItems.length > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <ShoppingCart className="w-3 h-3" /> {supplierItems.length} from supplier
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* PO Review — shown only when van stock items exist */}
          {currentStep?.id === "po-review" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Restock Purchase Order</p>
                    <p className="text-xs text-muted-foreground">Replace van stock used on {job.jobName}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-2 space-y-1.5">
                  <div className="grid grid-cols-[1fr_60px_50px] gap-2 text-[10px] font-semibold text-muted-foreground uppercase pb-1">
                    <span>Item</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit</span>
                  </div>
                  {vanStockUsed.map((p) => (
                    <div key={p.id} className="grid grid-cols-[1fr_60px_50px] gap-2 text-sm items-center">
                      <span className="font-medium truncate">{p.name}</span>
                      <span className="text-right font-mono text-xs">{p.quantity}</span>
                      <span className="text-right text-xs text-muted-foreground">{p.unit}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{vanStockUsed.length} items to restock</span>
                  <Badge variant="secondary" className="text-xs">Pending Approval</Badge>
                </div>
              </div>

              <Button
                className="w-full h-12 gap-2"
                onClick={() => {
                  setPoConfirmed(true);
                  setStep((s) => s + 1);
                }}
              >
                <ClipboardList className="w-4 h-4" /> Send PO to Supervisor
              </Button>
            </div>
          )}

          {/* Photos */}
          {currentStep?.id === "photos" && (
            <div className="space-y-3">
              <Label>Job photos</Label>
              <div className="grid grid-cols-2 gap-2">
                <Card className="border-dashed cursor-pointer" onClick={() => setActivePhotoType("before")}>
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Before photos</p>
                    <p className="text-xs font-medium text-primary mt-1">Tap to add</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed cursor-pointer" onClick={() => setActivePhotoType("after")}>
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">After photos</p>
                    <p className="text-xs font-medium text-primary mt-1">Tap to add</p>
                  </CardContent>
                </Card>
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
              {jobPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{jobPhotos.length} photo(s) added</p>
                  <div className="flex gap-2 flex-wrap">
                    {jobPhotos.map((photo) => (
                      <div key={photo.id} className="relative">
                        <img src={photo.dataUrl} alt={photo.type} className="w-16 h-16 rounded-lg object-cover border border-border" />
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1 rounded-full uppercase">{photo.type[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checklist */}
          {currentStep?.id === "checklist" && (
            <ChecklistStepInline category="completion" onComplete={(cl) => onChecklistComplete?.(cl)} />
          )}

          {/* Compliance */}
          {currentStep?.id === "compliance" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Compliance required?</Label>
                <Switch checked={complianceRequired} onCheckedChange={setComplianceRequired} />
              </div>
              {complianceRequired && (
                <div className="space-y-2">
                  <Label>COC / Certificate Number</Label>
                  <Input className="bg-white dark:bg-[hsl(30,12%,24%)] border-2 border-border text-gray-900 dark:text-gray-100 placeholder:text-gray-400" value={cocNumber} onChange={(e) => setCocNumber(e.target.value)} placeholder="e.g. COC-2025-001" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2"><Checkbox /> <span className="text-sm">Testing completed</span></div>
                    <div className="flex items-center gap-2"><Checkbox /> <span className="text-sm">Certificate issued</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} disabled={!canPrev}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {canNext ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} className="gap-1.5">
              <Check className="w-4 h-4" />
              {returnNeeded ? "Flag Return" : "Finished Job"}
            </Button>
          )}
        </div>

        {/* Hidden camera inputs */}
        <input ref={cameraPhotoInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoCapture} />
        <input ref={galleryPhotoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoCapture} />
        <input ref={receiptInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptCapture} />
      </DialogContent>
    </Dialog>
  );
}
