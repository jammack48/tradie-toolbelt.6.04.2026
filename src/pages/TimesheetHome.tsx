import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { startOfWeek, addWeeks, subWeeks, addDays, format, isToday } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { DayStrip } from "@/components/schedule/DayStrip";
import { DayViewToggle } from "@/components/schedule/DayViewToggle";
import { TimeGrid3Day } from "@/components/schedule/TimeGrid3Day";
import { cn } from "@/lib/utils";
import { useDemoData } from "@/contexts/DemoDataContext";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import { parseBusinessProfile, toolsGreetingLabel } from "@/lib/businessProfile";

export default function TimesheetHome() {
  const isMobile = useIsMobile();
  const { usingProdData } = useDemoData();
  const { settings } = useUserSettings();
  const greeting = toolsGreetingLabel(parseBusinessProfile(settings?.business_profile));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewDays, setViewDays] = useState<1 | 3 | 5>(3);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 6 ? diff : 0;
  });

  const selectedDate = addDays(weekStart, selectedDay);

  const visibleDates = useMemo(() => {
    if (viewDays === 1) return [selectedDate];
    const offset = Math.floor(viewDays / 2);
    return Array.from({ length: viewDays }, (_, i) => addDays(selectedDate, i - offset));
  }, [selectedDate, viewDays]);

  const handleSwipe = (dir: "left" | "right") => {
    const delta = dir === "right" ? 1 : -1;
    const newSelected = selectedDay + delta;
    if (newSelected > 6) {
      setWeekStart(addWeeks(weekStart, 1));
      setSelectedDay(newSelected - 7);
    } else if (newSelected < 0) {
      setWeekStart(subWeeks(weekStart, 1));
      setSelectedDay(newSelected + 7);
    } else {
      setSelectedDay(newSelected);
    }
  };

  return (
    <div className={cn(
      "max-w-5xl mx-auto flex flex-col",
      isMobile ? "h-[calc(100dvh-48px-56px)] overflow-x-hidden" : "px-6 py-4 space-y-3 pb-24"
    )}>
      <div className={cn("shrink-0 space-y-3", isMobile ? "px-3 pt-4" : "")}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">G&apos;day, {greeting} 👋</h2>
            <p className="text-sm text-muted-foreground">
              {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM")}
              {isToday(selectedDate) ? " — Today" : ""}
            </p>
          </div>
          <DayViewToggle value={viewDays} onChange={setViewDays} />
        </div>

        <DayStrip
          weekStart={weekStart}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onPrevWeek={() => setWeekStart(subWeeks(weekStart, 1))}
          onNextWeek={() => setWeekStart(addWeeks(weekStart, 1))}
          onJumpToToday={() => {
            const today = new Date();
            setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
            const diff = Math.min(6, Math.max(0, today.getDay() === 0 ? 6 : today.getDay() - 1));
            setSelectedDay(diff);
          }}
        />
      </div>

      <div className={cn(
        isMobile ? "flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 mt-3" : ""
      )}>
        <TimeGrid3Day
          dates={visibleDates}
          jobs={usingProdData ? [] : undefined}
          staffFilter={usingProdData ? undefined : "Dave"}
          selectedDate={selectedDate}
          onSwipe={handleSwipe}
        />
      </div>
    </div>
  );
}
