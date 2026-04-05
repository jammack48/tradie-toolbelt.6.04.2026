import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Job } from "@/data/dummyJobs";
import { STAGE_LABELS } from "@/data/dummyJobs";
import { cn } from "@/lib/utils";
import { formatJobNumber, getVariationTokens } from "@/lib/jobNumber";
import { useThresholds } from "@/contexts/ThresholdContext";
import { ThresholdSettings } from "@/components/ThresholdSettings";
import { useNotificationStyle } from "@/contexts/NotificationStyleContext";
import { TutorialTip } from "@/components/TutorialTip";
import { LeadActionMenu } from "@/components/LeadActionMenu";
import { useJobPrefix } from "@/contexts/JobPrefixContext";
import { Badge } from "@/components/ui/badge";
import { fetchVariationCounts } from "@/services/variationsService";

function countByStatus(jobs: Job[], greenMax: number, orangeMax: number) {
  let red = 0, orange = 0, green = 0;
  for (const j of jobs) {
    if (j.urgent || j.ageDays > orangeMax) red++;
    else if (j.ageDays > greenMax) orange++;
    else green++;
  }
  return { red, orange, green };
}

/** Bright blue notification dot with glow ping */
function UnreadDot() {
  return (
    <span className="relative flex h-3 w-3 shrink-0">
      <span className="animate-glow-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary shadow-[0_0_6px_2px_hsl(var(--primary)/0.5)]" />
    </span>
  );
}

/** Job preview row inside a color band */
function JobPreview({ job, notifStyle, variationCount = 0 }: { job: Job; notifStyle: "icon" | "pulse"; variationCount?: number }) {
  const { prefix } = useJobPrefix();
  const navigate = useNavigate();
  const displayId = formatJobNumber(job.id, prefix);
  const variationTokens = getVariationTokens(variationCount);
  const stageLabel = (STAGE_LABELS[job.stage as keyof typeof STAGE_LABELS] ?? [job.stage])[0];
  return (
    <div className={cn(
      "mt-1 text-[11px] text-white/80 leading-tight rounded px-1 -mx-1 transition-all",
      job.hasUnread && notifStyle === "pulse" && "animate-card-pulse bg-white/10"
    )}>
      <div className="font-semibold truncate">{job.client}</div>
      <div className="mt-0.5">
        <Badge className="h-4 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide border-white/35 bg-black/25 text-white shadow-sm">
          {stageLabel}
        </Badge>
      </div>
      <div className="truncate opacity-75">{displayId} · {job.jobName}</div>
      {variationTokens.length > 0 && (
        <div className="mt-0.5 flex items-center gap-1 flex-wrap">
          {variationTokens.slice(0, 3).map((token) => (
            <Badge key={token} className="h-4 px-1.5 py-0 text-[9px] font-semibold border-white/35 bg-black/25 text-white shadow-sm">
              {token}
            </Badge>
          ))}
          {variationTokens.length > 3 && (
            <Badge className="h-4 px-1.5 py-0 text-[9px] font-semibold border-white/35 bg-black/25 text-white shadow-sm">
              +{variationTokens.length - 3}
            </Badge>
          )}
        </div>
      )}
      {job.hasUnread && (
        <button
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            const isQ = ["Lead","To Quote","Quote Sent"].includes(job.stage);
            navigate(isQ ? `/quote/${job.id}?tab=messages&focus=inbound` : `/job/${job.id}?tab=messages&focus=inbound`);
          }}
          className="mt-0.5 inline-flex items-center gap-1.5 z-10 relative rounded-full px-1.5 py-0.5 bg-blue-500/20 border border-blue-400/50 hover:bg-blue-500/30 transition-colors"
          aria-label="Open messages"
        >
          <span className="relative">
            <Mail className="w-3 h-3 text-blue-200" />
            <span className="absolute -inset-1 rounded-full bg-blue-400/30 animate-ping" />
          </span>
          <span className="text-[9px] text-blue-100 font-semibold">3</span>
        </button>
      )}
    </div>
  );
}

