import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Wrench, Settings as SettingsIcon, GraduationCap, Shield, LayoutGrid, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemePicker } from "@/components/ThemePicker";
import { BackendStatus } from "@/components/BackendStatus";
import { useTutorial } from "@/contexts/TutorialContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useToolbarPosition } from "@/contexts/ToolbarPositionContext";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function LogoutButton() {
  const { user, logout, isDemo, setIsDemo } = useAuth();
  if (!user && !isDemo) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        sessionStorage.clear();
        await logout();
        setIsDemo(false);
      }}
      className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:bg-accent"
      title="Sign out"
    >
      <LogOut className="w-5 h-5" />
    </Button>
  );
}

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tutorialOn, setTutorialOn } = useTutorial();
  const { isWorkMode, isSoleTrader, isTimesheetOnlyMode, clearMode, setMode } = useAppMode();
  const isMobile = useIsMobile();
  const { position, cyclePosition } = useToolbarPosition();
  const { isDemo, setIsDemo } = useAuth();
  const { settings } = useUserSettings();
  const showAllModesForDev = import.meta.env.DEV;
  const canShowToolsMode = settings.showToolsMode || showAllModesForDev;
  const canShowEmployeeMode = settings.showEmployeeMode || showAllModesForDev;
  const canShowTimesheetMode = settings.showTimesheetMode || showAllModesForDev;
  const [showModeHint, setShowModeHint] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowModeHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="px-3 sm:px-6 py-2 sm:py-3 border-b border-border bg-background flex items-center justify-between sticky top-0 z-50 h-12">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
        {isWorkMode ? (
          <Wrench className="w-5 h-5 text-primary shrink-0" />
        ) : (
          <Shield className="w-5 h-5 text-primary shrink-0" />
        )}
        <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground/80 truncate hidden min-[360px]:block">
          {isSoleTrader ? "Toolbelt — Solo" : isTimesheetOnlyMode ? "Toolbelt — Timesheet" : isWorkMode ? "Toolbelt — Work" : "Tradie Toolbelt"}
        </h1>
        <Badge className={cn("hidden sm:inline-flex", isDemo ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/40" : "bg-green-500/20 text-green-700 border-green-500/40")}>
          {isDemo ? "Demo Mode" : "Production Mode"}
        </Badge>
      </button>
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <DropdownMenu onOpenChange={() => setShowModeHint(false)}>
          <DropdownMenuTrigger asChild>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 rounded-lg gap-1.5 text-muted-foreground hover:bg-accent",
                  showModeHint && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
                title="Mode selector"
              >
                <span className="text-xs font-medium">Mode</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
              {showModeHint && (
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded-md animate-pulse shadow-md z-50">
                  Click to change mode ↑
                </span>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setMode("manage"); navigate("/"); }}>
              Manager
            </DropdownMenuItem>
            {canShowToolsMode && (<DropdownMenuItem onClick={() => { setMode("sole-trader"); navigate("/"); }}>
              On the Tools
            </DropdownMenuItem>)}
            {canShowEmployeeMode && (
              <DropdownMenuItem onClick={() => { setTutorialOn(true); setMode("work"); navigate("/"); }}>
                Employee
              </DropdownMenuItem>
            )}
            {canShowTimesheetMode && (<DropdownMenuItem onClick={() => { setTutorialOn(false); setMode("timesheet"); navigate("/"); }}>
              Timesheet Only
            </DropdownMenuItem>)}
            <DropdownMenuItem onClick={() => { clearMode(); navigate("/"); }}>
              Main Menu
            </DropdownMenuItem>
            {isDemo && (
              <DropdownMenuItem onClick={() => { sessionStorage.clear(); clearMode(); setIsDemo(false); navigate("/"); }}>
                Sign In
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {(!isWorkMode || location.pathname.startsWith("/job/")) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cyclePosition(isWorkMode ? ["bottom"] : undefined)}
                className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:bg-accent"
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Layout: {position}</p></TooltipContent>
          </Tooltip>
        )}

        {!isWorkMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            className={cn("h-9 w-9 p-0 rounded-lg text-muted-foreground hover:bg-accent", isActive("/settings") && "bg-accent")}
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTutorialOn(!tutorialOn)}
          className={cn(
            "h-9 rounded-lg gap-1.5",
            tutorialOn
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "text-muted-foreground hover:bg-accent"
          )}
          title="Toggle tutorial mode"
        >
          <GraduationCap className="w-5 h-5" />
          {!isMobile && <span className="text-xs font-medium">Tutorial</span>}
        </Button>
        <BackendStatus />
        <ThemePicker />
        <LogoutButton />
      </div>
    </header>
  );
}
