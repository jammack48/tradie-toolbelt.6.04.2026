import { ChevronRight } from "lucide-react";
import { STAGES, type Stage } from "@/data/dummyJobs";
import { cn } from "@/lib/utils";

interface PipelineFlowBannerProps {
  activeStage: Stage | null;
}

export const PipelineFlowBanner = ({ activeStage }: PipelineFlowBannerProps) => {
  return (
    <div className="pipeline-flow-banner rounded-lg overflow-hidden">
      <div className="grid grid-cols-8">
        {STAGES.map((stage, i) => (
          <div
            key={stage}
            className={cn(
              "flex items-center justify-center gap-0.5 h-[34px] text-[10px] font-semibold uppercase tracking-wider",
              activeStage === stage
                ? "text-primary"
                : "text-muted-foreground/70"
            )}
          >
            <span className="truncate">{stage}</span>
            {i < STAGES.length - 1 && (
              <span className="flex shrink-0 opacity-40 -space-x-1.5">
                <ChevronRight className="w-3 h-3" />
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
