import { useState, useCallback, useEffect, useRef, type PointerEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { STAGES, type Stage } from "@/data/dummyJobs";
import { StageColumn } from "@/components/StageColumn";
import { ExpandedStagePanel } from "@/components/ExpandedStagePanel";
import { PipelineFlowBanner } from "@/components/PipelineFlowBanner";
import { ChevronLeft, ChevronRight, LayoutGrid, Columns, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { TutorialTip } from "@/components/TutorialTip";
import { useDemoData } from "@/contexts/DemoDataContext";
import useEmblaCarousel from "embla-carousel-react";

type Layout = "horizontal" | "vertical";

const ACTION_BOXES: Record<string, string> = {
  "Lead": "Add Customer",
  "Quote Sent": "New Quote",
  "In Progress": "New Job",
  "To Invoice": "New Invoice",
};

const ACTION_TIPS: Record<string, string> = {
  "Lead": "Add a new customer or lead here",
  "Quote Sent": "Create a brand new quote",
  "In Progress": "Start a new job from scratch",
  "To Invoice": "Create a new invoice",
};

interface AdvancedPipelineProps {
  managerFromStage?: string;
}

export function AdvancedPipeline({ managerFromStage }: AdvancedPipelineProps) {
  const navigate = useNavigate();
  const { jobs, jobsByStage } = useDemoData();
  const isMobile = useIsMobile();

  const [expandedStage, setExpandedStage] = useState<Stage | null>(null);
  const [layout, setLayout] = useState<Layout>("horizontal");
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });
  const [currentSlide, setCurrentSlide] = useState(() => {
    if (managerFromStage) {
      const idx = STAGES.indexOf(managerFromStage as Stage);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const horizontalScrollRef = useRef<HTMLDivElement | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const dragHasMovedRef = useRef(false);
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("button, input, textarea, select, option, a, [role='button'], [data-no-drag]"));
  };

  const stopHorizontalDrag = useCallback((pointerId?: number) => {
    const container = horizontalScrollRef.current;
    if (container && pointerId !== undefined && container.hasPointerCapture(pointerId)) {
      container.releasePointerCapture(pointerId);
    }
    dragPointerIdRef.current = null;
    dragHasMovedRef.current = false;
    setIsDraggingHorizontal(false);
  }, []);

  const handleHorizontalPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (isMobile || event.pointerType === "touch" || isInteractiveTarget(event.target)) return;
    const container = horizontalScrollRef.current;
    if (!container) return;
    dragPointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragStartYRef.current = event.clientY;
    dragStartScrollLeftRef.current = container.scrollLeft;
    dragHasMovedRef.current = false;
  }, [isMobile]);

  const handleHorizontalPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    const container = horizontalScrollRef.current;
    if (!container) return;
    const deltaX = event.clientX - dragStartXRef.current;
    const deltaY = event.clientY - dragStartYRef.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    if (!dragHasMovedRef.current && (absDeltaX < 10 || absDeltaX < absDeltaY + 2)) return;
    if (!dragHasMovedRef.current) {
      dragHasMovedRef.current = true;
      setIsDraggingHorizontal(true);
      container.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    container.scrollLeft = dragStartScrollLeftRef.current - deltaX;
  }, []);

  const handleHorizontalPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    stopHorizontalDrag(event.pointerId);
  }, [stopHorizontalDrag]);

  const handleHorizontalPointerLeave = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    stopHorizontalDrag(event.pointerId);
  }, [stopHorizontalDrag]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    if (managerFromStage) {
      const idx = STAGES.indexOf(managerFromStage as Stage);
      if (idx >= 0) emblaApi.scrollTo(idx, true);
    }
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!managerFromStage || isMobile) return;
    const idx = STAGES.indexOf(managerFromStage as Stage);
    if (idx <= 0) return;
    const container = horizontalScrollRef.current;
    if (!container) return;
    container.scrollLeft = idx * 208;
  }, [managerFromStage, isMobile]);

  useEffect(() => {
    if (!managerFromStage) return;
    setExpandedStage(managerFromStage as Stage);
  }, []);

  const handleToggle = (stage: Stage) => {
    setExpandedStage((prev) => (prev === stage ? null : stage));
  };

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const handleStageAction = (stage: Stage) => {
    if (stage === "Lead") { navigate("/customers?new=1"); return; }
    navigate(
      stage === "Quote Sent" ? "/quote/new" : stage === "To Invoice" ? "/invoice/new" : `/job/new?stage=${encodeURIComponent(stage)}`
    );
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={scrollPrev} disabled={currentSlide === 0}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-card-foreground">{STAGES[currentSlide]}</span>
            <div className="flex gap-1.5">
              {STAGES.map((_, i) => (
                <span key={i} className={cn("w-2 h-2 rounded-full transition-all", i === currentSlide ? "bg-primary scale-125" : "bg-muted-foreground/30")} />
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={scrollNext} disabled={currentSlide === STAGES.length - 1}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {STAGES.map((stage) => (
              <div key={stage} className="flex-[0_0_90%] min-w-0 px-2 flex flex-col gap-2">
                <StageColumn stage={stage} jobs={jobsByStage(stage)} isExpanded={expandedStage === stage} onToggle={() => handleToggle(stage)} onNext={scrollNext} layout="horizontal" />
                {ACTION_BOXES[stage] && (
                  <TutorialTip tip={ACTION_TIPS[stage] || ""} side="bottom">
                    <button className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/30 py-4 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer" onClick={() => handleStageAction(stage)}>
                      <Plus className="w-5 h-5" />
                      <span className="text-xs font-medium">{ACTION_BOXES[stage]}</span>
                    </button>
                  </TutorialTip>
                )}
              </div>
            ))}
          </div>
        </div>
        {expandedStage && (
          <ExpandedStagePanel key={expandedStage} stage={expandedStage} jobs={jobsByStage(expandedStage)} onClose={() => setExpandedStage(null)} />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end mb-1">
        <TutorialTip tip="Switch how you view your pipeline" side="bottom">
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <Button variant="ghost" size="sm" onClick={() => setLayout("horizontal")}
              className={cn("h-7 px-2.5 gap-1.5 text-xs", layout === "horizontal" && "bg-primary text-primary-foreground hover:bg-primary/90")}>
              <Columns className="w-3.5 h-3.5" /> Top
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLayout("vertical")}
              className={cn("h-7 px-2.5 gap-1.5 text-xs", layout === "vertical" && "bg-primary text-primary-foreground hover:bg-primary/90")}>
              <LayoutGrid className="w-3.5 h-3.5" /> Left
            </Button>
          </div>
        </TutorialTip>
      </div>

      {layout === "horizontal" ? (
        <div className="space-y-0">
          <PipelineFlowBanner activeStage={expandedStage} />
          <div
            ref={horizontalScrollRef}
            className={cn("flex gap-2 overflow-x-auto pb-2 pt-2", !isMobile && (isDraggingHorizontal ? "cursor-grabbing select-none" : "cursor-grab"))}
            onPointerDown={handleHorizontalPointerDown}
            onPointerMove={handleHorizontalPointerMove}
            onPointerUp={handleHorizontalPointerUp}
            onPointerLeave={handleHorizontalPointerLeave}
          >
            {STAGES.map((stage) => (
              <div key={stage} className="min-w-[200px] w-[200px] flex-shrink-0 flex flex-col gap-2">
                <StageColumn stage={stage} jobs={jobsByStage(stage)} isExpanded={expandedStage === stage} onToggle={() => handleToggle(stage)} layout="horizontal" />
                {ACTION_BOXES[stage] && (
                  <TutorialTip tip={ACTION_TIPS[stage] || ""} side="bottom">
                    <button className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/30 py-4 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer" onClick={() => handleStageAction(stage)}>
                      <Plus className="w-5 h-5" />
                      <span className="text-xs font-medium">{ACTION_BOXES[stage]}</span>
                    </button>
                  </TutorialTip>
                )}
              </div>
            ))}
          </div>
          {expandedStage && (
            <ExpandedStagePanel key={expandedStage} stage={expandedStage} jobs={jobsByStage(expandedStage)} onClose={() => setExpandedStage(null)} />
          )}
        </div>
      ) : (
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 w-[240px] shrink-0 overflow-y-auto max-h-[calc(100vh-140px)]">
            {STAGES.map((stage) => (
              <StageColumn key={stage} stage={stage} jobs={jobsByStage(stage)} isExpanded={expandedStage === stage} onToggle={() => handleToggle(stage)} layout="vertical" />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            {expandedStage ? (
              <ExpandedStagePanel key={expandedStage} stage={expandedStage} jobs={jobsByStage(expandedStage)} onClose={() => setExpandedStage(null)} />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Click a stage to view jobs</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
