import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppMode } from "@/contexts/AppModeContext";

const THEMES: { id: Theme; label: string; color: string; darkColor: string }[] = [
  { id: "earthy",  label: "Earthy",  color: "#6b8f71",  darkColor: "#5a7a5f" },
  { id: "ocean",   label: "Ocean",   color: "#3b82f6",  darkColor: "#2563eb" },
  { id: "ember",   label: "Ember",   color: "#f59e0b",  darkColor: "#d97706" },
  { id: "rose",    label: "Rose",    color: "#e07070",  darkColor: "#c05050" },
  { id: "slate",   label: "Slate",   color: "#8b8fa8",  darkColor: "#6b6f88" },
];

// Three-riser SVG icon
function RiserIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="14"
      viewBox="0 0 16 14"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* bar 1 — short */}
      <rect x="0"  y="8" width="4" height="6" rx="1" />
      {/* bar 2 — tall */}
      <rect x="6"  y="2" width="4" height="12" rx="1" />
      {/* bar 3 — medium */}
      <rect x="12" y="5" width="4" height="9" rx="1" />
    </svg>
  );
}

export function ThemePicker() {
  const { theme, setTheme, isDark, setIsDark } = useTheme();
  const { isIntroMode } = useAppMode();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", isIntroMode && "animate-pulse ring-2 ring-primary/70 ring-offset-1 ring-offset-background")}
          title="Change theme"
        >
          <RiserIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end" sideOffset={6}>
        <p className="text-xs text-muted-foreground mb-2 font-medium tracking-wide uppercase">Theme</p>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => setTheme(t.id)}
              className={cn(
                "group flex flex-col items-center gap-1.5 focus:outline-none"
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all",
                  theme === t.id
                    ? "border-foreground scale-110 shadow-md"
                    : "border-transparent hover:border-muted-foreground/50"
                )}
                style={{ backgroundColor: isDark ? t.darkColor : t.color }}
              />
              <span className={cn(
                "text-[9px] font-medium transition-colors",
                theme === t.id ? "text-foreground" : "text-muted-foreground"
              )}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            {isDark ? "Dark" : "Light"}
          </div>
          <Switch checked={isDark} onCheckedChange={setIsDark} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