/** Stage-specific tutorial tips */
const STAGE_TIPS: Record<string, string> = {
  "Lead": "Click to see all your new leads",
  "To Quote": "Click to see jobs waiting for a quote",
  "Quote Sent": "Click to see quotes you've sent out",
  "In Progress": "Click to see jobs you're working on",
  "To Invoice": "Click to see jobs ready to invoice",
  "Paid": "Click to see completed & paid jobs",
};

const COLOR_TIPS = {
  green: "These jobs are on track — click to open the first one",
  orange: "These are getting old — click to jump in and follow up",
  red: "Overdue! Click here to action the most urgent one first",
};

interface StageColumnProps {
  stage: string;
  jobs: Job[];
  isExpanded: boolean;
  onToggle: () => void;
  onNext?: () => void;
  layout?: "horizontal" | "vertical";
}

export function StageColumn({ stage, jobs, isExpanded, onToggle, onNext, layout = "horizontal" }: StageColumnProps) {
  const isVertical = layout === "vertical";
  const navigate = useNavigate();
  const { getThresholds, getLabel } = useThresholds();
  const { style: notifStyle } = useNotificationStyle();
  const thresholds = getThresholds(stage);
  const counts = countByStatus(jobs, thresholds.greenMax, thresholds.orangeMax);
  const firstGreen = jobs.find(j => !j.urgent && j.ageDays <= thresholds.greenMax);
  const firstOrange = jobs.find(j => !j.urgent && j.ageDays > thresholds.greenMax && j.ageDays <= thresholds.orangeMax);
  const firstRed = jobs.find(j => j.urgent || j.ageDays > thresholds.orangeMax);
  const isLeadStage = stage === "Lead";
  const [variationCounts, setVariationCounts] = useState<Record<string, number>>({});

  const previewJobIds = useMemo(
    () => [...new Set([firstGreen, firstOrange, firstRed].filter((job): job is Job => !!job).map((job) => job.id))],
    [firstGreen, firstOrange, firstRed]
  );

  useEffect(() => {
    let mounted = true;
    fetchVariationCounts(previewJobIds)
      .then((counts) => {
        if (mounted) setVariationCounts(counts);
      })
      .catch(() => {
        if (mounted) setVariationCounts({});
      });

    return () => {
      mounted = false;
    };
  }, [previewJobIds]);

  const navState = { fromStage: stage };

  const handleColorClick = (e: React.MouseEvent, job: Job | undefined) => {
    e.stopPropagation();
    if (!job || isLeadStage) return; // Lead stage handled by LeadActionMenu
    const isQ = ["Lead","To Quote","Quote Sent"].includes(job.stage);
    const isInv = job.stage === "To Invoice";
    navigate(isQ ? `/quote/${job.id}` : `/job/${job.id}${isInv ? '?action=closeout' : ''}`, { state: navState });
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
        "hover:bg-secondary/80",
        isExpanded && "ring-2 ring-primary/50 shadow-[0_0_20px_hsl(var(--glow-primary)/0.15)]",
        isVertical ? "min-w-[220px] w-full" : "flex-1 min-w-0"
      )}
      style={{ backgroundColor: "hsl(var(--column-bg))" }}
    >
      {/* Header — arrow-shaped pointing right */}
      <TutorialTip tip={STAGE_TIPS[stage] || `Click to expand ${stage}`} side="top">
        <div
          onClick={onToggle}
          className="relative px-3 py-2 flex items-start justify-between text-primary-foreground font-bold text-sm min-h-[52px] cursor-pointer"
          style={{
            backgroundColor: "hsl(var(--stage-header))",
            backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 8px, hsl(var(--border) / 0.2) 8px, hsl(var(--border) / 0.2) 9px)",
          }}
        >
          <div className="leading-snug min-w-0">
            <span className="break-words">
              {(STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? [stage])[0]}
            </span>
            <div className="text-xs font-medium opacity-70 break-words mt-0.5">
              {STAGE_LABELS[stage as keyof typeof STAGE_LABELS]?.[1] ?? "\u00A0"}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-0.5 mr-2">
            <span
              className="flex shrink-0 opacity-60 -space-x-2 cursor-pointer hover:opacity-100 transition-opacity"
              onClick={(e) => {
                if (onNext) {
                  e.stopPropagation();
                  onNext();
                }
              }}
            >
              <ChevronRight className="w-5 h-5" />
              <ChevronRight className="w-5 h-5" />
            </span>
            <TutorialTip tip={`${jobs.length} jobs in this stage`} side="bottom">
              <span className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-semibold">
                {jobs.length}
              </span>
            </TutorialTip>
            <ThresholdSettings stage={stage} />
          </div>
          {/* Right arrow point */}
          <div
            className="absolute right-0 top-0 h-full w-[14px] translate-x-[7px] z-10"
            style={{
              clipPath: "polygon(0 0, 0 100%, 100% 50%)",
              backgroundColor: "hsl(var(--stage-header))",
              backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 8px, hsl(var(--border) / 0.2) 8px, hsl(var(--border) / 0.2) 9px)",
            }}
          />
        </div>
      </TutorialTip>

      {/* Color cards with count + first job details */}
      <div className="p-2 flex flex-col gap-1.5">
        {/* Green */}
        {(() => {
          const card = (
            <div
              className="rounded-md bg-[hsl(var(--status-green))] px-3 py-2 min-h-[72px] shadow-sm border border-white/10 hover:shadow-md transition-shadow cursor-pointer"
              onClick={(e) => { handleColorClick(e, firstGreen); }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/90">{getLabel(stage, "green")}</span>
                <span className="text-sm font-bold text-white">{counts.green}</span>
              </div>
              {firstGreen ? (
                <JobPreview job={firstGreen} notifStyle={notifStyle} variationCount={variationCounts[firstGreen.id] ?? 0} />
              ) : counts.green === 0 ? (
                <div className="mt-1 text-[11px] text-white/50 italic">No jobs</div>
              ) : null}
            </div>
          );
          const wrapped = <TutorialTip tip={COLOR_TIPS.green} side="right">{card}</TutorialTip>;
          return isLeadStage && firstGreen ? <LeadActionMenu job={firstGreen} side="right">{card}</LeadActionMenu> : wrapped;
        })()}
        {/* Orange */}
        {(() => {
          const card = (
            <div
              className="rounded-md bg-[hsl(var(--status-orange))] px-3 py-2 min-h-[72px] shadow-sm border border-white/10 hover:shadow-md transition-shadow cursor-pointer"
              onClick={(e) => { handleColorClick(e, firstOrange); }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/90">{getLabel(stage, "orange")}</span>
                <span className="text-sm font-bold text-white">{counts.orange}</span>
              </div>
              {firstOrange ? (
                <JobPreview job={firstOrange} notifStyle={notifStyle} variationCount={variationCounts[firstOrange.id] ?? 0} />
              ) : counts.orange === 0 ? (
                <div className="mt-1 text-[11px] text-white/50 italic">No jobs</div>
              ) : null}
            </div>
          );
          const wrapped = <TutorialTip tip={COLOR_TIPS.orange} side="right">{card}</TutorialTip>;
          return isLeadStage && firstOrange ? <LeadActionMenu job={firstOrange} side="right">{card}</LeadActionMenu> : wrapped;
        })()}
        {/* Red */}
        {(() => {
          const card = (
            <div
              className="rounded-md bg-[hsl(var(--status-red))] px-3 py-2 min-h-[72px] shadow-sm border border-white/10 hover:shadow-md transition-shadow cursor-pointer"
              onClick={(e) => { handleColorClick(e, firstRed); }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/90">{getLabel(stage, "red")}</span>
                <span className="text-sm font-bold text-white">{counts.red}</span>
              </div>
              {firstRed ? (
                <JobPreview job={firstRed} notifStyle={notifStyle} variationCount={variationCounts[firstRed.id] ?? 0} />
              ) : counts.red === 0 ? (
                <div className="mt-1 text-[11px] text-white/50 italic">No jobs</div>
              ) : null}
            </div>
          );
          const wrapped = <TutorialTip tip={COLOR_TIPS.red} side="right">{card}</TutorialTip>;
          return isLeadStage && firstRed ? <LeadActionMenu job={firstRed} side="right">{card}</LeadActionMenu> : wrapped;
        })()}
      </div>
    </div>
  );
}
