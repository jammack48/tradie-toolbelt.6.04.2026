import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, ClipboardCheck, Pause, Play, Square, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DEMO_JOBS, generateWeekJobs } from "@/components/schedule/scheduleData";
import { useJobPrefix } from "@/contexts/JobPrefixContext";
import { formatJobNumber } from "@/lib/jobNumber";
import { startOfWeek } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useAppMode } from "@/contexts/AppModeContext";

const OPTIONAL_FORMS = ["Site induction", "Take 5", "Compliance checklist"];

export default function TimesheetOnlyJobCard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prefix } = useJobPrefix();
  const { trade } = useAppMode();

  const job = useMemo(() => {
    if (!id) return undefined;

    const fromDemo = DEMO_JOBS.find((item) => item.id === id);
    if (fromDemo) return fromDemo;

    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return generateWeekJobs(currentWeekStart, trade).find((item) => item.id === id);
  }, [id, trade]);

  const [timerRunning, setTimerRunning] = useState(false);
  const [breakOn, setBreakOn] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualHours, setManualHours] = useState("");
  const [notes, setNotes] = useState("");
  const [forms, setForms] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(OPTIONAL_FORMS.map((item) => [item, false]))
  );

  useEffect(() => {
    if (!timerRunning || breakOn) return;
    const intervalId = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [timerRunning, breakOn]);

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Assigned job not found.</p>
      </div>
    );
  }

  const manualHoursValue = Number(manualHours);
  const manualHoursValid = manualHours === "" || (!Number.isNaN(manualHoursValue) && manualHoursValue >= 0 && manualHoursValue <= 24);
  const canSubmit = manualHoursValid;
  const displayId = formatJobNumber(job.id, prefix);
  const elapsedHours = elapsedSeconds / 3600;
  const totalHours = manualHours === "" ? elapsedHours : manualHoursValue;
  const formatElapsed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hours, minutes, secs].map((v) => String(v).padStart(2, "0")).join(":");
  };

  const handleSubmit = () => {
    toast({
      title: "Timesheet submitted",
      description: `${displayId} • ${totalHours.toFixed(2)}h logged${notes ? " with notes" : ""}.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" /> My Week
        </Button>
        <Badge variant="secondary">Timesheet Mode</Badge>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-1">
          <p className="text-xs text-muted-foreground font-mono">{displayId}</p>
          <p className="text-lg font-semibold">{job.jobName}</p>
          <p className="text-sm text-muted-foreground">{job.client} • {job.address}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Hours</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="gap-2"
            variant={timerRunning ? "destructive" : "default"}
            onClick={() => {
              setTimerRunning((running) => {
                if (running) {
                  setBreakOn(false);
                }
                return !running;
              });
            }}
          >
            {timerRunning ? <><Square className="w-4 h-4" /> Stop timer</> : <><Play className="w-4 h-4" /> Start timer</>}
          </Button>
          <p className="text-sm font-mono text-card-foreground">Stopwatch: {formatElapsed(elapsedSeconds)}</p>
          <div className="space-y-1.5">
            <Label htmlFor="manual-hours">Manual hours</Label>
            <Input
              id="manual-hours"
              type="number"
              step="0.25"
              min="0"
              max="24"
              placeholder="e.g. 2.5"
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
            />
            {!manualHoursValid && <p className="text-xs text-destructive">Enter a value between 0 and 24.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Break</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" className="gap-2" disabled={!timerRunning} onClick={() => setBreakOn((s) => !s)}>
            {breakOn ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Take break</>}
          </Button>
          {!timerRunning && <p className="mt-2 text-xs text-muted-foreground">Start the timer to enable break tracking.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">3. Site Forms (Optional)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {OPTIONAL_FORMS.map((form) => (
            <label key={form} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forms[form]}
                onChange={(e) => setForms((prev) => ({ ...prev, [form]: e.target.checked }))}
              />
              <ClipboardCheck className="w-4 h-4 text-muted-foreground" /> {form}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            Tutorial note: these forms are optional in Timesheet Mode. A manager can choose to make forms like Take 5 compulsory for selected staff members.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">4. Work Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional description"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">5. Photos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="gap-2"><Upload className="w-4 h-4" /> Upload photos</Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Photos attach to this job only.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">6. Submit</CardTitle></CardHeader>
        <CardContent>
          <Button disabled={!canSubmit} className="w-full gap-2" onClick={handleSubmit}>
            <CheckCircle2 className="w-4 h-4" /> Submit
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Forms do not block submission in Timesheet Mode.</p>
        </CardContent>
      </Card>
    </div>
  );
}
