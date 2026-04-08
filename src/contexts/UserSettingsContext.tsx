import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { useToolbarPosition, type ToolbarPosition } from "@/contexts/ToolbarPositionContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { fetchProdUserSettings, type ProdUserSettingsRow } from "@/services/prodDataService";

const VALID_THEMES: Theme[] = ["earthy", "ocean", "ember", "rose", "slate"];

interface UserSettingsContextValue {
  userId: string | null;
  settings: ProdUserSettingsRow | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  companyId: string | null;
}

const Ctx = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { setTheme, setIsDark } = useTheme();
  const { setTutorialOn } = useTutorial();
  const { setToolbarPosition } = useToolbarPosition();
  const { setSoleTraderPrefs } = useAppMode();

  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ProdUserSettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setSettings(null);
        return;
      }
      const row = await fetchProdUserSettings(uid);
      setSettings(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    void refresh();
    return () => subscription.unsubscribe();
  }, [refresh]);

  const serverPrefsKey = settings
    ? [
        settings.user_id,
        settings.theme,
        settings.is_dark,
        settings.toolbar_position,
        settings.tutorials_enabled,
        settings.van_stock,
        settings.reconcile_docs,
      ].join("|")
    : "";

  useEffect(() => {
    if (!settings || !serverPrefsKey) return;
    const th = settings.theme as Theme;
    if (VALID_THEMES.includes(th)) setTheme(th);
    setIsDark(settings.is_dark);
    const pos = settings.toolbar_position as ToolbarPosition;
    if (["left", "right", "top", "bottom"].includes(pos)) setToolbarPosition(pos);
    setTutorialOn(settings.tutorials_enabled);
    setSoleTraderPrefs({
      vanStock: settings.van_stock ?? false,
      reconcileDocs: settings.reconcile_docs ?? false,
    });
  }, [serverPrefsKey, settings]);

  const value = useMemo<UserSettingsContextValue>(
    () => ({
      userId,
      settings,
      loading,
      error,
      refresh,
      companyId: settings?.company_id ?? null,
    }),
    [userId, settings, loading, error, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return v;
}
