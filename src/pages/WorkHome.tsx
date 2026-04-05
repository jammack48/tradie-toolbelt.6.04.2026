import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { startOfWeek, addWeeks, subWeeks, addDays, format, isToday } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { DayStrip } from "@/components/schedule/DayStrip";
import { DayViewToggle } from "@/components/schedule/DayViewToggle";
import { TimeGrid3Day } from "@/components/schedule/TimeGrid3Day";
import { generateWeekJobs } from "@/components/schedule/scheduleData";
import { Package, ChevronUp, ChevronDown, Plus, Wrench, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getJobDetail } from "@/data/dummyJobDetails";
import { cn } from "@/lib/utils";
import { TutorialBanner } from "@/components/TutorialBanner";
import { useAppMode } from "@/contexts/AppModeContext";
import { useUserSettings } from "@/contexts/UserSettingsContext";

const CURRENT_STAFF = "Dave";

export default function WorkHome() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { mode } = useAppMode();
  const { settings } = useUserSettings();
  const [fabOpen, setFabOpen] = useState(false);
  const showQuoteOption = mode === "sole-trader" || mode === "manage" || settings.employeeCanQuote;
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewDays, setViewDays] = useState<1 | 3 | 5>(3);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 6 ? diff : 0;
  });

  const selectedDate = addDays(weekStart, selectedDay);

  // Build visible dates array from selectedDate
  const visibleDates = useMemo(() => {
    if (viewDays === 1) return [selectedDate];
    // Center the window: for 3 days show selected ± 1, for 5 show selected ± 2
    const offset = Math.floor(viewDays / 2);
    return Array.from({ length: viewDays }, (_, i) => addDays(selectedDate, i - offset));
  }, [selectedDate, viewDays]);

  // Filter to only current staff's jobs
  const weekJobs = useMemo(() => generateWeekJobs(weekStart), [weekStart]);
  const myJobs = useMemo(
    () => weekJobs.filter((j) => j.assignedTo === CURRENT_STAFF),
    [weekJobs]
  );

  // Materials for selected day
  const dayJobs = useMemo(() => myJobs.filter((j) => j.dayOffset === selectedDay), [myJobs, selectedDay]);
  const materialsNeeded = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; unit: string }>();
    dayJobs.forEach((sj) => {
      const detail = getJobDetail(sj.id);
      detail?.materials.forEach((m) => {
        const ex = map.get(m.name);
        if (ex) ex.qty += m.quantity;
        else map.set(m.name, { name: m.name, qty: m.quantity, unit: m.unit });
      });
    });
    return Array.from(map.values());
  }, [dayJobs]);

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
      <TutorialBanner overrideKey="work-home" />
      {/* Fixed controls section */}
      <div className={cn("shrink-0 space-y-3", isMobile ? "px-3 pt-4" : "") }>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">G'day, {CURRENT_STAFF} 👋</h2>
            <p className="text-sm text-muted-foreground">
              {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM")}
              {isToday(selectedDate) ? " — Today" : ""}
            </p>
          </div>
          <DayViewToggle value={viewDays} onChange={setViewDays} />
        </div>

        {/* Day strip */}
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

        {/* Materials pickup list */}
        {materialsNeeded.length > 0 && (
          <Collapsible open={materialsOpen} onOpenChange={setMaterialsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-2.5 px-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Pickup List ({materialsNeeded.length} items)</span>
                </div>
                {materialsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-1.5 border-dashed">
                <CardContent className="p-3">
                  <div className="space-y-1.5">
                    {materialsNeeded.map((m) => (
                      <div key={m.name} className="flex items-center justify-between text-sm">
                        <span className="text-card-foreground">{m.name}</span>
                        <span className="text-muted-foreground font-mono text-xs">{m.qty} {m.unit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Scrollable time grid */}
      <div className={cn(
        isMobile ? "flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 mt-3" : ""
      )}>
        <TimeGrid3Day
          dates={visibleDates}
          staffFilter={CURRENT_STAFF}
          selectedDate={selectedDate}
          onSwipe={handleSwipe}
        />
      </div>

      {/* Floating New Job button */}
      <Popover open={fabOpen} onOpenChange={setFabOpen}>
        <PopoverTrigger asChild>
          <button
            className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-48 p-1.5">
          <button
            onClick={() => { setFabOpen(false); navigate("/new-job"); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Wrench className="w-4 h-4 text-primary" /> Charge Up
          </button>
          {showQuoteOption && (
            <button
              onClick={() => { setFabOpen(false); navigate("/quote/new"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <FileText className="w-4 h-4 text-primary" /> New Quote
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
