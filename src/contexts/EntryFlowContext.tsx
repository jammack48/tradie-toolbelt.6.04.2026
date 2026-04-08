import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface EntryFlowActions {
  goToLogin: () => void | Promise<void>;
  goToEntry: () => void | Promise<void>;
}

const Ctx = createContext<EntryFlowActions | null>(null);

export function EntryFlowActionsProvider({
  children,
  goToLogin,
  goToEntry,
}: {
  children: ReactNode;
  goToLogin: () => void | Promise<void>;
  goToEntry: () => void | Promise<void>;
}) {
  const value = useMemo(() => ({ goToLogin, goToEntry }), [goToLogin, goToEntry]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntryFlowActions(): EntryFlowActions {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEntryFlowActions must be used within EntryFlowActionsProvider");
  return v;
}
