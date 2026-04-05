import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToolbarPosition } from "@/contexts/ToolbarPositionContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { sidebarTooltips } from "@/data/tutorialContent";
import { TutorialBanner } from "@/components/TutorialBanner";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface TabDef {
  id: string;
  label: string;
  icon: React.ElementType;
}

/** Tab IDs that show a notification red dot */
const BADGE_TABS = new Set(["messages", "sequences"]);

interface PageToolbarProps {
  tabs: TabDef[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
  pageHeading?: React.ReactNode;
  /** ID of the common-nav tab to highlight for the current page (e.g. "customers") */
  currentPage?: string;
  /** Tabs to call out visually (e.g. existing variations). */
  highlightedTabs?: string[];
  /** Override tutorial key (e.g. "manager" when showing manager mode on pipeline route) */
  tutorialKey?: string;
}

export function PageToolbar({ tabs, activeTab, onTabChange, children, pageHeading, currentPage, highlightedTabs = [], tutorialKey }: PageToolbarProps) {
  const isMobile = useIsMobile();
  const { position: rawPosition } = useToolbarPosition();
  const { isWorkMode } = useAppMode();
  // Force top position in Work mode to avoid overlap with WorkBottomNav
  const position = isWorkMode && rawPosition === "bottom" ? "top" : rawPosition;
  const { tutorialOn } = useTutorial();

  const tutorialBanner = tutorialOn ? <TutorialBanner overrideKey={tutorialKey} tabKey={activeTab} /> : null;
  const isActive = (id: string) => activeTab === id || currentPage === id;

  const isManager = (id: string) => id === "manager";
  const isHighlighted = (id: string) => highlightedTabs.includes(id);
  const highlightClass = "ring-1 ring-blue-400/70 bg-blue-500/15 text-blue-100 shadow-[0_0_14px_hsl(210_90%_60%/0.35)]";
  const managerInactive = "bg-blue-500/15 text-blue-500 shadow-[0_0_12px_2px_hsl(215_80%_55%/0.25)] animate-glow-ping-subtle";
  const managerActive = "bg-blue-500 text-white shadow-[0_0_16px_4px_hsl(215_80%_55%/0.35)]";

  const headingBar = pageHeading ? (
    <div className={cn(
      "px-4 sm:px-6 py-2 border-b border-border bg-background sticky z-30",
      isMobile ? "top-[48px]" : "top-0"
    )}>
      {pageHeading}
    </div>
  ) : null;

  const isVertical = position === "left" || position === "right";
  const isHorizontal = position === "top" || position === "bottom";


  // Desktop vertical sidebar
  if (!isMobile && isVertical) {
    return (
      <div className={cn("flex flex-row", position === "right" && "flex-row-reverse")}>
        <nav className={cn(
          "w-[200px] shrink-0 flex flex-col gap-1 py-2 px-2 bg-card sticky top-[48px] h-[calc(100vh-48px)] overflow-y-auto",
          position === "left" ? "rounded-r-xl border-r border-border" : "rounded-l-xl border-l border-border"
        )}>
          
          {tabs.map(({ id, label, icon: Icon }) => {
            const tip = tutorialOn ? sidebarTooltips[id] : undefined;
            const btn = (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left min-h-[48px]",
                  isManager(id)
                    ? (isActive(id) ? managerActive : managerInactive)
                    : isActive(id)
                      ? "bg-primary text-primary-foreground"
                      : isHighlighted(id) ? highlightClass : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="w-6 h-6 shrink-0" />
                  {BADGE_TABS.has(id) && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />}
                </span>
                {label}
              </button>
            );
            if (tip) {
              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side={position === "left" ? "right" : "left"}>
                    <p className="text-xs">{tip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>
        <main className="flex-1 min-w-0">
          {headingBar}
          {tutorialBanner}
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    );
  }

  // Desktop horizontal bar
  if (!isMobile && isHorizontal) {
    const bar = (
      <nav className="flex items-center gap-1 px-2 py-1.5 border-b border-border overflow-x-auto sticky top-[48px] z-40 bg-card">
        
        {tabs.map(({ id, label, icon: Icon }) => {
          const tip = tutorialOn ? sidebarTooltips[id] : undefined;
          const btn = (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                isManager(id)
                  ? (isActive(id) ? managerActive : managerInactive)
                  : isActive(id)
                    ? "bg-primary text-primary-foreground"
                    : isHighlighted(id) ? highlightClass : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="relative">
                <Icon className="w-4 h-4 shrink-0" />
                {BADGE_TABS.has(id) && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />}
              </span>
              {label}
            </button>
          );
          if (tip) {
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side={position === "top" ? "bottom" : "top"}>
                  <p className="text-xs">{tip}</p>
                </TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </nav>
    );

    return (
      <div className="flex flex-col">
        {position === "top" && bar}
        {headingBar}
        <main className="flex-1 min-w-0">
          {tutorialBanner}
          <div className="p-4 sm:p-6">{children}</div>
        </main>
        {position === "bottom" && bar}
      </div>
    );
  }

  // ── Mobile ──

  // Mobile vertical (left / right)
  if (isVertical) {
    return (
      <div className="flex flex-row min-h-screen" style={position === "right" ? { flexDirection: "row-reverse" } : undefined}>
        <nav
          className={cn(
            "w-16 shrink-0 flex flex-col items-center gap-1 py-2 bg-card overflow-y-auto fixed top-[48px] bottom-0 z-40",
            position === "left" ? "left-0 rounded-r-xl border-r border-border" : "right-0 rounded-l-xl border-l border-border"
          )}
        >
          
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "flex flex-col items-center justify-center w-14 min-h-[52px] rounded-lg transition-colors shrink-0 gap-0.5 px-0.5",
                isManager(id)
                  ? (isActive(id) ? managerActive : managerInactive)
                  : isActive(id)
                    ? "bg-primary text-primary-foreground"
                    : isHighlighted(id) ? highlightClass : "text-foreground/70 hover:bg-accent"
              )}
              title={label}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {BADGE_TABS.has(id) && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />}
              </span>
              <span className="text-[9px] font-medium leading-none truncate w-full text-center">{label}</span>
            </button>
          ))}
        </nav>
        <main className={cn("flex-1 min-w-0", position === "left" ? "ml-16" : "mr-16")}>
          {headingBar}
          {tutorialBanner}
          <div className="p-4 overflow-x-hidden">{children}</div>
        </main>
      </div>
    );
  }

  // Mobile horizontal (top / bottom)
  const bar = (
    <nav
      className={cn(
        "bg-card flex items-center px-1 py-1 overflow-x-auto gap-0.5",
        position === "bottom" ? "fixed left-0 right-0 bottom-0 z-40 border-t border-border safe-area-pb pb-[env(safe-area-inset-bottom)]" : "sticky top-[48px] z-40 border-b border-border"
      )}
    >
      
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            "flex flex-col items-center justify-center min-w-[48px] min-h-[52px] rounded-lg transition-colors gap-0.5 shrink-0 px-1",
            isManager(id)
              ? (isActive(id) ? managerActive : managerInactive)
              : isActive(id)
                ? "bg-primary text-primary-foreground"
                : isHighlighted(id) ? highlightClass : "text-muted-foreground hover:bg-accent"
          )}
        >
          <span className="relative">
            <Icon className="w-5 h-5" />
            {BADGE_TABS.has(id) && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />}
          </span>
          <span className="text-[9px] font-medium leading-none">{label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="flex flex-col">
      {position === "top" && bar}
      {headingBar}
      <main
        className={cn(
          "flex-1 min-w-0",
          position === "bottom" && "pb-24"
        )}
      >
        {tutorialBanner}
        <div className="p-4">{children}</div>
      </main>
      {position === "bottom" && bar}
    </div>
  );
}
