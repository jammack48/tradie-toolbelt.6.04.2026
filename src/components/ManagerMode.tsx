import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { STAGE_LABELS, STAGES, type Stage } from "@/data/dummyJobs";
import type { DemoJob as Job } from "@/types/demoData";
import { useThresholds } from "@/contexts/ThresholdContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";
import {
  Archive, StickyNote, Phone, FileText, CheckCircle, CalendarDays,
  PauseCircle, Send, Star, ChevronLeft, ChevronRight, Mail,
  MessageSquare, Check, X, ExternalLink, Receipt, Zap,
  LayoutList, GalleryHorizontal,
} from "lucide-react";
import { dummySequences } from "@/data/dummySequences";
import { useDemoData } from "@/contexts/DemoDataContext";

type PriorityColor = "red" | "orange" | "green";

function getJobColor(job: Job, greenMax: number, orangeMax: number): PriorityColor {
  if (job.ageDays <= greenMax) return "green";
  if (job.ageDays <= orangeMax) return "orange";
  return "red";
}

interface ActionDef {
  label: string;
  icon: React.ElementType;
  action: string;
  requiresNote?: boolean;
}

const STAGE_ACTIONS: Record<string, ActionDef[]> = {
  "Lead": [
    { label: "Archive", icon: Archive, action: "archived", requiresNote: true },
    { label: "Add Note", icon: StickyNote, action: "note" },
    { label: "Convert to Quote", icon: FileText, action: "converted" },
    { label: "Call Back", icon: Phone, action: "callback" },
  ],
  "To Quote": [
    { label: "Archive", icon: Archive, action: "archived", requiresNote: true },
    { label: "Add Note", icon: StickyNote, action: "note" },
    { label: "Convert to Quote", icon: FileText, action: "converted" },
    { label: "Call Back", icon: Phone, action: "callback" },
  ],
  "Quote Sent": [
    { label: "Archive", icon: Archive, action: "archived", requiresNote: true },
    { label: "Add Note", icon: StickyNote, action: "note" },
    { label: "Resend Quote", icon: Send, action: "resent" },
    { label: "Call Back", icon: Phone, action: "callback" },
    { label: "Move to Quote Accepted", icon: CheckCircle, action: "accepted" },
    { label: "Open Quote", icon: ExternalLink, action: "open" },
  ],
  "Quote Accepted": [
    { label: "Add Note", icon: StickyNote, action: "note" },
    { label: "Move to Scheduled/In Progress", icon: CalendarDays, action: "scheduled" },
    { label: "Call Back", icon: Phone, action: "callback" },
    { label: "Open Job", icon: ExternalLink, action: "open" },
  ],
  "In Progress": [
    { label: "Add Note", icon: StickyNote, action: "note" },
    { label: "On Hold", icon: PauseCircle, action: "on-hold" },
    { label: "Mark Complete", icon: CheckCircle, action: "completed" },
    { label: "Call Back", icon: Phone, action: "callback" },
    { label: "Open Job", icon: ExternalLink, action: "open" },
  ],
  "To Invoice": [
    { label: "Add Note", icon: StickyNote, action: "note" },
    { label: "Create Invoice", icon: Receipt, action: "invoiced" },
    { label: "On Hold", icon: PauseCircle, action: "on-hold" },
    { label: "Open Job", icon: ExternalLink, action: "open" },
  ],
  "Invoiced": [
    { label: "Add Note", icon: StickyNote, action: "note" },
    { label: "Resend Invoice", icon: Send, action: "resent" },
    { label: "Call Back", icon: Phone, action: "callback" },
    { label: "Mark Paid", icon: CheckCircle, action: "paid" },
    { label: "Open Invoice", icon: ExternalLink, action: "open" },
  ],
  "Invoice Paid": [
    { label: "Add Note", icon: StickyNote, action: "note" },
    { label: "Archive", icon: Archive, action: "archived", requiresNote: true },
    { label: "Request Review", icon: Star, action: "review-requested" },
    { label: "Open Job", icon: ExternalLink, action: "open" },
  ],
};

