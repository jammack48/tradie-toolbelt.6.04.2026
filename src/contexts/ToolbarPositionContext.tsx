import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";

export type ToolbarPosition = "left" | "right" | "top" | "bottom";

const POSITION_CYCLE: ToolbarPosition[] = ["left", "bottom", "right", "top"];

function getStoredPosition(): ToolbarPosition {
  try {
    const v = localStorage.getItem("toolbar-position");
    if (v && POSITION_CYCLE.includes(v as ToolbarPosition)) return v as ToolbarPosition;
  } catch {}
  return "left";
}

/** Next position in the cycle (same logic as `cyclePosition`). */
export function getNextToolbarPosition(current: ToolbarPosition, skip?: ToolbarPosition[]): ToolbarPosition {
  let idx = POSITION_CYCLE.indexOf(current);
  do {
    idx = (idx + 1) % POSITION_CYCLE.length;
  } while (skip?.includes(POSITION_CYCLE[idx]));
  return POSITION_CYCLE[idx];
}

interface ToolbarPositionContextValue {
  position: ToolbarPosition;
  cyclePosition: (skip?: ToolbarPosition[]) => void;
  setToolbarPosition: (p: ToolbarPosition) => void;
}

const ToolbarPositionContext = createContext<ToolbarPositionContextValue | null>(null);

export function ToolbarPositionProvider({ children }: { children: ReactNode }) {
  const [position, setPosition] = useState<ToolbarPosition>(getStoredPosition);

  useEffect(() => {
    localStorage.setItem("toolbar-position", position);
  }, [position]);

  const cyclePosition = useCallback((skip?: ToolbarPosition[]) => {
    setPosition((pos) => getNextToolbarPosition(pos, skip));
  }, []);

  const setToolbarPosition = useCallback((p: ToolbarPosition) => {
    if (POSITION_CYCLE.includes(p)) setPosition(p);
  }, []);

  const value = useMemo(
    () => ({ position, cyclePosition, setToolbarPosition }),
    [position, cyclePosition, setToolbarPosition]
  );

  return (
    <ToolbarPositionContext.Provider value={value}>
      {children}
    </ToolbarPositionContext.Provider>
  );
}

export function useToolbarPosition() {
  const ctx = useContext(ToolbarPositionContext);
  if (!ctx) throw new Error("useToolbarPosition must be used within ToolbarPositionProvider");
  return ctx;
}
