import { useBackend } from "@/contexts/BackendContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Power, PowerOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function StatusDot({ state }: { state: boolean | null }) {
  return (
    <span
      className={cn(
        "w-2.5 h-2.5 rounded-full shrink-0",
        state === null
          ? "bg-muted-foreground"
          : state
            ? "bg-[hsl(var(--status-green))]"
            : "bg-destructive"
      )}
    />
  );
}

function DebugRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono", warn ? "text-destructive" : "text-foreground")}>{value}</span>
    </div>
  );
}

export function BackendLogPanel() {
  const { panelOpen, setPanelOpen, logs, enabled, connected, dbConnected, dbStatus, debug, toggleEnabled, clearLogs } = useBackend();

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="text-sm font-semibold">Backend Server</SheetTitle>
        </SheetHeader>

        {/* Status rows */}
        <div className="px-4 py-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusDot state={connected} />
              <span className="text-xs text-foreground font-medium">
                {connected === null ? "Checking…" : connected ? "Server connected" : "Server offline"}
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

          <div className="flex items-center gap-2">
            <StatusDot state={dbConnected} />
            <span className="text-xs text-foreground font-medium">
              {dbStatus
                ? `Database: ${dbStatus}`
                : dbConnected === null
                  ? "DB not checked"
                  : "Database offline"}
            </span>
          </div>
        </div>

        {/* Connection Debug */}
        {debug && (
          <div className="px-4 py-2 border-b border-border space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Connection Debug</p>
            <DebugRow label="SUPABASE_URL" value={debug.url_set ? "✓ set" : "✗ missing"} warn={!debug.url_set} />
            <DebugRow label="SUPABASE_SERVICE_KEY" value={debug.key_set ? "✓ set" : "✗ missing"} warn={!debug.key_set} />
            <DebugRow
              label="Key type"
              value={debug.key_type}
              warn={debug.key_type !== "legacy_jwt" && debug.key_set}
            />
            <DebugRow label="Key preview" value={debug.key_preview} />
            {debug.init_error && (
              <DebugRow label="Init error" value={debug.init_error} warn />
            )}
            {debug.query_error && (
              <DebugRow label="Query error" value={debug.query_error} warn />
            )}
            {debug.key_set && debug.key_type !== "legacy_jwt" && (
              <p className="text-[10px] text-destructive mt-1">
                ⚠ Expected legacy service_role JWT (starts with eyJ…). Check Supabase → API Keys → Legacy.
              </p>
            )}
          </div>
        )}

        {/* Info */}
        <div className="px-4 py-2 text-[11px] text-muted-foreground border-b border-border">
          Health checks every 25s • request timeout after 8s
        </div>

        {/* Log entries */}
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