function generateHistory(job: Job, stage: string) {
  const entries: { label: string; daysAgo: number; icon?: "sequence" }[] = [];
  entries.push({ label: "Lead created", daysAgo: job.ageDays });
  if (["To Quote","Quote Sent","Quote Accepted","In Progress","To Invoice","Invoiced","Invoice Paid"].includes(stage))
    entries.push({ label: "Quote drafted", daysAgo: Math.max(1, job.ageDays - 2) });
  if (["Quote Sent","Quote Accepted","In Progress","To Invoice","Invoiced","Invoice Paid"].includes(stage)) {
    entries.push({ label: "Quote sent to client", daysAgo: Math.max(1, job.ageDays - 3) });
    const seq = dummySequences.find(s => s.category === "quotes");
    if (seq) {
      entries.push({ label: `Sequence "${seq.name}" triggered`, daysAgo: Math.max(1, job.ageDays - 3), icon: "sequence" });
      seq.steps.forEach((step, i) => {
        const stepDaysAfter = step.delayUnit === "hours" ? 0 : step.delayValue;
        const daysAgo = Math.max(1, job.ageDays - 3 - stepDaysAfter);
        const channelLabel = step.channel === "email" ? "Email" : "SMS";
        entries.push({ label: `↳ Step ${i + 1}: ${channelLabel} sent`, daysAgo, icon: "sequence" });
      });
    }
  }
  if (["Quote Accepted","In Progress","To Invoice","Invoiced","Invoice Paid"].includes(stage))
    entries.push({ label: "Quote accepted", daysAgo: Math.max(1, job.ageDays - 5) });
  if (["In Progress","To Invoice","Invoiced","Invoice Paid"].includes(stage))
    entries.push({ label: "Job scheduled", daysAgo: Math.max(1, job.ageDays - 6) });
  if (["To Invoice","Invoiced","Invoice Paid"].includes(stage))
    entries.push({ label: "Job completed", daysAgo: Math.max(1, job.ageDays - 8) });
  if (["Invoiced","Invoice Paid"].includes(stage)) {
    entries.push({ label: "Invoice sent", daysAgo: Math.max(1, job.ageDays - 9) });
    const seq = dummySequences.find(s => s.category === "invoices");
    if (seq) {
      entries.push({ label: `Sequence "${seq.name}" triggered`, daysAgo: Math.max(1, job.ageDays - 9), icon: "sequence" });
      seq.steps.forEach((step, i) => {
        const stepDaysAfter = step.delayUnit === "hours" ? 0 : step.delayValue;
        const daysAgo = Math.max(1, job.ageDays - 9 - stepDaysAfter);
        const channelLabel = step.channel === "email" ? "Email" : "SMS";
        entries.push({ label: `↳ Step ${i + 1}: ${channelLabel} sent`, daysAgo, icon: "sequence" });
      });
    }
  }
  if (stage === "Invoice Paid")
    entries.push({ label: "Invoice paid", daysAgo: 1 });
  return entries;
}

function generateSequence(stage: string, job: Job) {
  if (["Lead","To Quote"].includes(stage)) return null;
  
  const category = ["Quote Sent","Quote Accepted"].includes(stage) ? "quotes" 
    : ["Invoiced","Invoice Paid"].includes(stage) ? "invoices" : null;
  
  if (!category && !["In Progress","To Invoice"].includes(stage)) return null;
  
  const seq = category ? dummySequences.find(s => s.category === category) : null;
  
  if (seq) {
    const isLateStage = stage === "Quote Accepted" || stage === "Invoice Paid";
    return {
      name: seq.name,
      items: seq.steps.map((step, i) => ({
        type: step.channel,
        label: step.channel === "email" ? `Email: Step ${i + 1}` : `SMS: Step ${i + 1}`,
        opened: isLateStage ? true : i === 0 && job.ageDays > 5,
        delay: `${step.delayValue} ${step.delayUnit}`,
      })),
    };
  }
  
  if (["In Progress","To Invoice"].includes(stage)) {
    return {
      name: "Job Confirmation",
      items: [{ type: "email" as const, label: "Job confirmation email", opened: true, delay: "immediate" }],
    };
  }
  
  return null;
}

