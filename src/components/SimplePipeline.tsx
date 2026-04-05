import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoData } from "@/contexts/DemoDataContext";
import { useIsMobile } from "@/hooks/use-mobile";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SIMPLE_BUCKETS,
  BUCKET_STAGES,
  BUCKET_DROP_DEFAULT,
  BUCKET_COLORS,
  stageToBucket,
  type SimpleBucket,
} from "@/lib/simplePipelineMapping";
import type { DemoJob } from "@/types/demoData";

function SimpleJobCard({
  job,
  onDragStart,
}: {
  job: DemoJob;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    const isQ = ["Lead", "To Quote", "Quote Sent"].includes(job.stage);
    const isInv = job.stage === "To Invoice";
    navigate(
      isQ ? `/quote/${job.id}` : `/job/${job.id}${isInv ? "?action=closeout" : ""}`
    );
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job.id)}
      onClick={handleClick}
      className="rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm text-card-foreground truncate">
          {job.client}
        </span>
        <span className="text-xs font-bold text-primary">
          ${job.value.toLocaleString()}
        </span>
      </div>
      <div className="text-xs text-muted-foreground truncate mt-0.5">
        {job.jobName}
      </div>
      <Badge
        variant="secondary"
        className="mt-1.5 h-4 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide"
      >
        {job.stage}
      </Badge>
    </div>
  );
}

function BucketColumn({
  bucket,
  jobs,
  onDragStart,
  onDrop,
  dragOverBucket,
  onDragOver,
  onDragLeave,
}: {
  bucket: SimpleBucket;
  jobs: DemoJob[];
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onDrop: (bucket: SimpleBucket) => void;
  dragOverBucket: SimpleBucket | null;
  onDragOver: (e: React.DragEvent, bucket: SimpleBucket) => void;
  onDragLeave: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl overflow-hidden transition-all min-h-[200px]",
        dragOverBucket === bucket && "ring-2 ring-primary/60"
      )}
      onDragOver={(e) => onDragOver(e, bucket)}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(bucket);
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: BUCKET_COLORS[bucket] }}
      >
        <span className="text-sm font-bold text-white">{bucket}</span>
        <span className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-semibold text-white">
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div
        className="flex-1 p-2 flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-240px)]"
        style={{ backgroundColor: "hsl(var(--column-bg))" }}
      >
        {jobs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic py-8">
            Drop jobs here
          </div>
        ) : (
          jobs.map((job) => (
            <SimpleJobCard key={job.id} job={job} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}

export function SimplePipeline() {
  const { jobs, updateJobStage } = useDemoData();
  const isMobile = useIsMobile();
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<SimpleBucket | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });
  const [currentSlide, setCurrentSlide] = useState(0);

  // Group jobs by bucket
  const jobsByBucket = useCallback(
    (bucket: SimpleBucket) => {
      const stages = BUCKET_STAGES[bucket];
      return jobs.filter((j) => stages.includes(j.stage as any));
    },
    [jobs]
  );

  const handleDragStart = useCallback((e: React.DragEvent, jobId: string) => {
    setDraggedJobId(jobId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, bucket: SimpleBucket) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverBucket(bucket);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverBucket(null);
  }, []);

  const handleDrop = useCallback(
    (bucket: SimpleBucket) => {
      if (!draggedJobId) return;
      const defaultStage = BUCKET_DROP_DEFAULT[bucket];
      updateJobStage(draggedJobId, defaultStage);
      setDraggedJobId(null);
      setDragOverBucket(null);
    },
    [draggedJobId, updateJobStage]
  );

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
    setCurrentSlide((s) => Math.max(0, s - 1));
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
    setCurrentSlide((s) => Math.min(SIMPLE_BUCKETS.length - 1, s + 1));
  }, [emblaApi]);

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={scrollPrev} disabled={currentSlide === 0}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-card-foreground">
              {SIMPLE_BUCKETS[currentSlide]}
            </span>
            <div className="flex gap-1.5">
              {SIMPLE_BUCKETS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === currentSlide ? "bg-primary scale-125" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={scrollNext} disabled={currentSlide === SIMPLE_BUCKETS.length - 1}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {SIMPLE_BUCKETS.map((bucket) => (
              <div key={bucket} className="flex-[0_0_90%] min-w-0 px-2">
                <BucketColumn
                  bucket={bucket}
                  jobs={jobsByBucket(bucket)}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  dragOverBucket={dragOverBucket}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 pt-2">
      {SIMPLE_BUCKETS.map((bucket) => (
        <BucketColumn
          key={bucket}
          bucket={bucket}
          jobs={jobsByBucket(bucket)}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          dragOverBucket={dragOverBucket}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        />
      ))}
    </div>
  );
}
