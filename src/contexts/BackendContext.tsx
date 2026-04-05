import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { BACKEND_URL } from "@/config/env";

export interface LogEntry {
  time: Date;
  message: string;
  ok: boolean;
}

interface BackendContextValue {
  connected: boolean | null;
  enabled: boolean;
  logs: LogEntry[];
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  toggleEnabled: () => void;
  clearLogs: () => void;
}

const Ctx = createContext<BackendContextValue | null>(null);

export function BackendProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((message: string, ok: boolean) => {
    setLogs((prev) => [...prev, { time: new Date(), message, ok }].slice(-100));
  }, []);

  const ping = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        setConnected(true);
        addLog("Health check OK", true);
      } else {
        setConnected(false);
        addLog(`Health check failed (${res.status})`, false);
      }
    } catch {
      setConnected(false);
      addLog("Server unreachable", false);
    }
  }, [addLog]);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      addLog("Disconnected by user", false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    addLog("Connecting…", true);
    ping();
    // Ping every 25s to keep free Render alive (sleeps after 15 min idle)
    intervalRef.current = setInterval(ping, 25000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, ping, addLog]);

  const toggleEnabled = useCallback(() => setEnabled((e) => !e), []);
  const clearLogs = useCallback(() => setLogs([]), []);

  return (
    <Ctx.Provider value={{ connected, enabled, logs, panelOpen, setPanelOpen, toggleEnabled, clearLogs }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBackend() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBackend must be inside BackendProvider");
  return ctx;
}
