import { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getJobDetail, getNewJobDetail, getJobDetailFromDemoJob } from "@/data/dummyJobDetails";
import { toast } from "@/hooks/use-toast";
import { PageToolbar } from "@/components/PageToolbar";
import { QuoteOverviewTab } from "@/components/quote/QuoteOverviewTab";
import { QuoteTab } from "@/components/job/QuoteTab";
import { QuoteFunnel, StepIndicator, type FunnelResult } from "@/components/quote/QuoteFunnel";
import { Textarea } from "@/components/ui/textarea";
import { NotesTab } from "@/components/job/NotesTab";
import { HistoryTab } from "@/components/job/HistoryTab";
import { SequenceSelector } from "@/components/quote/SequenceSelector";
import { SequencesTab } from "@/components/SequencesTab";
import { cn } from "@/lib/utils";
import { ServiceReminderSection } from "@/components/job/ServiceReminderSection";
import { INVOICE_EXTRAS } from "@/config/toolbarTabs";
import { useDemoData } from "@/contexts/DemoDataContext";
import { stageFromInvoiceStatus, stageForPipelineEvent } from "@/services/pipelineTransitions";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

type InvoiceTab = "overview" | "line-items" | "sequences" | "notes" | "history";

type InvoiceStatus = "Draft" | "Sent" | "Paid";

const statusColor: Record<InvoiceStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-[hsl(var(--status-orange))] text-white",
  Paid: "bg-[hsl(var(--status-green))] text-white",
};

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const managerState = (location.state as any);
  const [activeTab, setActiveTab] = useState<InvoiceTab>("line-items");
  const [scope, setScope] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("Draft");
  const [funnelComplete, setFunnelComplete] = useState(false);
  const [funnelData, setFunnelData] = useState<FunnelResult | null>(null);
  const [funnelStep, setFunnelStep] = useState(1);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavId, setPendingNavId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const { jobs, updateJobStage } = useDemoData();

  const isNew = id === "new";

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
    setActiveTab(tabId as InvoiceTab);
  };

  const handleLeaveConfirm = (saveDraft: boolean) => {
    setShowLeaveDialog(false);
    if (saveDraft) {
      toast({ title: "Draft saved", description: "Your invoice draft has been saved." });
    } else {
      toast({ title: "Discarded", description: "Invoice draft discarded." });
    }
    if (pendingNavId) {
      setFunnelComplete(true);
      setActiveTab(pendingNavId as InvoiceTab);
    }
    setPendingNavId(null);
  };

  const handleLeaveCancel = () => {
    setShowLeaveDialog(false);
    setPendingNavId(null);
  };

  if (isNew && !funnelComplete) {
    return (
      <PageToolbar
        tabs={INVOICE_EXTRAS}
        activeTab="overview"
        onTabChange={handleTabChange}
        pageHeading={
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-bold text-card-foreground">New Invoice</h2>
            <StepIndicator current={funnelStep} />
          </div>
        }
      >
        <QuoteFunnel
          label="invoice"
          onComplete={(data) => {
            setFunnelData(data);
            setScope(data.description);
            setFunnelComplete(true);
          }}
          onStepChange={setFunnelStep}
        />

        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                You haven't finished creating this invoice. Would you like to save it as a draft?
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
    );
  }

  const liveJob = useMemo(() => jobs.find((item) => item.id === id), [jobs, id]);

  const job = isNew
    ? {
        ...getNewJobDetail("To Invoice"),
        jobName: funnelData?.bundle?.name || "Custom Invoice",
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
        <p className="text-muted-foreground">Invoice not found</p>
      </div>
    );
  }

  if (scope === "" && job.description && !isNew) {
    setScope(job.description);
  }

  const cycleStatus = () => {
    const next: Record<InvoiceStatus, InvoiceStatus> = { Draft: "Sent", Sent: "Paid", Paid: "Draft" };
    const nextStatus = next[status];
    setStatus(nextStatus);

    if (job && !isNew) {
      const nextStage = stageFromInvoiceStatus(nextStatus);
      if (nextStage) {
        updateJobStage(job.id, nextStage);
      }
    }
  };

  const handleSendInvoice = () => {
    if (job && !isNew) {
      updateJobStage(job.id, stageForPipelineEvent("invoice_sent"));
      setStatus("Sent");
    }
  };

  const tabContent: Record<InvoiceTab, React.ReactNode> = {
    overview: <QuoteOverviewTab job={job} scope={scope} onScopeChange={setScope} />,
    "line-items": (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <Textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Describe what this invoice is for — e.g. 'Hot water cylinder replacement and pipework'"
            className="min-h-[60px] border-0 bg-transparent p-0 focus-visible:ring-0 text-sm resize-none"
          />
        </div>
        <QuoteTab job={job} onSendQuote={handleSendInvoice} initialBundle={funnelData?.bundle || undefined} beforeActions={
          <div className="space-y-4">
            <SequenceSelector category="invoices" selectedId={selectedSequenceId} onSelect={setSelectedSequenceId} />
            <ServiceReminderSection customerName={job.client} jobName={job.jobName} />
          </div>
        } />
      </div>
    ),
    sequences: <SequencesTab category="invoices" />,
    notes: <NotesTab notes={job.notes} />,
    history: <HistoryTab job={job} />,
  };

  const invoiceTitle = isNew
    ? funnelData?.bundle?.name
      ? `Invoice — ${funnelData.bundle.name}`
      : "New Invoice"
    : job.jobName
      ? `Invoice — ${job.jobName}`
      : "Invoice";

  const invoiceHeading = (
    <div className="flex items-center gap-2 flex-wrap">
      <h2 className="text-base font-bold text-card-foreground">{invoiceTitle}</h2>
      {job.client && (
        <span className="text-sm text-muted-foreground">for {job.client}</span>
      )}
      <button
        onClick={cycleStatus}
        className={cn("text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer transition-colors", statusColor[status])}
      >
        {status}
      </button>
    </div>
  );

  return (
    <PageToolbar
      tabs={INVOICE_EXTRAS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      pageHeading={invoiceHeading}
    >
      {tabContent[activeTab]}
    </PageToolbar>
  );
}
