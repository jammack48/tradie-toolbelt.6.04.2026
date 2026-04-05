import { useState } from "react";
import { Shield, Wrench, HardHat, ArrowRight, Building2, Receipt, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/contexts/UserSettingsContext";

type SubStep = null | "manager-choice";

export function ModePicker() {
  const { setMode } = useAppMode();
  const { setTutorialOn } = useTutorial();
  const { settings } = useUserSettings();
  const { isDemo, setIsDemo } = useAuth();
  const showAllModesForDev = import.meta.env.DEV;
  const canShowToolsMode = settings.showToolsMode || showAllModesForDev;
  const canShowEmployeeMode = settings.showEmployeeMode || showAllModesForDev;
  const canShowTimesheetMode = settings.showTimesheetMode || showAllModesForDev;
  const [subStep, setSubStep] = useState<SubStep>(null);

  if (subStep === "manager-choice") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground mb-1">Where are you today?</h1>
          </div>

          <div className="grid gap-3">
            <button onClick={() => setMode("manage")} className="group rounded-xl border-2 border-border bg-card p-5 text-left">
              <div className="flex items-center gap-4">
                <Building2 className="w-6 h-6 text-blue-500" />
                <div><h2 className="text-base font-bold text-card-foreground">In the Office</h2></div>
              </div>
            </button>

            {canShowToolsMode && (
              <button onClick={() => setMode("sole-trader")} className="group rounded-xl border-2 border-border bg-card p-5 text-left">
                <div className="flex items-center gap-4">
                  <HardHat className="w-6 h-6 text-primary" />
                  <div><h2 className="text-base font-bold text-card-foreground">On the Tools</h2></div>
                </div>
              </button>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={() => setSubStep(null)}>Back</Button>
        </div>
      </div>
    );
  }

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

          <button onClick={() => setSubStep("manager-choice")} className="group rounded-xl border-2 border-border bg-card p-5 text-left">
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
