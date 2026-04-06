import { useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppMode } from "@/contexts/AppModeContext";
import { startOfWeek, addWeeks, subWeeks, format, addDays } from "date-fns";
import { CalendarDays, X, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageToolbar } from "@/components/PageToolbar";
import { StaffFilterBar } from "@/components/schedule/StaffFilterBar";
import { DayStrip } from "@/components/schedule/DayStrip";
import { DayViewToggle } from "@/components/schedule/DayViewToggle";
import { TimeGrid3Day } from "@/components/schedule/TimeGrid3Day";
import { generateWeekJobs, formatTime } from "@/components/schedule/scheduleData";
import { SCHEDULE_EXTRAS, handleCommonTab } from "@/config/toolbarTabs";
import { Button } from "@/components/ui/button";
import { getJobDetail } from "@/data/dummyJobDetails";
import { cn } from "@/lib/utils";

const SchedulePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { trade } = useAppMode();
  const isMobile = useIsMobile();
  const returnJobId = searchParams.get("returnJob");

  const returnBookingJob = useMemo(() => {
    if (!returnJobId) return null;
    const qpName = searchParams.get("returnJobName");
    const qpClient = searchParams.get("returnClient");
    const qpAddress = searchParams.get("returnAddress");
    if (qpName) {
      return { jobName: qpName, client: qpClient || "Customer", address: qpAddress || "" };
    }
    const detail = getJobDetail(returnJobId);
    if (detail) return { jobName: detail.jobName, client: detail.client, address: detail.address };
    return { jobName: returnJobId, client: "Customer", address: "" };
  }, [returnJobId, searchParams]);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [viewDays, setViewDays] = useState<1 | 3 | 5>(5);
  const isBookingMode = !!returnJobId;
  const [selectedStaff, setSelectedStaff] = useState<string[]>(isBookingMode ? ["Dave"] : []);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 6 ? diff : 0;
  });

  const [bookedSlot, setBookedSlot] = useState<{ dayOffset: number; startHour: number } | null>(null);
  const [returnDuration, setReturnDuration] = useState(2);

  const selectedDate = addDays(weekStart, selectedDay);

  const visibleDates = useMemo(() => {
    if (viewDays === 1) return [selectedDate];
    const offset = Math.floor(viewDays / 2);
    return Array.from({ length: viewDays }, (_, i) => addDays(selectedDate, i - offset));
  }, [selectedDate, viewDays]);

  const weekJobs = useMemo(() => generateWeekJobs(weekStart, trade), [weekStart, trade]);

  const allJobs = useMemo(() => {
    const base = [...weekJobs];
    if (bookedSlot && returnBookingJob) {
      base.push({
        id: `${returnJobId}-return`,
        jobName: `↩ ${returnBookingJob.jobName}`,
        client: returnBookingJob.client,
        assignedTo: "Dave",
        dayOffset: bookedSlot.dayOffset,
        startHour: bookedSlot.startHour,
        durationHours: returnDuration,
        address: returnBookingJob.address,
        status: "Scheduled",
      });
    }
    return base;
  }, [bookedSlot, returnBookingJob, returnJobId, weekJobs]);

  const filteredJobs = useMemo(() => {
    if (selectedStaff.length === 0) return allJobs;
    return allJobs.filter((j) => selectedStaff.includes(j.assignedTo));
  }, [selectedStaff, allJobs]);

  const weekEnd = addDays(weekStart, 6);

  const handleSlotClick = useCallback((dayOffset: number, hour: number) => {
    if (!returnJobId) return;
    setBookedSlot({ dayOffset, startHour: hour });
  }, [returnJobId]);

  const handleConfirmBooking = () => {
    if (!bookedSlot || !returnBookingJob || !returnJobId) return;
    const dayDate = addDays(weekStart, bookedSlot.dayOffset);
    const dateStr = format(dayDate, "EEE d MMM");
    const timeStr = formatTime(bookedSlot.startHour);
    navigate(`/job/${returnJobId}?returnBooked=true&returnDate=${encodeURIComponent(dateStr)}&returnTime=${encodeURIComponent(timeStr)}&resumeCompletion=true`, { replace: true });
  };

  const handleCancelReturn = () => {
    navigate(-1);
  };

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

  const handleTabChange = (id: string) => {
    if (id === "back") { navigate("/"); return; }
    if (id === "pipeline") { navigate("/"); return; }
    handleCommonTab(id, navigate);
  };

  return (
    <PageToolbar
      tabs={SCHEDULE_EXTRAS}
      activeTab="schedule"
      onTabChange={handleTabChange}
      pageHeading={
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-card-foreground font-bold text-base">
            {returnBookingJob
              ? `Book Return · ${returnBookingJob.jobName}`
              : `Schedule · ${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")}`
            }
          </span>
        </div>
      }
    >
      {/* Return job banner */}
      {returnJobId && (
        <div className="rounded-lg border-2 border-primary/50 bg-primary/10 p-3 mb-3 space-y-2">
          <div className="flex items-start gap-2">
            <CalendarDays className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-card-foreground">
                Booking return visit for {returnBookingJob?.jobName || returnJobId}
              </p>
              <p className="text-xs text-muted-foreground">
                {bookedSlot
                  ? `Selected: ${format(addDays(weekStart, bookedSlot.dayOffset), "EEE d MMM")} at ${formatTime(bookedSlot.startHour)} · ${returnDuration}h`
                  : "Tap an empty time slot to book"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-7 flex-wrap">
            <span className="text-xs font-medium text-card-foreground">Hours:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                <Button
                  key={h}
                  size="sm"
                  variant={returnDuration === h ? "default" : "outline"}
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => setReturnDuration(h)}
                >
                  {h}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pl-7">
            {bookedSlot && (
              <Button size="sm" className="h-8 gap-1.5" onClick={handleConfirmBooking}>
                <Check className="w-3.5 h-3.5" /> Confirm
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleCancelReturn}>
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
          </div>
        </div>
      )}

      <div className={cn(
        "flex flex-col",
        isMobile && "overflow-x-hidden",
        isMobile && (returnJobId
          ? "h-[calc(100dvh-48px-44px-52px-80px)]"
          : "h-[calc(100dvh-48px-44px-52px)]")
      )}>
        <div className="shrink-0 space-y-3">
          <div className="flex items-center justify-between">
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
          {!isBookingMode && <StaffFilterBar selectedStaff={selectedStaff} onSelectionChange={setSelectedStaff} />}
        </div>
        <div className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden mt-3",
          isMobile && "px-0"
        )}>
          <TimeGrid3Day
            dates={visibleDates}
            jobs={filteredJobs}
            selectedDate={selectedDate}
            onSwipe={handleSwipe}
            onSlotClick={returnJobId ? handleSlotClick : undefined}
            activeSlot={bookedSlot}
            activeDuration={returnDuration}
          />
        </div>
      </div>
    </PageToolbar>
  );
};

export default SchedulePage;
