import { Database } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useBackend } from "@/contexts/BackendContext";

export function BackendStatus() {
  const { connected, setPanelOpen } = useBackend();

  const color =
    connected === null
      ? "text-muted-foreground"
      : connected
        ? "text-[hsl(var(--status-green))]"
        : "text-destructive";

  const label =
    connected === null
      ? "Checking backend…"
      : connected
        ? "Backend connected"
        : "Backend offline";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => setPanelOpen(true)}
          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
        >
          <Database className={`w-4.5 h-4.5 ${color} transition-colors`} />
        </button>
      </TooltipTrigger>
      <TooltipContent><p className="text-xs">{label}</p></TooltipContent>
    </Tooltip>
  );
}
