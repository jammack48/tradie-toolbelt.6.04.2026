import { useNavigate, useLocation } from "react-router-dom";
import { Home, StickyNote, MessageCircle, FolderOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { INITIAL_NOTES } from "@/data/dummyTeamChat";
import { useAppMode } from "@/contexts/AppModeContext";
import { useToolbarPosition } from "@/contexts/ToolbarPositionContext";

const NAV_ITEMS = [
  { id: "home", icon: Home, label: "Schedule", path: "/" },
  { id: "notes", icon: StickyNote, label: "Notes", path: "/work-notes" },
  { id: "time", icon: Clock, label: "Timesheet", path: "/timesheet" },
  { id: "chat", icon: MessageCircle, label: "Chat", path: "/work-chat" },
  { id: "hub", icon: FolderOpen, label: "Hub", path: "/work-hub" },
];

const TIMESHEET_NAV_ITEMS = [
  { id: "home", icon: Home, label: "My Week", path: "/" },
  { id: "time", icon: Clock, label: "Timesheet", path: "/timesheet" },
];

const INTRO_NAV_ITEMS = [
  { id: "home", icon: Home, label: "Home", path: "/" },
  { id: "invoices", icon: FolderOpen, label: "Invoices", path: "/intro-invoices" },
];

// Count urgent alerts assigned to current user (Dave)
const getUrgentCount = () =>
  INITIAL_NOTES.filter(
    (n) => n.assignedTo === "Dave" && n.alertType === "alert" && n.priority === "urgent"
  ).length;

export function WorkBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTimesheetOnlyMode, isIntroMode } = useAppMode();
  const { position } = useToolbarPosition();
  const urgentCount = getUrgentCount();
  const items = isTimesheetOnlyMode ? TIMESHEET_NAV_ITEMS : isIntroMode ? INTRO_NAV_ITEMS : NAV_ITEMS;
  const isVertical = position === "left" || position === "right";

  return (
    <nav
      className={cn(
        "z-50 border-border bg-background/95 backdrop-blur-sm",
        isVertical
          ? "fixed top-12 bottom-0 w-16 border-r"
          : "fixed left-0 right-0 h-14 border-t safe-area-bottom",
        position === "left" && "left-0",
        position === "right" && "right-0 border-r-0 border-l",
        position === "top" && "top-12",
        position === "bottom" && "bottom-0"
      )}
    >
      <div
        className={cn(
          "max-w-lg",
          isVertical
            ? "h-full w-full flex flex-col items-center gap-1 py-2"
            : "h-14 mx-auto flex items-center justify-around"
        )}
      >
        {items.map((item) => {
          const active = item.path ? location.pathname === item.path : false;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.path) navigate(item.path);
              }}
              className={cn(
                "rounded-lg transition-colors",
                isVertical
                  ? "flex flex-col items-center justify-center w-14 min-h-[52px] gap-0.5 px-0.5"
                  : "flex flex-col items-center gap-0.5 px-3 py-1",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.id === "notes" && urgentCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 animate-pulse">
                    {urgentCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
