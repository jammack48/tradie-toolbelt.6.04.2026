import { Shield, Wrench, Building2, Receipt, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { useUserSettings } from "@/contexts/UserSettingsContext";

export function ModePicker() {
  const { setMode } = useAppMode();
  const { setTutorialOn } = useTutorial();
  const { settings } = useUserSettings();
  const { isDemo, setIsDemo } = useAuth();
  const showAllModesForDev = import.meta.env.DEV;
  const canShowToolsMode = settings.showToolsMode || showAllModesForDev;
  const canShowEmployeeMode = settings.showEmployeeMode || showAllModesForDev;
  const canShowTimesheetMode = settings.showTimesheetMode || showAllModesForDev;
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Wrench className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Tradie Toolbelt</h1>
          </div>
        </div>

        <div className="grid gap-3">
          {isDemo && (
            <button onClick={() => { sessionStorage.clear(); setIsDemo(false); }} className="group rounded-xl border-2 border-primary bg-card p-5 text-left">
              <div className="flex items-center gap-4"><LogIn className="w-6 h-6 text-primary" /><h2 className="text-base font-bold text-card-foreground">Sign In</h2></div>
            </button>
          )}
          {settings.tutorialsEnabled && (
            <button onClick={() => { setTutorialOn(false); setMode("intro"); }} className="group rounded-xl border-2 border-border bg-card p-5 text-left">
              <div className="flex items-center gap-4"><Receipt className="w-6 h-6 text-primary" /><h2 className="text-base font-bold text-card-foreground">Intro Tutorial</h2></div>
            </button>
          )}

          <button onClick={() => setMode("manage")} className="group rounded-xl border-2 border-border bg-card p-5 text-left">
            <div className="flex items-center gap-4"><Building2 className="w-6 h-6 text-primary" /><h2 className="text-base font-bold text-card-foreground">Manager / Owner</h2></div>
          </button>

          {canShowEmployeeMode && (
            <button onClick={() => { setTutorialOn(true); setMode("work"); }} className="group rounded-xl border-2 border-border bg-card p-5 text-left">
              <div className="flex items-center gap-4"><Wrench className="w-6 h-6 text-primary" /><h2 className="text-base font-bold text-card-foreground">Employee</h2></div>
            </button>
          )}

          {canShowTimesheetMode && (
            <button onClick={() => { setTutorialOn(false); setMode("timesheet"); }} className="group rounded-xl border-2 border-border bg-card p-5 text-left">
              <div className="flex items-center gap-4"><Shield className="w-6 h-6 text-primary" /><h2 className="text-base font-bold text-card-foreground">Timesheet Mode</h2></div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
