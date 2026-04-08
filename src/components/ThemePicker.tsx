import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppMode } from "@/contexts/AppModeContext";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import { updateProdUserShellSettings } from "@/services/prodDataService";
import { toast } from "@/hooks/use-toast";

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
  const {
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
  } = useTheme();
  const { isIntroMode } = useAppMode();
  const { userId } = useUserSettings();

  const persistShell = async (patch: { theme?: Theme; is_dark?: boolean }) => {
    if (!userId) return;
    try {
      await updateProdUserShellSettings(userId, patch);
      /* Do not refresh() — that re-fetches settings, sets loading, and feels like a full reload. Theme is already applied locally. */
    } catch (e) {
      toast({
        title: "Could not save theme",
        description: e instanceof Error ? e.message : "Check Supabase RLS for prod_user_settings.",
        variant: "destructive",
      });
    }
  };

  const pickTheme = (t: Theme) => {
    setTheme(t);
    void persistShell({ theme: t });
  };

  const toggleDark = (d: boolean) => {
    setIsDark(d);
    void persistShell({ is_dark: d });
  };

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
      <PopoverContent className="w-[min(100vw-1rem,20rem)] p-4 text-sm" align="end" sideOffset={6}>
        <p className="text-sm text-muted-foreground mb-3 font-semibold tracking-wide uppercase">Theme</p>
        <div className="flex gap-2 flex-wrap">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => pickTheme(t.id)}
              className={cn(
                "group flex flex-col items-center gap-1.5 focus:outline-none"
              )}
            >
              <span
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  theme === t.id
                    ? "border-foreground scale-110 shadow-md"
                    : "border-transparent hover:border-muted-foreground/50"
                )}
                style={{ backgroundColor: isDark ? t.darkColor : t.color }}
              />
              <span className={cn(
                "text-[11px] font-semibold transition-colors",
                theme === t.id ? "text-foreground" : "text-muted-foreground"
              )}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {isDark ? "Dark" : "Light"}
          </div>
          <Switch checked={isDark} onCheckedChange={toggleDark} />
        </div>

        <div className="mt-4 pt-3 border-t border-border space-y-4">
          <p className="text-sm text-muted-foreground font-semibold tracking-wide uppercase">Panels</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-foreground">
              <span className="font-medium">Deeper boxes</span>
              <span className="tabular-nums text-muted-foreground">{uiPanelDepth}</span>
            </div>
            <Slider
              value={[uiPanelDepth]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setUiPanelDepth(v[0] ?? 0)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-foreground">
              <span className="font-medium">Highlight colour</span>
              <span className="tabular-nums text-muted-foreground">{uiHighlight}</span>
            </div>
            <Slider
              value={[uiHighlight]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setUiHighlight(v[0] ?? 0)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-foreground">
              <span className="font-medium">Border thickness</span>
              <span className="tabular-nums text-muted-foreground">{uiBorderThickness}</span>
            </div>
            <Slider
              value={[uiBorderThickness]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setUiBorderThickness(v[0] ?? 0)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-foreground">
              <span className="font-medium">Text size</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(fontScale * 100)}%</span>
            </div>
            <Slider
              value={[Math.round((fontScale - 0.85) / 0.003)]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setFontScale(0.85 + (v[0] ?? 0) * 0.003)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
