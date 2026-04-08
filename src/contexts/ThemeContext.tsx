import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";

export type Theme = "earthy" | "ocean" | "ember" | "rose" | "slate";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
  setIsDark: (d: boolean) => void;
  /** 0–100: deepen panel / section bars (dark mode contrast). */
  uiPanelDepth: number;
  setUiPanelDepth: (n: number) => void;
  /** 0–100: stronger borders / highlights on panels. */
  uiHighlight: number;
  setUiHighlight: (n: number) => void;
  /** 0–100: thicker highlight borders (section bars, panels). */
  uiBorderThickness: number;
  setUiBorderThickness: (n: number) => void;
  /** ~0.85–1.15 — root font scale. */
  fontScale: number;
  setFontScale: (n: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme, isDark: boolean) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("light", !isDark);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function readNum(key: string, fallback: number) {
  const n = parseFloat(localStorage.getItem(key) ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "earthy";
  });
  const [isDark, setIsDarkState] = useState<boolean>(() => {
    const stored = localStorage.getItem("isDark");
    return stored === null ? true : stored === "true";
  });

  const [uiPanelDepth, setUiPanelDepthState] = useState(() => clamp(readNum("uiPanelDepth", 0), 0, 100));
  const [uiHighlight, setUiHighlightState] = useState(() => clamp(readNum("uiHighlight", 0), 0, 100));
  const [uiBorderThickness, setUiBorderThicknessState] = useState(() => clamp(readNum("uiBorderThickness", 0), 0, 100));
  const [fontScale, setFontScaleState] = useState(() => clamp(readNum("fontScale", 1), 0.85, 1.15));

  const themeRef = useRef(theme);
  themeRef.current = theme;
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  useEffect(() => {
    applyTheme(theme, isDark);
  }, [theme, isDark]);

  useEffect(() => {
    applyTheme(theme, isDark);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ui-panel-depth", String(uiPanelDepth / 100));
    root.style.setProperty("--ui-highlight", String(uiHighlight / 100));
    const borderPx = 1 + (uiBorderThickness / 100) * 3;
    root.style.setProperty("--ui-highlight-border-width", `${borderPx}px`);
    root.style.fontSize = `${16 * fontScale}px`;
  }, [uiPanelDepth, uiHighlight, uiBorderThickness, fontScale]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyTheme(t, isDarkRef.current);
  }, []);

  const setIsDark = useCallback((d: boolean) => {
    setIsDarkState(d);
    localStorage.setItem("isDark", String(d));
    applyTheme(themeRef.current, d);
  }, []);

  const setUiPanelDepth = useCallback((n: number) => {
    const v = clamp(n, 0, 100);
    setUiPanelDepthState(v);
    localStorage.setItem("uiPanelDepth", String(v));
  }, []);

  const setUiHighlight = useCallback((n: number) => {
    const v = clamp(n, 0, 100);
    setUiHighlightState(v);
    localStorage.setItem("uiHighlight", String(v));
  }, []);

  const setUiBorderThickness = useCallback((n: number) => {
    const v = clamp(n, 0, 100);
    setUiBorderThicknessState(v);
    localStorage.setItem("uiBorderThickness", String(v));
  }, []);

  const setFontScale = useCallback((n: number) => {
    const v = clamp(n, 0.85, 1.15);
    setFontScaleState(v);
    localStorage.setItem("fontScale", String(v));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      isDark,
      setIsDark,
      uiPanelDepth,
      setUiPanelDepth,
      uiHighlight,
      setUiHighlight,
      uiBorderThickness,
      setUiBorderThickness,
      fontScale,
      setFontScale,
    }),
    [
      theme,
      setTheme,
      isDark,
      setIsDark,
      uiPanelDepth,
      setUiPanelDepth,
      uiHighlight,
      setUiHighlight,
      uiBorderThickness,
      setUiBorderThickness,
      fontScale,
      setFontScale,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
