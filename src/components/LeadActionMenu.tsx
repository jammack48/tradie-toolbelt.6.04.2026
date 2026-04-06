import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, FileText, Archive, XCircle, Clock, Phone, Mail, MoreHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDemoData } from "@/contexts/DemoDataContext";
import { stageForPipelineEvent } from "@/services/pipelineTransitions";
import type { Job } from "@/data/dummyJobs";

interface LeadActionMenuProps {
  job: Job;
  children: React.ReactElement;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}

const ACTIONS = [
  { id: "move-to-quote", label: "Move to Quote", tip: "Move this lead into the quote bucket", icon: MoreHorizontal, color: "text-[hsl(var(--status-green))]" },
  { id: "quote", label: "Create Quote", tip: "Build a quote for this lead", icon: FileText, color: "text-[hsl(var(--status-green))]" },
  { id: "schedule", label: "Schedule Site Visit", tip: "Book a time to visit", icon: CalendarPlus, color: "text-primary" },
  { id: "call", label: "Call Customer", tip: "Give them a ring", icon: Phone, color: "text-primary" },
  { id: "email", label: "Send Email", tip: "Fire off an email", icon: Mail, color: "text-primary" },
  { id: "snooze", label: "Follow Up Later", tip: "Remind me in a few days", icon: Clock, color: "text-[hsl(var(--status-orange))]" },
  { id: "archive", label: "Archive Lead", tip: "Not interested — file it away", icon: Archive, color: "text-muted-foreground" },
  { id: "dead", label: "Mark as Dead", tip: "This one's gone cold", icon: XCircle, color: "text-destructive" },
];

export function LeadActionMenu({ job, children, align = "start", side = "bottom" }: LeadActionMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { updateJobStage } = useDemoData();

  const handleAction = (id: string) => {
    setOpen(false);
    switch (id) {
      case "move-to-quote":
        updateJobStage(job.id, stageForPipelineEvent("move_to_quote"));
        toast({ title: `${job.client} moved to To Quote` });
        break;
      case "quote":
        updateJobStage(job.id, stageForPipelineEvent("quote_created"));
        navigate(`/quote/${job.id}`);
        break;
      case "schedule":
        navigate(`/schedule`);
        toast({ title: `Schedule site visit for ${job.client}` });
        break;
      case "call":
        toast({ title: `Calling ${job.client}...` });
        break;
      case "email":
        toast({ title: `Opening email to ${job.client}...` });
        break;
      case "snooze":
        toast({ title: `Will remind you about ${job.client} in 3 days` });
        break;
      case "archive":
        toast({ title: `${job.client} archived` });
        break;
      case "dead":
        toast({ title: `${job.client} marked as dead lead` });
        break;
    }
  };

  const menuContent = (
    <>
      <div className="px-3 py-2 border-b border-border mb-1">
        <p className="text-sm font-bold text-card-foreground truncate">{job.client}</p>
        <p className="text-xs text-muted-foreground truncate">{job.jobName}</p>
      </div>
      <div className="flex flex-col gap-0.5 px-1.5 pb-1.5">
        {ACTIONS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => handleAction(id)}
            className="flex items-center gap-3 px-3 py-3 sm:py-2 rounded-lg text-sm font-medium text-card-foreground hover:bg-accent transition-colors text-left min-h-[44px]"
          >
            <Icon className={`w-5 h-5 sm:w-4 sm:h-4 shrink-0 ${color}`} />
            {label}
          </button>
        ))}
      </div>
    </>
  );

  // Mobile: use bottom drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {children}
        </DrawerTrigger>
        <DrawerContent className="pb-safe-area-inset-bottom">
          <div className="max-h-[70vh] overflow-y-auto">
            {menuContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: use popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="w-56 p-1.5 rounded-xl"
      >
        {menuContent}
      </PopoverContent>
    </Popover>
  );
}
