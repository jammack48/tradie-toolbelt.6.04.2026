import { useState } from "react";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ScheduleJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobName: string;
  slotLabel: string;
  onConfirm: (hours: number) => void;
}

const QUICK_DURATIONS = [1, 2, 3, 4, 6, 8];

export function ScheduleJobDialog({ open, onOpenChange, jobName, slotLabel, onConfirm }: ScheduleJobDialogProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");

  const handleConfirm = () => {
    const hours = selected ?? (custom ? parseFloat(custom) : 0);
    if (hours > 0) {
      onConfirm(hours);
      onOpenChange(false);
      setSelected(null);
      setCustom("");
    }
  };

  const hasValue = (selected !== null && selected > 0) || (custom !== "" && parseFloat(custom) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-primary" />
            How long?
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{jobName}</p>
          <p className="text-xs text-muted-foreground">{slotLabel}</p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 py-2">
          {QUICK_DURATIONS.map((h) => (
            <Button
              key={h}
              size="sm"
              variant={selected === h ? "default" : "outline"}
              className="h-10 text-sm font-semibold"
              onClick={() => { setSelected(h); setCustom(""); }}
            >
              {h}h
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Custom:</span>
          <Input
            type="number"
            min="0.5"
            max="12"
            step="0.5"
            placeholder="hrs"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
            className="h-9 w-20"
          />
          <span className="text-xs text-muted-foreground">hours</span>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={!hasValue}>Place Job</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
