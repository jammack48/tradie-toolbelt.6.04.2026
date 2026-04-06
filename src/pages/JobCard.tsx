import { useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { getJobDetail, getNewJobDetail, getJobDetailFromDemoJob } from "@/data/dummyJobDetails";
import { STAGE_LABELS } from "@/data/dummyJobs";

import { PageToolbar } from "@/components/PageToolbar";
import { OverviewTab } from "@/components/job/OverviewTab";
import { MaterialsTab } from "@/components/job/MaterialsTab";
import { NotesTab } from "@/components/job/NotesTab";
import { PhotosTab } from "@/components/job/PhotosTab";
import { TimeTab } from "@/components/job/TimeTab";
import { InvoiceTab } from "@/components/job/InvoiceTab";
import { QuoteTab } from "@/components/job/QuoteTab";
import { FormsTab } from "@/components/job/FormsTab";
import { HistoryTab } from "@/components/job/HistoryTab";
import { SequencesTab } from "@/components/SequencesTab";
import { MessagesTab } from "@/components/job/MessagesTab";
import { VariationsTab } from "@/components/job/VariationsTab";
import { JobCloseOutFlow } from "@/components/job/JobCloseOutFlow";
import { cn } from "@/lib/utils";
import { JOB_EXTRAS } from "@/config/toolbarTabs";
import { useDemoData } from "@/contexts/DemoDataContext";
import { LeadBadge } from "@/components/LeadBadge";
import { fetchVariationCounts } from "@/services/variationsService";

type JobTab = "overview" | "materials" | "notes" | "photos" | "time" | "quote" | "invoice" | "forms" | "history" | "sequences" | "messages" | "variations";

function statusColor(stage: string) {
  if (stage.includes("Paid")) return "bg-[hsl(var(--status-green))] text-white";
  if (stage.includes("Invoice") || stage.includes("Progress")) return "bg-[hsl(var(--status-orange))] text-white";
  if (stage.includes("Lead")) return "bg-[hsl(var(--status-red))] text-white";
  return "bg-muted text-muted-foreground";
}

export default function JobCard() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const managerState = (location.state as any);
  const initialTab = (searchParams.get("tab") as JobTab) || "overview";
  const [activeTab, setActiveTab] = useState<JobTab>(initialTab);
  const [closeOutOpen, setCloseOutOpen] = useState(false);
  const [variationCount, setVariationCount] = useState(0);
  const actionParam = searchParams.get("action");
  const { jobs } = useDemoData();

  const scheduleState = location.state as { jobName?: string; client?: string; address?: string; status?: string } | undefined;
  const liveJob = useMemo(() => jobs.find((item) => item.id === id), [jobs, id]);

  const job = id === "new"
    ? getNewJobDetail(searchParams.get("stage") || "Lead")
    : (() => {
        const detail = getJobDetail(id || "", scheduleState ? { client: scheduleState.client, address: scheduleState.address, description: scheduleState.jobName } : undefined);
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

  const isToInvoice = job?.stage === "To Invoice";

  // Auto-open close-out flow when navigating from pipeline with ?action=closeout
  useEffect(() => {
    if (actionParam === "closeout" && isToInvoice) {
      setCloseOutOpen(true);
    }
  }, [actionParam, isToInvoice]);

  useEffect(() => {
    if (!job) return;
    fetchVariationCounts([job.id]).then((counts) => setVariationCount(counts[job.id] ?? 0)).catch(() => setVariationCount(0));
  }, [job?.id]);


  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Job not found</p>
      </div>
    );
  }

  const tabContent: Record<JobTab, React.ReactNode> = {
    overview: <OverviewTab job={job} />,
    messages: <MessagesTab recordType="job" recordId={job.id} showPipelineLink pipelinePath="/" />,
    history: <HistoryTab job={job} />,
    quote: <QuoteTab job={job} />,
    materials: <MaterialsTab materials={job.materials} />,
    notes: <NotesTab notes={job.notes} />,
    photos: <PhotosTab photos={job.photos} />,
    time: <TimeTab timeEntries={job.timeEntries} />,
    forms: <FormsTab />,
    invoice: <InvoiceTab job={job} />,
    variations: <VariationsTab jobId={job.id} />,
    sequences: <SequencesTab category="invoices" />,
  };


  const jobHeading = (
    <div className="flex items-center gap-2 flex-wrap">
      <h2 className="text-base font-bold text-card-foreground">{job.jobName}</h2>
      <span className="text-sm font-bold text-card-foreground">${job.value.toLocaleString()}</span>
      <LeadBadge className="border-border/60 bg-secondary/70 text-foreground" />
      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", statusColor(job.stage))}>
        {(STAGE_LABELS[job.stage as keyof typeof STAGE_LABELS] ?? [job.stage])[0]}
      </span>
      {isToInvoice && (
        <button
          onClick={() => setCloseOutOpen(true)}
          className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors animate-pulse"
        >
          Close Out Job →
        </button>
      )}
    </div>
  );

  return (
    <>
      <PageToolbar
        tabs={JOB_EXTRAS}
        activeTab={activeTab}
        onTabChange={(id) => {
          if (id === "back") {
            if (activeTab !== "overview") {
              setActiveTab("overview");
            } else {
              const returnState = managerState?.fromManager ? managerState : managerState?.fromStage ? { fromStage: managerState.fromStage } : undefined;
              navigate("/", { state: returnState });
            }
            return;
          }
          setActiveTab(id as JobTab);
        }}
        pageHeading={jobHeading}
        highlightedTabs={variationCount > 0 ? ["variations"] : []}
      >
        {tabContent[activeTab]}
      </PageToolbar>
      <JobCloseOutFlow open={closeOutOpen} onOpenChange={setCloseOutOpen} job={job} />
    </>
  );
}
