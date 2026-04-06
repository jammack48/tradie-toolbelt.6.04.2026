import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, CircleCheck } from "lucide-react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getJobDetail, getNewJobDetail, getJobDetailFromDemoJob } from "@/data/dummyJobDetails";
import { toast } from "@/hooks/use-toast";
import { PageToolbar } from "@/components/PageToolbar";
import { QuoteOverviewTab } from "@/components/quote/QuoteOverviewTab";
import { QuoteTab } from "@/components/job/QuoteTab";
import { QuoteFunnel, StepIndicator, type FunnelResult } from "@/components/quote/QuoteFunnel";
import { NotesTab } from "@/components/job/NotesTab";
import { HistoryTab } from "@/components/job/HistoryTab";
import { SequenceSelector } from "@/components/quote/SequenceSelector";
import { SequencesTab } from "@/components/SequencesTab";
import { MessagesTab } from "@/components/job/MessagesTab";
import { VariationsTab } from "@/components/job/VariationsTab";
import { cn } from "@/lib/utils";
import { QUOTE_EXTRAS } from "@/config/toolbarTabs";
import { useDemoData } from "@/contexts/DemoDataContext";
import { stageForPipelineEvent, stageFromQuoteStatus } from "@/services/pipelineTransitions";
import { useThresholds } from "@/contexts/ThresholdContext";
import type { DemoCustomer } from "@/types/demoData";
import { LeadBadge } from "@/components/LeadBadge";
import { fetchVariationCounts } from "@/services/variationsService";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

type QuotePageTab = "overview" | "messages" | "line-items" | "variations" | "sequences" | "notes" | "history";

interface QuotePageLocationState {
  customer?: DemoCustomer | null;
  fromManager?: boolean;
  fromStage?: string;
}

type QuoteStatus = "Draft" | "Sent" | "Approved";

const statusColor: Record<QuoteStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-[hsl(var(--status-orange))] text-white",
  Approved: "bg-[hsl(var(--status-green))] text-white",
};

type AgeTone = "green" | "orange" | "red";

