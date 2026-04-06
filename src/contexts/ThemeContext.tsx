import { createContext, useContext, useEffect, useState } from "react";

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

  useEffect(() => {
    applyTheme(theme, isDark);
  }, [theme, isDark]);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme, isDark);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  const setIsDark = (d: boolean) => {
    setIsDarkState(d);
    localStorage.setItem("isDark", String(d));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