const PRIORITY_COLORS: { color: PriorityColor; bg: string; ring: string; dot: string }[] = [
  { color: "red", bg: "bg-red-500/10", ring: "ring-red-500", dot: "bg-red-500" },
  { color: "orange", bg: "bg-orange-500/10", ring: "ring-orange-500", dot: "bg-orange-500" },
  { color: "green", bg: "bg-green-500/10", ring: "ring-green-500", dot: "bg-green-500" },
];

const COLOR_CLASSES: Record<PriorityColor, string> = {
  red: "text-red-500",
  orange: "text-orange-500",
  green: "text-green-500",
};

type ViewMode = "swipe" | "list";

function JobCard({ job, activeStage, activePriority, note, setNote, onAction, onSaveNote }: {
  job: Job;
  activeStage: Stage;
  activePriority: PriorityColor;
  note: string;
  setNote: (v: string) => void;
  onAction: (job: Job, action: string, actionDef: ActionDef) => void;
  onSaveNote: (job: Job) => void;
}) {
  const navigate = useNavigate();
  const { jobs, jobsByStage, updateJobStage } = useDemoData();
  const history = generateHistory(job, activeStage);
  const sequence = generateSequence(activeStage, job);
  const actions = STAGE_ACTIONS[activeStage] || [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="min-w-0">
            <p className="font-semibold text-card-foreground">{job.client}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <p className="text-sm text-muted-foreground truncate">{job.jobName}</p>
              <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide">
                {(STAGE_LABELS[activeStage] ?? [activeStage])[0]}
              </Badge>
            </div>
          </div>
          {job.hasUnread && (
            <button
              onClick={() => {
                const isQ = ["Lead","To Quote","Quote Sent"].includes(activeStage);
                navigate(isQ ? `/quote/${job.id}?tab=messages&focus=inbound` : `/job/${job.id}?tab=messages&focus=inbound`);
              }}
              className="animate-wiggle inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-primary/20 border border-primary/40 hover:bg-primary/30 transition-colors"
            >
              <Mail className="w-4 h-4 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
              <span className="text-[10px] font-semibold text-primary">Reply</span>
            </button>
          )}
        </div>
        <div className="text-right">
          <p className="font-semibold text-card-foreground">${job.value.toLocaleString()}</p>
          <p className={cn("text-xs font-medium", COLOR_CLASSES[activePriority])}>
            {job.ageDays} days old
          </p>
        </div>
      </div>

      {/* History Timeline */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">History</p>
        <div className="space-y-1 pl-3 border-l-2 border-border">
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={cn("w-1.5 h-1.5 rounded-full -ml-[calc(0.75rem+4px)]", h.icon === "sequence" ? "bg-primary" : "bg-muted-foreground/50")} />
              <span className={cn("text-card-foreground", h.icon === "sequence" && "text-primary")}>{h.label}</span>
              <span className="text-muted-foreground ml-auto shrink-0">{h.daysAgo}d ago</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sequence Status */}
      {sequence && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Zap className="w-3 h-3 inline mr-1 text-primary" />
            {sequence.name}
          </p>
          <div className="space-y-1">
            {sequence.items.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {s.type === "email" ? (
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-card-foreground">{s.label}</span>
                <span className="text-muted-foreground text-[10px]">({s.delay})</span>
                {s.opened ? (
                  <span className="ml-auto flex items-center gap-1 text-green-500">
                    <Check className="w-3 h-3" /> Opened
                  </span>
                ) : (
                  <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                    <X className="w-3 h-3" /> Not opened
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            variant="outline"
            size="sm"
            className="h-12 text-xs gap-1.5 justify-start whitespace-normal text-left leading-tight"
            onClick={() => onAction(job, a.action, a)}
          >
            <a.icon className="w-4 h-4 shrink-0" />
            <span>{a.label}</span>
          </Button>
        ))}
      </div>

      {/* Note Input */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add a quick note..."
          className="min-h-[60px] text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          size="sm"
          className="w-full h-10"
          onClick={() => onSaveNote(job)}
          disabled={!note.trim()}
        >
          <StickyNote className="w-4 h-4 mr-1" />
          Save Note
        </Button>
      </div>
    </div>
  );
}

interface ManagerModeProps {
  initialStage?: Stage;
  initialPriority?: PriorityColor;
  initialIndex?: number;
}

export function ManagerMode({ initialStage, initialPriority, initialIndex }: ManagerModeProps = {}) {
  const navigate = useNavigate();
  const { jobs, jobsByStage, updateJobStage } = useDemoData();
  const { getThresholds, getLabel } = useThresholds();
  const [activeStage, setActiveStage] = useState<Stage>(initialStage || "Lead");
  const [activePriority, setActivePriority] = useState<PriorityColor>(initialPriority || "red");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("swipe");
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const guidedFlow = true;

  const thresholds = getThresholds(activeStage);
  const stageJobs = jobsByStage(activeStage);
  const filteredJobs = stageJobs.filter(
    (j) => getJobColor(j, thresholds.greenMax, thresholds.orangeMax) === activePriority
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [currentIndex, setCurrentIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    if (!focusedJobId) {
      emblaApi.scrollTo(0);
      setCurrentIndex(0);
      return;
    }

    const focusedIndex = filteredJobs.findIndex((job) => job.id === focusedJobId);
    const nextIndex = focusedIndex >= 0 ? focusedIndex : 0;
    emblaApi.scrollTo(nextIndex);
    setCurrentIndex(nextIndex);
  }, [activeStage, activePriority, emblaApi, focusedJobId, filteredJobs]);

  // Scroll to initial index after embla is ready
  useEffect(() => {
    if (initialIndex != null && initialIndex > 0 && emblaApi) {
      emblaApi.scrollTo(initialIndex);
      setCurrentIndex(initialIndex);
    }
  }, [emblaApi]); // eslint-disable-line react-hooks/exhaustive-deps

  const managerNavState = { fromManager: true, stage: activeStage, priority: activePriority, slideIndex: currentIndex, guidedFlow };

  const handleAction = (job: Job, action: string, actionDef: ActionDef) => {
    if (action === "open") {
      const jobIndex = filteredJobs.findIndex((j) => j.id === job.id);
      const slideIndex = jobIndex >= 0 ? jobIndex : currentIndex;
      const navState = { ...managerNavState, jobId: job.id, slideIndex };
      const earlyStages = ["Lead", "To Quote", "Quote Sent"];
      if (earlyStages.includes(activeStage)) navigate(`/quote/${job.id}`, { state: navState });
      else if (["Invoiced", "Invoice Paid"].includes(activeStage)) navigate(`/invoice/${job.id}`, { state: navState });
      else navigate(`/job/${job.id}`, { state: navState });
      return;
    }
    const jobNote = notes[job.id] || "";
    if (actionDef.requiresNote && !jobNote.trim()) {
      toast({
        title: "Note required",
        description: `Please add a note explaining why you're archiving ${job.client} — ${job.jobName}.`,
        variant: "destructive",
      });
      return;
    }
    const stageMap: Record<string, Stage> = {
      accepted: "Quote Accepted",
      completed: "To Invoice",
      invoiced: "Invoiced",
      paid: "Invoice Paid",
      converted: "To Quote",
      scheduled: "In Progress",
    };

    const nextStage = stageMap[action];
    if (nextStage) {
      setFocusedJobId(job.id);
      const nextThresholds = getThresholds(nextStage);
      setActiveStage(nextStage);
      setActivePriority(getJobColor(job, nextThresholds.greenMax, nextThresholds.orangeMax));
      updateJobStage(job.id, nextStage);
    }

    toast({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)}`,
      description: `${job.client} — ${job.jobName} has been ${action}.${nextStage ? ` Moved to ${nextStage}.` : ""}${actionDef.requiresNote ? ` Note: ${jobNote}` : ""}`,
    });
    if (actionDef.requiresNote) setNotes(prev => ({ ...prev, [job.id]: "" }));
  };

  const handleSaveNote = (job: Job) => {
    const jobNote = notes[job.id] || "";
    if (!jobNote.trim()) return;
    toast({ title: "Note saved", description: `Note added to ${job.client} — ${job.jobName}` });
    setNotes(prev => ({ ...prev, [job.id]: "" }));
  };

  const priorityCounts = PRIORITY_COLORS.map((p) => ({
    ...p,
    count: stageJobs.filter((j) => getJobColor(j, thresholds.greenMax, thresholds.orangeMax) === p.color).length,
  }));

  // Notification counters — computed from all stages
  const notificationCounters = [
    { label: "Quotes Awaiting Reply", count: jobsByStage("Quote Sent").filter(j => getJobColor(j, getThresholds("Quote Sent").greenMax, getThresholds("Quote Sent").orangeMax) === "red").length, color: "bg-[hsl(var(--status-red))]", stage: "Quote Sent" as Stage },
    { label: "Invoices Overdue", count: jobsByStage("Invoiced").filter(j => getJobColor(j, getThresholds("Invoiced").greenMax, getThresholds("Invoiced").orangeMax) === "red").length, color: "bg-[hsl(var(--status-orange))]", stage: "Invoiced" as Stage },
    { label: "Messages Unread", count: 5, color: "bg-primary", stage: "Lead" as Stage },
  ].filter(c => c.count > 0);

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Notification Counters */}
      {notificationCounters.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {notificationCounters.map((counter) => (
            <button
              key={counter.label}
              onClick={() => { setActiveStage(counter.stage); setActivePriority("red"); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95",
                counter.color
              )}
            >
              <span className="font-bold">{counter.count}</span>
              <span>{counter.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sticky toolbar */}
      <div className="flex flex-col gap-3 pt-1 pb-2">
        {/* Stage Picker */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 px-1 -mx-1 scrollbar-none">
          {STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-colors border min-h-[36px]",
                activeStage === stage
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
              )}
            >
              {stage}
            </button>
          ))}
        </div>

        {/* Priority Filter — stacked vertically with descriptions */}
        <div className="flex flex-col gap-1.5 px-1">
          {priorityCounts.map((p) => (
            <button
              key={p.color}
              onClick={() => setActivePriority(p.color)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border w-full min-h-[44px]",
                activePriority === p.color
                  ? `${p.bg} ring-2 ${p.ring} border-transparent`
                  : "bg-secondary border-border"
              )}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", p.dot)} />
              <span className="font-bold">{p.count}</span>
              <span className="text-muted-foreground">
                {getLabel(activeStage, p.color)}
              </span>
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground font-medium">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("swipe")}
              className={cn(
                "h-7 px-2 gap-1 text-xs",
                viewMode === "swipe" && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <GalleryHorizontal className="w-3.5 h-3.5" />
              Swipe
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-7 px-2 gap-1 text-xs",
                viewMode === "list" && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Job Cards */}
      {filteredJobs.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm rounded-xl border border-dashed border-border">
          No {activePriority} priority jobs in {activeStage}
        </div>
      ) : viewMode === "list" ? (
        /* List View — all jobs stacked vertically */
        <div className="flex flex-col gap-3 px-1">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              activeStage={activeStage}
              activePriority={activePriority}
              note={notes[job.id] || ""}
              setNote={(v) => setNotes(prev => ({ ...prev, [job.id]: v }))}
              onAction={handleAction}
              onSaveNote={handleSaveNote}
            />
          ))}
        </div>
      ) : (
        /* Swipe View — carousel */
        <>
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {filteredJobs.map((job) => (
                <div key={job.id} className="flex-[0_0_100%] min-w-0 px-1">
                  <JobCard
                    job={job}
                    activeStage={activeStage}
                    activePriority={activePriority}
                    note={notes[job.id] || ""}
                    setNote={(v) => setNotes(prev => ({ ...prev, [job.id]: v }))}
                    onAction={handleAction}
                    onSaveNote={handleSaveNote}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {currentIndex + 1} / {filteredJobs.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => emblaApi?.scrollNext()}
              disabled={currentIndex === filteredJobs.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
