import { createContext, useContext, useState, type ReactNode } from "react";

type AppMode = "manage" | "work" | "sole-trader" | "timesheet" | "intro" | null;

export type Trade = "electrical" | "hvac" | "plumbing" | "glazing" | "building" | "mechanic" | "painting" | "landscaping" | "roofer";

export interface SoleTraderPrefs {
  vanStock: boolean;
  reconcileDocs: boolean;
}

const DEFAULT_PREFS: SoleTraderPrefs = { vanStock: false, reconcileDocs: false };

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: "manage" | "work" | "sole-trader" | "timesheet" | "intro") => void;
  isWorkMode: boolean;
  isSoleTrader: boolean;
  isTimesheetOnlyMode: boolean;
  isIntroMode: boolean;
  clearMode: () => void;
  soleTraderPrefs: SoleTraderPrefs;
  setSoleTraderPrefs: (prefs: SoleTraderPrefs) => void;
  trade: Trade | null;
  setTrade: (trade: Trade) => void;
  clearTrade: () => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const STORAGE_KEY = "tradie-app-mode";
const PREFS_KEY = "tradie-sole-trader-prefs";
const TRADE_KEY = "tradie-app-trade";

const VALID_TRADES: Trade[] = ["electrical", "hvac", "plumbing", "glazing", "building", "mechanic", "painting", "landscaping", "roofer"];

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "manage" || stored === "work" || stored === "sole-trader" || stored === "timesheet" || stored === "intro" ? stored : null;
  });

  const [trade, setTradeState] = useState<Trade | null>(() => {
    const stored = localStorage.getItem(TRADE_KEY);
    return VALID_TRADES.includes(stored as Trade) ? (stored as Trade) : null;
  });

  const [soleTraderPrefs, setSoleTraderPrefsState] = useState<SoleTraderPrefs>(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_PREFS;
  });

  const setMode = (m: "manage" | "work" | "sole-trader" | "timesheet" | "intro") => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  };

  const setTrade = (t: Trade) => {
    setTradeState(t);
    localStorage.setItem(TRADE_KEY, t);
  };

  const clearTrade = () => {
    setTradeState(null);
    localStorage.removeItem(TRADE_KEY);
  };

  const setSoleTraderPrefs = (prefs: SoleTraderPrefs) => {
    setSoleTraderPrefsState(prefs);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  };

  const clearMode = () => {
    setModeState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AppModeContext.Provider value={{
      mode,
      setMode,
      isWorkMode: mode === "work" || mode === "sole-trader" || mode === "timesheet" || mode === "intro",
      isSoleTrader: mode === "sole-trader",
      isTimesheetOnlyMode: mode === "timesheet",
      isIntroMode: mode === "intro",
      clearMode,
      soleTraderPrefs,
      setSoleTraderPrefs,
      trade,
      setTrade,
      clearTrade,
    }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode must be used within AppModeProvider");
  return ctx;
}
