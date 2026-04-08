import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";

export type Theme = "earthy" | "ocean" | "ember" | "rose" | "slate";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
  setIsDark: (d: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme, isDark: boolean) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("light", !isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "earthy";
  });
  const [isDark, setIsDarkState] = useState<boolean>(() => {
    const stored = localStorage.getItem("isDark");
    return stored === null ? true : stored === "true";
  });

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

  const value = useMemo(
    () => ({ theme, setTheme, isDark, setIsDark }),
    [theme, setTheme, isDark, setIsDark]
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