export default function QuotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const managerState = (location.state as QuotePageLocationState | null) ?? null;
  const initialCustomer = managerState?.customer ?? null;
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as QuotePageTab) || "line-items";
  const [activeTab, setActiveTab] = useState<QuotePageTab>(initialTab);
  const [status, setStatus] = useState<QuoteStatus>("Draft");
  const [funnelComplete, setFunnelComplete] = useState(false);
  const [funnelData, setFunnelData] = useState<FunnelResult | null>(null);
  const [funnelStep, setFunnelStep] = useState(initialCustomer ? 2 : 1);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavId, setPendingNavId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [variationCount, setVariationCount] = useState(0);
  const { jobs, updateJobStage } = useDemoData();
  const { getThresholds, getLabel } = useThresholds();

  const isNew = id === "new";
  const liveJob = useMemo(() => jobs.find((item) => item.id === id), [jobs, id]);
  const stageThresholds = getThresholds(liveJob?.stage || "To Quote");
  const ageTone: AgeTone = liveJob
    ? liveJob.urgent || liveJob.ageDays > stageThresholds.orangeMax
      ? "red"
      : liveJob.ageDays > stageThresholds.greenMax
        ? "orange"
        : "green"
    : "green";
  const ageMeta = {
    green: { icon: CircleCheck, className: "bg-[hsl(var(--status-green))]/20 text-[hsl(var(--status-green))]", label: getLabel(liveJob?.stage || "To Quote", "green") },
    orange: { icon: Clock3, className: "bg-[hsl(var(--status-orange))]/20 text-[hsl(var(--status-orange))]", label: getLabel(liveJob?.stage || "To Quote", "orange") },
    red: { icon: AlertTriangle, className: "bg-[hsl(var(--status-red))]/20 text-[hsl(var(--status-red))]", label: getLabel(liveJob?.stage || "To Quote", "red") },
  } as const;
  const AgeIcon = ageMeta[ageTone].icon;

  const handleTabChange = (tabId: string) => {
    if (tabId === "back") {
      const returnState = managerState?.fromManager ? managerState : managerState?.fromStage ? { fromStage: managerState.fromStage } : undefined;
      navigate("/", { state: returnState });
      return;
    }
    if (isNew && !funnelComplete) {
      setPendingNavId(tabId);
      setShowLeaveDialog(true);
      return;
    }
    setActiveTab(tabId as QuotePageTab);
  };

  const handleLeaveConfirm = (saveDraft: boolean) => {
    setShowLeaveDialog(false);
    if (saveDraft) {
      toast({ title: "Draft saved", description: "Your quote draft has been saved." });
    } else {
      toast({ title: "Discarded", description: "Quote draft discarded." });
    }
    if (pendingNavId) {
      setFunnelComplete(true);
      setActiveTab(pendingNavId as QuotePageTab);
    }
    setPendingNavId(null);
  };

  const handleLeaveCancel = () => {
    setShowLeaveDialog(false);
    setPendingNavId(null);
  };

  useEffect(() => {
    if (isNew || !id) {
      setVariationCount(0);
      return;
    }
    fetchVariationCounts([id]).then((counts) => setVariationCount(counts[id] ?? 0)).catch(() => setVariationCount(0));
  }, [id, isNew]);

  if (isNew && !funnelComplete) {
    return (
      <>
        <PageToolbar
          tabs={QUOTE_EXTRAS}
          activeTab="overview"
          onTabChange={handleTabChange}
          pageHeading={
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-bold text-card-foreground">New Quote</h2>
              <StepIndicator current={funnelStep} />
            </div>
          }
        >
          <QuoteFunnel
            onComplete={(data) => {
              setFunnelData(data);
              // Only pre-fill scope for custom descriptions, not bundle defaults
              setFunnelComplete(true);
            }}
            onStepChange={setFunnelStep}
            initialCustomer={initialCustomer}
          />

          <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave quote?</AlertDialogTitle>
                <AlertDialogDescription>
                  You haven't finished creating this quote. Would you like to save it as a draft?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleLeaveCancel}>Cancel</AlertDialogCancel>
                <AlertDialogAction className={cn("bg-muted text-muted-foreground hover:bg-muted/80")} onClick={() => handleLeaveConfirm(false)}>Discard</AlertDialogAction>
                <AlertDialogAction onClick={() => handleLeaveConfirm(true)}>Save Draft</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </PageToolbar>
      </>
    );
  }

  const job = isNew
    ? {
        ...getNewJobDetail("To Quote"),
        jobName: funnelData?.bundle?.name || "Custom Quote",
        client: funnelData?.customer?.name || "",
        clientPhone: funnelData?.customer?.phone || "",
        clientEmail: funnelData?.customer?.email || "",
        address: funnelData?.address || "",
        description: funnelData?.description || "",
      }
    : (() => {
        const detail = getJobDetail(id || "");
        if (!detail && liveJob) return getJobDetailFromDemoJob(liveJob);
        if (!detail) return null;
        if (!liveJob) return detail;
        return {
          ...detail,
          stage: liveJob.stage,
          client: liveJob.client,
          jobName: liveJob.jobName,
          value: liveJob.value,
          ageDays: liveJob.ageDays,
          urgent: liveJob.urgent,
        };
      })();

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Quote not found</p>
      </div>
    );
  }


  const cycleStatus = () => {
    const next: Record<QuoteStatus, QuoteStatus> = { Draft: "Sent", Sent: "Approved", Approved: "Draft" };
    const nextStatus = next[status];
    setStatus(nextStatus);

    if (job && !isNew) {
      const nextStage = stageFromQuoteStatus(nextStatus);
      if (nextStage) {
        updateJobStage(job.id, nextStage);
      }
    }
  };

  const handleSendQuote = () => {
    if (job && !isNew) {
      updateJobStage(job.id, stageForPipelineEvent("quote_sent"));
      setStatus("Sent");
    }
  };

  const tabContent: Record<QuotePageTab, React.ReactNode> = {
    overview: <QuoteOverviewTab job={job} scope={job.description || ""} onScopeChange={() => {}} />,
    messages: <MessagesTab recordType="quote" recordId={job.id} showPipelineLink pipelinePath="/" />,
    "line-items": (
      <div className="space-y-4">
        <QuoteTab job={job} onSendQuote={handleSendQuote} initialBundle={funnelData?.bundle || undefined} initialDescription={funnelData?.description || undefined} beforeActions={
          <SequenceSelector category="quotes" selectedId={selectedSequenceId} onSelect={setSelectedSequenceId} />
        } />
      </div>
    ),
    variations: <VariationsTab jobId={job.id} />,
    sequences: <SequencesTab category="quotes" />,
    notes: <NotesTab notes={job.notes} />,
    history: <HistoryTab job={job} />,
  };

  const quoteTitle = isNew
    ? funnelData?.bundle?.name
      ? `Quote — ${funnelData.bundle.name}`
      : "New Quote"
    : job.jobName
      ? `Quote — ${job.jobName}`
      : "Quote";

  const quoteHeading = (
    <div className="flex items-center gap-2 flex-wrap">
      <h2 className="text-base font-bold text-card-foreground">{quoteTitle}</h2>
      {job.client && (
        <span className="text-sm text-muted-foreground">for {job.client}</span>
      )}
      <LeadBadge className="border-border/60 bg-secondary/70 text-foreground" />
      <button
        onClick={cycleStatus}
        className={cn("text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer transition-colors inline-flex items-center gap-1", statusColor[status])}
      >
        <AgeIcon className={cn("w-3 h-3", !liveJob && "hidden")} />
        {status}
      </button>
      {!isNew && liveJob && (
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1", ageMeta[ageTone].className)}>
          <AgeIcon className="w-3 h-3" />
          {ageMeta[ageTone].label}
        </span>
      )}
    </div>
  );

  return (
    <>
      <PageToolbar
        tabs={QUOTE_EXTRAS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pageHeading={quoteHeading}
        highlightedTabs={variationCount > 0 ? ["variations"] : []}
      >
        {tabContent[activeTab]}
      </PageToolbar>
    </>
  );
}
