import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getJobDetail } from "@/data/dummyJobDetails";
import { PageToolbar } from "@/components/PageToolbar";
import { WorkOverviewTab } from "@/components/job/WorkOverviewTab";
import { ScopeTab } from "@/components/job/ScopeTab";
import { TimeTab } from "@/components/job/TimeTab";
import { NotesTab } from "@/components/job/NotesTab";
import { PhotosTab } from "@/components/job/PhotosTab";
import { FormsTab } from "@/components/job/FormsTab";
import { VariationsTab } from "@/components/job/VariationsTab";
import { JobCompletionFlow } from "@/components/job/JobCompletionFlow";
import { JobCloseOutFlow } from "@/components/job/JobCloseOutFlow";
import { SoleTraderCloseOutFlow } from "@/components/job/SoleTraderCloseOutFlow";
import { ChecklistDialog } from "@/components/job/ChecklistDialog";
import { cn } from "@/lib/utils";
import { WORK_JOB_EXTRAS } from "@/config/toolbarTabs";
import { Plus, CheckCircle2, Receipt, CalendarCheck, X, ClipboardCheck } from "lucide-react";
import { useJobPrefix } from "@/contexts/JobPrefixContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchVariationCounts } from "@/services/variationsService";
import { formatJobNumber } from "@/lib/jobNumber";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MaterialItem } from "@/data/dummyJobDetails";
import type { CompletedChecklist } from "@/data/dummyChecklists";

type WorkJobTab = "overview" | "scope" | "time" | "materials" | "notes" | "photos" | "forms" | "variations";

function WorkMaterialsTab({ materials, showPricing }: { materials: MaterialItem[]; showPricing?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Materials Used</CardTitle>
        <Button size="sm" className="h-9 gap-1.5">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </CardHeader>
      <CardContent>
        {materials.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No materials added yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right w-20">Qty</TableHead>
                <TableHead className="w-20">Unit</TableHead>
                {showPricing && <TableHead className="text-right w-24">Cost</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-right">{m.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">{m.unit}</TableCell>
                  {showPricing && (
                    <TableCell className="text-right font-mono">${(m.unitPrice * m.quantity).toFixed(2)}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkJobCard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { prefix } = useJobPrefix();
  const { isSoleTrader, isIntroMode } = useAppMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const locState = location.state as { customer?: string; address?: string; description?: string } | null;
  const [activeTab, setActiveTab] = useState<WorkJobTab>("overview");
  const resumeCompletion = searchParams.get("resumeCompletion") === "true";
  const isInvoiceOnlyMode = isSoleTrader || isIntroMode;
  const [completionOpen, setCompletionOpen] = useState(resumeCompletion && !isInvoiceOnlyMode);
  const [closeOutOpen, setCloseOutOpen] = useState(false);
  const [unifiedFlowOpen, setUnifiedFlowOpen] = useState(resumeCompletion && isInvoiceOnlyMode);

  // Checklist state
  const [arrivalChecklistOpen, setArrivalChecklistOpen] = useState(false);
  const [completedChecklists, setCompletedChecklists] = useState<CompletedChecklist[]>([]);

  // Return booking confirmation
  const returnBooked = searchParams.get("returnBooked") === "true";
  const returnDate = searchParams.get("returnDate") || "";
  const returnTime = searchParams.get("returnTime") || "";
  const [showBookedBanner, setShowBookedBanner] = useState(returnBooked);
  const [variationCount, setVariationCount] = useState(0);

  const job = getJobDetail(id || "", locState || undefined);
  const displayId = job ? formatJobNumber(job.id, prefix) : "";

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

  const tabContent: Record<WorkJobTab, React.ReactNode> = {
    overview: <WorkOverviewTab job={job} />,
    scope: <ScopeTab job={job} />,
    time: <TimeTab timeEntries={job.timeEntries} />,
    materials: <WorkMaterialsTab materials={job.materials} showPricing={isSoleTrader} />,
    notes: <NotesTab notes={job.notes} />,
    photos: <PhotosTab photos={job.photos} />,
    forms: <FormsTab completedChecklists={completedChecklists} />,
    variations: <VariationsTab jobId={job.id} />,
  };

  const jobHeading = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-xs text-muted-foreground">{displayId}</span>
      <h2 className="text-base font-bold text-card-foreground">{job.jobName}</h2>
      <Badge variant="secondary" className="text-xs">{job.stage}</Badge>
    </div>
  );

  const visibleTabs = isIntroMode
    ? WORK_JOB_EXTRAS.filter((tab) => ["back", "overview", "time", "materials", "photos"].includes(tab.id))
    : WORK_JOB_EXTRAS;

  return (
    <>
      <PageToolbar
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          if (tabId === "back") { navigate("/"); return; }
          setActiveTab(tabId as WorkJobTab);
        }}
        pageHeading={jobHeading}
        highlightedTabs={variationCount > 0 ? ["variations"] : []}
        tutorialKey="work-job"
      >
        {/* Return visit booked banner */}
        {showBookedBanner && (
          <div className="rounded-lg border-2 border-green-500/50 bg-green-500/10 p-3 mb-3 flex items-center gap-3">
            <CalendarCheck className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground">
                Return Visit Booked ✅
              </p>
              <p className="text-xs text-muted-foreground">
                {job.jobName} — {returnDate} at {returnTime}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                setShowBookedBanner(false);
                searchParams.delete("returnBooked");
                searchParams.delete("returnDate");
                searchParams.delete("returnTime");
                setSearchParams(searchParams, { replace: true });
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          {!isIntroMode && (
            <Button
              size="lg"
              variant="outline"
              className="flex-1 min-w-0 gap-2 h-12 text-sm font-bold truncate"
              onClick={() => setArrivalChecklistOpen(true)}
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" /> Arrived on Site
            </Button>
          )}
          {isInvoiceOnlyMode ? (
            <Button
              size="lg"
              className="flex-1 min-w-0 gap-2 h-12 text-sm font-bold truncate"
              onClick={() => setUnifiedFlowOpen(true)}
            >
              <Receipt className="w-4 h-4 shrink-0" /> Finish & Invoice
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex-1 min-w-0 gap-2 h-12 text-sm font-bold truncate"
              onClick={() => setCompletionOpen(true)}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Finished Job
            </Button>
          )}
        </div>
        {tabContent[activeTab]}
      </PageToolbar>

      {/* Arrival checklist dialog */}
      <ChecklistDialog
        open={arrivalChecklistOpen}
        onOpenChange={setArrivalChecklistOpen}
        category="arrival"
        onComplete={(cl) => setCompletedChecklists((prev) => [...prev, cl])}
      />

      <JobCompletionFlow
        open={completionOpen}
        onOpenChange={setCompletionOpen}
        job={job}
        resumeAfterBooking={resumeCompletion}
        onChecklistComplete={(cl) => setCompletedChecklists((prev) => [...prev, cl])}
      />

      {isInvoiceOnlyMode && (
        <SoleTraderCloseOutFlow
          open={unifiedFlowOpen}
          onOpenChange={setUnifiedFlowOpen}
          job={job}
          resumeAfterBooking={resumeCompletion}
          introMode={isIntroMode}
          onChecklistComplete={(cl) => setCompletedChecklists((prev) => [...prev, cl])}
        />
      )}

    </>
  );
}
