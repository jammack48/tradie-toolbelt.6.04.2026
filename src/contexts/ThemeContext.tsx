import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "earthy" | "ocean" | "ember" | "rose" | "slate";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
  setIsDark: (d: boolean) => void;
  sectionContrast: number;
  setSectionContrast: (value: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme, isDark: boolean, sectionContrast: number) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("light", !isDark);
  root.style.setProperty("--section-contrast-alpha", String(Math.min(0.9, Math.max(0.25, sectionContrast / 100))));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "earthy";
  });
  const [isDark, setIsDarkState] = useState<boolean>(() => {
    const stored = localStorage.getItem("isDark");
    return stored === null ? true : stored === "true";
  });
  const [sectionContrast, setSectionContrastState] = useState<number>(() => {
    const stored = localStorage.getItem("sectionContrast");
    const parsed = stored ? Number(stored) : 60;
    return Number.isFinite(parsed) ? Math.min(90, Math.max(25, parsed)) : 60;
  });

  useEffect(() => {
    applyTheme(theme, isDark, sectionContrast);
    console.info("[theme] applied", { theme, isDark, sectionContrast });
  }, [theme, isDark, sectionContrast]);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme, isDark, sectionContrast);
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
  const setSectionContrast = (value: number) => {
    const normalized = Math.min(90, Math.max(25, value));
    setSectionContrastState(normalized);
    localStorage.setItem("sectionContrast", String(normalized));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, setIsDark, sectionContrast, setSectionContrast }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
