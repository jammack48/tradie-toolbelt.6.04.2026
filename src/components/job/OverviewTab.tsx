import { MapPin, Users, Calendar, AlertTriangle, Briefcase, Phone, Mail, User, CalendarPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { JobDetail } from "@/data/dummyJobDetails";
import { DUMMY_CUSTOMERS } from "@/data/dummyCustomers";
import { useJobPrefix } from "@/contexts/JobPrefixContext";
import { formatJobNumber } from "@/lib/jobNumber";

interface OverviewTabProps {
  job: JobDetail;
  onSchedule?: () => void;
  scheduledStaff?: string[];
  scheduledDate?: string;
}

const PRE_SCHEDULE_STAGES = ["Lead", "To Quote", "Quote Sent", "Quote Accepted"];

function getStageSummary(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes("lead")) return "Lead to follow up";
  if (s.includes("quote")) return "Quote awaiting acceptance";
  if (s.includes("progress") || s.includes("job")) return "Job in progress";
  if (s.includes("invoice")) return "Ready to invoice";
  if (s.includes("complete") || s.includes("paid")) return "Job complete";
  return stage;
}

export function OverviewTab({ job, onSchedule, scheduledStaff = [], scheduledDate = "" }: OverviewTabProps) {
  const navigate = useNavigate();
  const { prefix } = useJobPrefix();
  const displayId = formatJobNumber(job.id, prefix);
  const isPreSchedule = PRE_SCHEDULE_STAGES.includes(job.stage) && scheduledStaff.length === 0;
  const isQuoteAccepted = job.stage === "Quote Accepted";

  // Override staff/dates for pre-schedule stages (unless we have scheduled data)
  const displayStaff = scheduledStaff.length > 0
    ? scheduledStaff.map(name => ({ name, avatar: name.split(" ").map(w => w[0]).join("") }))
    : isPreSchedule ? [] : job.staff;
  const displayStartDate = scheduledDate || (isPreSchedule ? "" : job.startDate);
  const displayDueDate = isPreSchedule ? "" : job.dueDate;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
      {/* Status Card */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">{job.stage}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{getStageSummary(job.stage)}</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Job</span>
              <span className="font-medium">{job.jobName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Value</span>
              <span className="font-bold">${job.value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs">{displayId}</span>
            </div>
          </div>
          {(job.urgent || job.ageDays > 7) && (
            <div className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium ${
              job.urgent
                ? "bg-destructive/10 text-destructive"
                : "bg-[hsl(var(--status-orange)/0.15)] text-[hsl(var(--status-orange))]"
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {job.urgent ? "Urgent — immediate attention" : `Overdue — ${job.ageDays} days`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Details */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="w-4 h-4 text-muted-foreground" /> Customer
          </div>
          <button
            className="text-sm font-semibold text-primary hover:underline text-left"
            onClick={() => {
              const customer = DUMMY_CUSTOMERS.find(c => c.name === job.client);
              navigate(`/customer/${customer?.id ?? 1}`);
            }}
          >
            {job.client || "No client assigned"}
          </button>
          {job.clientPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <a href={`tel:${job.clientPhone}`} className="hover:text-primary transition-colors">{job.clientPhone}</a>
            </div>
          )}
          {job.clientEmail && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              <a href={`mailto:${job.clientEmail}`} className="hover:text-primary transition-colors truncate">{job.clientEmail}</a>
            </div>
          )}
          {job.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span>{job.address}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff + Schedule */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="w-4 h-4 text-muted-foreground" /> Staff & Schedule
          </div>
          {displayStaff.length === 0 ? (
            <p className="text-xs text-muted-foreground">No staff assigned</p>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {displayStaff.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {s.avatar}
                  </div>
                  <span className="text-xs">{s.name}</span>
                </div>
              ))}
            </div>
          )}
          {isQuoteAccepted && onSchedule && (
            <Button
              size="sm"
              onClick={onSchedule}
              className="w-full gap-1.5 bg-[hsl(var(--status-green))] hover:bg-[hsl(var(--status-green))]/90 text-white font-bold"
            >
              <CalendarPlus className="w-4 h-4" /> Schedule Job
            </Button>
          )}
          <div className="border-t border-border/50 pt-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Start:</span>
              <span className="text-card-foreground font-medium">{displayStartDate || "Not scheduled"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due:</span>
              <span className="text-card-foreground font-medium">{displayDueDate || "Not scheduled"}</span>
            </div>
            {!isPreSchedule && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>Age:</span>
                <span className="text-card-foreground font-medium">{job.ageDays} days</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Site Details */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" /> Site
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <span>{job.address || "No address set"}</span>
          </div>
          {job.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Open in Maps</span>
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
