import { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, MapPin, User, FileText, Check, Plus, Search } from "lucide-react";
import { format, addDays, startOfWeek, isToday } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DUMMY_CUSTOMERS } from "@/data/dummyCustomers";
import { DEMO_JOBS, WORK_START, WORK_END, HOUR_HEIGHT_MOBILE, formatTime } from "@/components/schedule/scheduleData";
import { DayStrip } from "@/components/schedule/DayStrip";
import { useAppMode } from "@/contexts/AppModeContext";

/* ─── Step Indicator ─── */
function StepDots({ current }: { current: number }) {
  const labels = ["Customer", "Schedule", "Confirm"];
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${n <= current ? "bg-primary" : "bg-muted"}`} />
          <span className={`text-xs ${n <= current ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {labels[n - 1]}
          </span>
          {n < 3 && <span className="text-muted-foreground/40 text-xs mx-0.5">›</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Customer Picker ─── */
function CustomerPicker({
  customer, setCustomer,
  address, setAddress,
  description, setDescription,
  isNewCustomer, setIsNewCustomer,
  requireDescription = false,
}: {
  customer: string; setCustomer: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  isNewCustomer: boolean; setIsNewCustomer: (v: boolean) => void;
  requireDescription?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return DUMMY_CUSTOMERS;
    const q = search.toLowerCase();
    return DUMMY_CUSTOMERS.filter(c =>
      c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
  }, [search]);

  const selectCustomer = (c: typeof DUMMY_CUSTOMERS[0]) => {
    setCustomer(c.name);
    setAddress(c.address);
    setSearch(c.name);
    setShowDropdown(false);
    setIsNewCustomer(false);
  };

  const switchToNew = () => {
    setIsNewCustomer(true);
    setCustomer(search);
    setAddress("");
    setShowDropdown(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Customer</Label>
        {isNewCustomer ? (
          <div className="space-y-2">
            <Input
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder="Customer name"
              className="h-12"
              autoFocus
            />
            <button
              onClick={() => { setIsNewCustomer(false); setSearch(""); }}
              className="text-xs text-primary hover:underline"
            >
              ← Search existing customers
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search customers…"
                className="h-12 pl-9"
                autoFocus
              />
            </div>
            {showDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden max-h-80 overflow-y-auto">
                <button
                  onClick={switchToNew}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-accent transition-colors border-b border-border"
                >
                  <Plus className="w-4 h-4" /> New Customer
                </button>
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full flex flex-col items-start px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.address}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                    No matches — tap "New Customer" above
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Site Address</Label>
        <Input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="e.g. 42 Queen Street, Auckland"
          className="h-12"
        />
        {!isNewCustomer && customer && (
          <p className="text-xs text-muted-foreground">Auto-filled from customer. Change if different site.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {requireDescription ? "Work done" : "Description (optional)"}</Label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={requireDescription ? "What work was completed?" : "What's the job? e.g. Replace hot water cylinder"}
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}

/* ─── Visual Schedule Grid ─── */
const GRID_HOUR_HEIGHT = 52;
const MIN_SLOTS = 2; // 1 hour minimum (2 × 30min)
const MAX_SLOTS = 20; // 10 hours max

function ScheduleGrid({
  startHour, setStartHour,
  durationSlots, setDurationSlots,
  weekStart, selectedDay, setSelectedDay,
  onPrevWeek, onNextWeek, onStartJob,
}: {
  startHour: number; setStartHour: (v: number) => void;
  durationSlots: number; setDurationSlots: (v: number) => void;
  weekStart: Date; selectedDay: number; setSelectedDay: (v: number) => void;
  onPrevWeek: () => void; onNextWeek: () => void;
  onStartJob: () => void;
}) {
  const hours = Array.from({ length: WORK_END - WORK_START }, (_, i) => WORK_START + i);
  const totalHeight = hours.length * GRID_HOUR_HEIGHT;
  const dragRef = useRef<{ startY: number; startSlots: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Existing jobs for selected day (greyed out background)
  const dayJobs = useMemo(() =>
    DEMO_JOBS.filter(j => j.dayOffset === selectedDay),
    [selectedDay]
  );

  const newJobTop = (startHour - WORK_START) * GRID_HOUR_HEIGHT;
  const newJobHeight = (durationSlots / 2) * GRID_HOUR_HEIGHT;
  const durationHours = durationSlots / 2;

  // Tap on grid to set start time
  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hourFloat = WORK_START + y / GRID_HOUR_HEIGHT;
    const snapped = Math.round(hourFloat * 2) / 2; // snap to 30min
    const clamped = Math.max(WORK_START, Math.min(snapped, WORK_END - durationHours));
    setStartHour(clamped);
  }, [durationHours, setStartHour]);

  // Drag bottom handle to resize
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = { startY: clientY, startSlots: durationSlots };

    const handleMove = (ev: TouchEvent | MouseEvent) => {
      if (!dragRef.current) return;
      const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      const dy = cy - dragRef.current.startY;
      const slotDelta = Math.round(dy / (GRID_HOUR_HEIGHT / 2));
      const newSlots = Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, dragRef.current.startSlots + slotDelta));
      // Clamp so it doesn't go past end of day
      const maxSlots = (WORK_END - startHour) * 2;
      setDurationSlots(Math.min(newSlots, maxSlots));
    };

    const handleEnd = () => {
      dragRef.current = null;
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
    };

    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
  }, [durationSlots, startHour, setDurationSlots]);

  // Track if drag happened to distinguish tap vs drag
  const didDragRef = useRef(false);

  const handleBlockDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!gridRef.current) return;
    e.stopPropagation();
    didDragRef.current = false;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = gridRef.current.getBoundingClientRect();
    const offsetInBlock = clientY - rect.top - newJobTop;

    const handleMove = (ev: TouchEvent | MouseEvent) => {
      didDragRef.current = true;
      if (!gridRef.current) return;
      const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      const rect = gridRef.current.getBoundingClientRect();
      const y = cy - rect.top - offsetInBlock;
      const hourFloat = WORK_START + y / GRID_HOUR_HEIGHT;
      const snapped = Math.round(hourFloat * 2) / 2;
      const clamped = Math.max(WORK_START, Math.min(snapped, WORK_END - durationHours));
      setStartHour(clamped);
    };

    const handleEnd = () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
    };

    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
  }, [newJobTop, durationHours, setStartHour]);

  return (
    <div className="space-y-3">
      <DayStrip
        weekStart={weekStart}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
      />

      {/* Time info */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-foreground">
          {formatTime(startHour)} – {formatTime(startHour + durationHours)}
        </span>
        <span className="text-xs text-muted-foreground">
          {durationHours}h · Drag to adjust
        </span>
      </div>

      {/* Grid */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div
          className="grid grid-cols-[40px_1fr] overflow-y-auto max-h-[400px]"
          style={{ height: totalHeight }}
        >
          {/* Time labels */}
          <div className="relative bg-muted/30">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute right-1 text-[10px] text-muted-foreground font-medium"
                style={{ top: i * GRID_HOUR_HEIGHT - 6 }}
              >
                {formatTime(h)}
              </div>
            ))}
          </div>

          {/* Day column */}
          <div
            ref={gridRef}
            className="relative border-l border-border cursor-pointer"
            onClick={handleGridClick}
          >
            {/* Hour lines */}
            {hours.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-border/40"
                style={{ top: i * GRID_HOUR_HEIGHT }}
              />
            ))}

            {/* Existing jobs (greyed out) */}
            {dayJobs.map(job => {
              const top = (job.startHour - WORK_START) * GRID_HOUR_HEIGHT;
              const height = job.durationHours * GRID_HOUR_HEIGHT;
              return (
                <div
                  key={job.id}
                  className="absolute left-1 right-1 rounded-md bg-muted/60 border border-border/50 px-2 py-1 pointer-events-none"
                  style={{ top: top + 1, height: height - 2 }}
                >
                  <span className="text-[10px] text-muted-foreground font-medium truncate block">
                    {job.jobName}
                  </span>
                  <span className="text-[9px] text-muted-foreground/70 truncate block">
                    {job.client}
                  </span>
                </div>
              );
            })}

            {/* New job block (draggable + tappable) */}
            <div
              className="absolute left-1 right-1 rounded-lg bg-primary/20 border-2 border-primary shadow-md cursor-grab active:cursor-grabbing z-10"
              style={{ top: newJobTop + 1, height: newJobHeight - 2 }}
              onClick={e => { e.stopPropagation(); if (!didDragRef.current) onStartJob(); }}
              onTouchStart={handleBlockDragStart}
              onMouseDown={handleBlockDragStart}
            >
              <div className="px-2 py-1">
                <span className="text-xs font-semibold text-primary block">New Job</span>
                <span className="text-[10px] text-primary/70">
                  {formatTime(startHour)} – {formatTime(startHour + durationHours)}
                </span>
                <span className="text-[10px] text-primary/60 block mt-0.5">Tap to start →</span>
              </div>
              {/* Bottom drag handle */}
              <div
                className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center cursor-s-resize"
                onTouchStart={handleDragStart}
                onMouseDown={handleDragStart}
              >
                <div className="w-10 h-1 rounded-full bg-primary/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function WorkNewJob() {
  const navigate = useNavigate();
  const { isIntroMode } = useAppMode();
  const [step, setStep] = useState(1);

  // Step 1
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // Step 2
  const now = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now, { weekStartsOn: 1 }));
  const todayOffset = Math.min(4, Math.max(0, now.getDay() - 1));
  const [selectedDay, setSelectedDay] = useState(todayOffset);
  const [startHour, setStartHour] = useState(8);
  const [durationSlots, setDurationSlots] = useState(2); // 2 slots = 1 hour

  const durationHours = durationSlots / 2;
  const scheduledDate = addDays(weekStart, selectedDay);

  const detailsValid = customer.trim() && address.trim();
  const introDetailsValid = detailsValid && description.trim();

  const jobState = { customer, address, description };

  const handleConfirm = () => {
    toast({
      title: "Job Created & Scheduled ✅",
      description: `${customer} — ${format(scheduledDate, "EEE d MMM")} at ${formatTime(startHour)}`,
      duration: 3000,
    });
    navigate("/job/TB-NEW", { state: jobState });
  };

  const handleStartNow = () => {
    toast({
      title: "Job Started ✅",
      description: `${customer} — starting now`,
      duration: 3000,
    });
    navigate("/job/TB-NEW", { state: jobState });
  };

  const handleIntroComplete = () => {
    toast({
      title: "Job ready for invoice ✅",
      description: `${customer} — work done captured, ready to invoice`,
      duration: 3000,
    });
    navigate("/job/TB-NEW?resumeCompletion=true", { state: { ...jobState, introQuickClose: true } });
  };

  return (
    <div className="px-3 sm:px-6 py-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">{isIntroMode ? "Job Ready to Invoice" : "New Job"}</h1>
        </div>
        {!isIntroMode && <StepDots current={step} />}
      </div>

      {isIntroMode && (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-card-foreground">Work done</h2>
          <CustomerPicker
            customer={customer} setCustomer={setCustomer}
            address={address} setAddress={setAddress}
            description={description} setDescription={setDescription}
            isNewCustomer={isNewCustomer} setIsNewCustomer={setIsNewCustomer}
            requireDescription
          />
          <Button className="w-full h-12 gap-2" disabled={!introDetailsValid} onClick={handleIntroComplete}>
            <Check className="w-4 h-4" /> Job Ready to Invoice
          </Button>
        </div>
      )}

      {/* Step 1: Customer */}
      {!isIntroMode && step === 1 && (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-card-foreground">Who's the job for?</h2>
          <CustomerPicker
            customer={customer} setCustomer={setCustomer}
            address={address} setAddress={setAddress}
            description={description} setDescription={setDescription}
            isNewCustomer={isNewCustomer} setIsNewCustomer={setIsNewCustomer}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12 gap-2" disabled={!detailsValid} onClick={handleStartNow}>
              <Check className="w-4 h-4" /> Start Now
            </Button>
            <Button className="flex-1 h-12 gap-2" disabled={!detailsValid} onClick={() => setStep(2)}>
              Schedule <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Schedule */}
      {!isIntroMode && step === 2 && (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-card-foreground">When?</h2>
          <ScheduleGrid
            startHour={startHour} setStartHour={setStartHour}
            durationSlots={durationSlots} setDurationSlots={setDurationSlots}
            weekStart={weekStart} selectedDay={selectedDay} setSelectedDay={setSelectedDay}
            onPrevWeek={() => setWeekStart(d => addDays(d, -7))}
            onNextWeek={() => setWeekStart(d => addDays(d, 7))}
            onStartJob={handleConfirm}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12 gap-2" onClick={() => setStep(3)}>
              Review <ArrowRight className="w-4 h-4" />
            </Button>
            <Button className="flex-1 h-12 gap-2" onClick={handleConfirm}>
              <Check className="w-4 h-4" /> Start Job
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {!isIntroMode && step === 3 && (
        <div className="space-y-5">
          <h2 className="text-base font-semibold text-card-foreground">Confirm & Start</h2>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-card-foreground">{customer}</div>
                <div className="text-xs text-muted-foreground">{address}</div>
              </div>
            </div>
            {description && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">{description}</div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm text-card-foreground">
                {format(scheduledDate, "EEEE, d MMMM")} · {formatTime(startHour)} – {formatTime(startHour + durationHours)} ({durationHours}h)
              </div>
            </div>
          </div>

          <Button className="w-full h-12 gap-2" onClick={handleConfirm}>
            <Check className="w-4 h-4" /> Start Job
          </Button>
        </div>
      )}
    </div>
  );
}
