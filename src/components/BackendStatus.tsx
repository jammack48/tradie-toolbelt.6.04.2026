import { Database } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useBackend } from "@/contexts/BackendContext";

export function BackendStatus() {
  const { connected, dbConnected, dbStatus, aiConnected, aiStatus, setPanelOpen } = useBackend();

  const allGood = connected === true && dbConnected === true && aiConnected === true;
  const color =
    connected === null
      ? "text-muted-foreground"
      : allGood
        ? "text-[hsl(var(--status-green))]"
        : connected
          ? "text-amber-500"
          : "text-destructive";

  const serverLabel =
    connected === null ? "Checking…" : connected ? "Server ✓" : "Server ✗";
  const dbLabel = dbStatus ? ` • DB: ${dbStatus}` : "";
  const aiLabel = aiStatus ? ` • AI: ${aiStatus}` : "";

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
      <TooltipContent><p className="text-xs">{serverLabel}{dbLabel}{aiLabel}</p></TooltipContent>
    </Tooltip>
  );
}
