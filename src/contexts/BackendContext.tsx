import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { BACKEND_URL } from "@/config/env";

export interface LogEntry {
  time: Date;
  message: string;
  ok: boolean;
}

export interface DebugInfo {
  url_set: boolean;
  key_set: boolean;
  key_type: string;
  key_preview: string;
  ai_key_set?: boolean;
  ai_error?: string | null;
  init_error: string | null;
  query_error: string | null;
}

const AI_ONLINE_STATUSES = new Set(["online", "connected", "ready", "ok"]);
const DB_ONLINE_STATUSES = new Set(["connected", "online", "ready", "ok"]);

interface BackendContextValue {
  connected: boolean | null;
  dbConnected: boolean | null;
  dbStatus: string | null;
  aiConnected: boolean | null;
  aiStatus: string | null;
  debug: DebugInfo | null;
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
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
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
        const data = await res.json() as Record<string, unknown>;
        setConnected(true);
        const debugObj = (data.debug && typeof data.debug === "object") ? (data.debug as DebugInfo) : null;
        const db = typeof data.db === "string" && data.db.trim() ? data.db : "not_reported";
        const ai =
          typeof data.ai === "string" && data.ai.trim()
            ? data.ai
            : debugObj?.ai_key_set === false
              ? "not_configured"
              : "not_reported";
        const dbIsOnline = DB_ONLINE_STATUSES.has(db.toLowerCase());
        const aiIsOnline = AI_ONLINE_STATUSES.has(ai.toLowerCase());
        setDbStatus(db);
        setAiStatus(ai);
        setDbConnected(dbIsOnline);
        setAiConnected(aiIsOnline);
        if (debugObj) setDebug(debugObj);

        const debugMsg = debugObj?.init_error || debugObj?.query_error || debugObj?.ai_error;
        const suffix = debugMsg ? ` — ${debugMsg}` : "";
        addLog(`Health OK • DB: ${db} • AI: ${ai}${suffix}`, dbIsOnline && aiIsOnline);
      } else {
        setConnected(false);
        setDbConnected(null);
        setDbStatus(null);
        setAiConnected(null);
        setAiStatus(null);
        addLog(`Health check failed (${res.status})`, false);
      }
    } catch {
      setConnected(false);
      setDbConnected(null);
      setDbStatus(null);
      setAiConnected(null);
      setAiStatus(null);
      addLog("Server unreachable", false);
    }
  }, [addLog]);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      setDbConnected(null);
      setDbStatus(null);
      setAiConnected(null);
      setAiStatus(null);
      addLog("Disconnected by user", false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    addLog("Connecting…", true);
    ping();
    intervalRef.current = setInterval(ping, 25000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, ping, addLog]);

  const toggleEnabled = useCallback(() => setEnabled((e) => !e), []);
  const clearLogs = useCallback(() => setLogs([]), []);

  return <Ctx.Provider value={{ connected, dbConnected, dbStatus, aiConnected, aiStatus, debug, enabled, logs, panelOpen, setPanelOpen, toggleEnabled, clearLogs }}>{children}</Ctx.Provider>;
}

export function useBackend() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBackend must be inside BackendProvider");
  return ctx;
}
