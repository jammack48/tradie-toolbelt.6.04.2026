import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUserSettings } from "@/contexts/UserSettingsContext";

export type ToolbarPosition = "left" | "right" | "top" | "bottom";

const POSITION_CYCLE: ToolbarPosition[] = ["left", "bottom", "right", "top"];

function getStoredPosition(): ToolbarPosition {
  try {
    const v = localStorage.getItem("toolbar-position");
    if (v && POSITION_CYCLE.includes(v as ToolbarPosition)) return v as ToolbarPosition;
  } catch {}
  return "left";
}

interface ToolbarPositionContextValue {
  position: ToolbarPosition;
  cyclePosition: (skip?: ToolbarPosition[]) => void;
}

const ToolbarPositionContext = createContext<ToolbarPositionContextValue | null>(null);

export function ToolbarPositionProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<ToolbarPosition>(getStoredPosition);
  const { settings, saveSettings, loading } = useUserSettings();

  useEffect(() => {
    if (loading) return;
    if (settings.toolbarPosition !== position) {
      setPosition(settings.toolbarPosition);
    }
  }, [loading, settings.toolbarPosition, position]);

  useEffect(() => {
    localStorage.setItem("toolbar-position", position);
  }, [position]);

  const cyclePosition = (skip?: ToolbarPosition[]) => {
    let idx = POSITION_CYCLE.indexOf(position);
    do {
      idx = (idx + 1) % POSITION_CYCLE.length;
    } while (skip?.includes(POSITION_CYCLE[idx]));
    const next = POSITION_CYCLE[idx];
    const previous = position;
    setPosition(next);
    void saveSettings({ toolbarPosition: next }).catch((error) => {
      console.error("Failed to save toolbar position", error);
      setPosition(previous);
    });
  };

  return (
    <ToolbarPositionContext.Provider value={{ position, cyclePosition }}>
      {children}
    </ToolbarPositionContext.Provider>
  );
}

export function useToolbarPosition() {
  const ctx = useContext(ToolbarPositionContext);
  if (!ctx) throw new Error("useToolbarPosition must be used within ToolbarPositionProvider");
  return ctx;
}
