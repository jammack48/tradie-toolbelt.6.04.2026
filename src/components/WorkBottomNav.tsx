import { useNavigate, useLocation } from "react-router-dom";
import { Home, StickyNote, MessageCircle, FolderOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { INITIAL_NOTES } from "@/data/dummyTeamChat";
import { useAppMode } from "@/contexts/AppModeContext";

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
  { id: "home", icon: Home, label: "Jobs", path: "/" },
  { id: "time", icon: Clock, label: "Timesheet", path: "/timesheet" },
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
  const urgentCount = getUrgentCount();
  const items = isTimesheetOnlyMode ? TIMESHEET_NAV_ITEMS : isIntroMode ? INTRO_NAV_ITEMS : NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-14">
        {items.map((item) => {
          const active = item.path ? location.pathname === item.path : false;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.path) navigate(item.path);
              }}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors",
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
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
