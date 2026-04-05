import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { TutorialTip } from "@/components/TutorialTip";
import { useDemoData } from "@/contexts/DemoDataContext";
import { PageToolbar } from "@/components/PageToolbar";
import { buildTabs, PIPELINE_EXTRAS, handleCommonTab } from "@/config/toolbarTabs";
import { ManagerMode } from "@/components/ManagerMode";
import { UnreadInbox } from "@/components/UnreadInbox";
import ServicingPage from "@/pages/ServicingPage";
import { SimplePipeline } from "@/components/SimplePipeline";
import { AdvancedPipeline } from "@/components/AdvancedPipeline";

type PipelineMode = "simple" | "advanced";
type HomeView = "pipeline" | "customers" | "quotes" | "invoices" | "settings" | "manager" | "servicing";

const HOME_TABS = buildTabs(...PIPELINE_EXTRAS);

function getPipelineMode(): PipelineMode {
  const stored = localStorage.getItem("pipeline-mode");
  return stored === "simple" ? "simple" : "advanced";
}

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const managerState = location.state as { fromManager?: boolean; stage?: string; priority?: string; slideIndex?: number; fromStage?: string } | null;
  const { jobs } = useDemoData();

  const [activeView, setActiveView] = useState<HomeView>(managerState?.fromManager ? "manager" : "pipeline");
  const [inboxOpen, setInboxOpen] = useState(false);
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>(getPipelineMode);
  const isMobile = useIsMobile();

  useEffect(() => {
    localStorage.setItem("pipeline-mode", pipelineMode);
  }, [pipelineMode]);

  const handleTabChange = (id: string) => {
    if (id === "pipeline" || id === "servicing") { setActiveView(id); return; }
    if (handleCommonTab(id, navigate)) return;
    setActiveView(id as HomeView);
  };

  return (
    <PageToolbar
      tabs={HOME_TABS}
      activeTab={activeView}
      onTabChange={handleTabChange}
      tutorialKey={activeView === "manager" ? "manager" : "pipeline"}
      pageHeading={activeView === "manager" ? (
        <span className="text-base font-bold text-card-foreground">Manager Mode</span>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-card-foreground font-bold text-base">Pipeline</span>
            <TutorialTip tip="Check for new messages from customers" side="bottom">
              <span>
                <Popover open={inboxOpen} onOpenChange={setInboxOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 relative">
                      <Bell className={cn("w-3.5 h-3.5", jobs.some(j => j.hasUnread) && "animate-bell-ring text-primary")} />
                      {jobs.some(j => j.hasUnread) && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                          <span className="animate-glow-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-0 shadow-none" align="start">
                    <UnreadInbox onClose={() => setInboxOpen(false)} />
                  </PopoverContent>
                </Popover>
              </span>
            </TutorialTip>
          </div>
          {/* Simple / Advanced toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPipelineMode("simple")}
              className={cn(
                "h-7 px-3 text-xs font-bold rounded-full transition-all",
                pipelineMode === "simple"
                  ? "bg-[hsl(var(--status-green))] text-white shadow-md"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              Simple
            </button>
            <button
              onClick={() => setPipelineMode("advanced")}
              className={cn(
                "h-7 px-3 text-xs font-bold rounded-full transition-all",
                pipelineMode === "advanced"
                  ? "bg-[hsl(var(--status-green))] text-white shadow-md"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              Advanced
            </button>
          </div>
        </div>
      )}
    >
      {activeView === "servicing" ? (
        <ServicingPage />
      ) : activeView === "manager" ? (
        <ManagerMode
          initialStage={managerState?.stage as any}
          initialPriority={managerState?.priority as any}
          initialIndex={managerState?.slideIndex}
        />
      ) : pipelineMode === "simple" ? (
        <SimplePipeline />
      ) : (
        <AdvancedPipeline managerFromStage={managerState?.fromStage} />
      )}
    </PageToolbar>
  );
};

export default Index;
