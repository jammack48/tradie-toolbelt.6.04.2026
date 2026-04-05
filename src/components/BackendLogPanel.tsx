import { useBackend } from "@/contexts/BackendContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Power, PowerOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackendLogPanel() {
  const { panelOpen, setPanelOpen, logs, enabled, connected, toggleEnabled, clearLogs } = useBackend();

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="text-sm font-semibold">Backend Server</SheetTitle>
        </SheetHeader>

        {/* Status + controls */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                connected === null
                  ? "bg-muted-foreground"
                  : connected
                    ? "bg-[hsl(var(--status-green))]"
                    : "bg-destructive"
              )}
            />
            <span className="text-xs text-foreground font-medium">
              {connected === null ? "Checking…" : connected ? "Connected" : "Offline"}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={enabled ? "destructive" : "default"}
              className="h-7 text-xs gap-1"
              onClick={toggleEnabled}
            >
              {enabled ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
              {enabled ? "Disconnect" : "Connect"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={clearLogs} title="Clear logs">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Log entries */}
        <div className="px-4 py-2 text-[11px] text-muted-foreground border-b border-border">
          Health checks every 25s • request timeout after 8s
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No logs yet</p>
          ) : (
            <div className="space-y-1">
              {logs.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] leading-tight py-0.5">
                  <span className="text-muted-foreground whitespace-nowrap shrink-0">
                    {entry.time.toLocaleTimeString()}
                  </span>
                  <span className={cn(entry.ok ? "text-foreground" : "text-destructive")}>
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
