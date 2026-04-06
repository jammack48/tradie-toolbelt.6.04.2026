import { useState } from "react";
import { Shield, Wrench, HardHat, ArrowRight, Building2, Receipt } from "lucide-react";
import { useAppMode } from "@/contexts/AppModeContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type SubStep = null | "manager-choice" | "sole-trader-setup";

export function ModePicker() {
  const { setMode, setSoleTraderPrefs } = useAppMode();
  const { setTutorialOn } = useTutorial();
  const [subStep, setSubStep] = useState<SubStep>(null);
  const [vanStock, setVanStock] = useState(false);
  const [reconcileDocs, setReconcileDocs] = useState(false);

  const handleSoleTraderConfirm = () => {
    setSoleTraderPrefs({ vanStock, reconcileDocs });
    setMode("sole-trader");
  };

  // Sub-step: Sole Trader setup toggles
  if (subStep === "sole-trader-setup") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <HardHat className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-1">On the Tools Setup</h1>
            <p className="text-sm text-muted-foreground">Customise your workflow — you can change these later in Settings.</p>
          </div>

          <div className="space-y-4 rounded-xl border-2 border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-semibold text-card-foreground">Do you carry van stock?</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Track parts used from your van and generate restock POs.</p>
              </div>
              <Switch checked={vanStock} onCheckedChange={setVanStock} />
            </div>
            <div className="border-t border-border" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-semibold text-card-foreground">Do you reconcile supplier documents?</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Match supplier invoices/receipts against job costs.</p>
              </div>
              <Switch checked={reconcileDocs} onCheckedChange={setReconcileDocs} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setSubStep("manager-choice")}>
              Back
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSoleTraderConfirm}>
              Let's Go <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Sub-step: Manager sub-choice
  if (subStep === "manager-choice") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground mb-1">Where are you today?</h1>
            <p className="text-sm text-muted-foreground">Office or on the tools — you can switch anytime.</p>
          </div>

          <div className="grid gap-3">
            <button
              onClick={() => setMode("manage")}
              className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0 group-hover:bg-blue-500/25 transition-colors">
                  <Building2 className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-card-foreground">In the Office</h2>
                  <p className="text-sm text-muted-foreground">Full pipeline — quoting, invoicing, scheduling & reports.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSubStep("sole-trader-setup")}
              className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                  <HardHat className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-card-foreground">On the Tools</h2>
                  <p className="text-sm text-muted-foreground">Log time, track parts, complete jobs & snap photos.</p>
                </div>
              </div>
            </button>

          </div>

          <Button variant="outline" className="w-full" onClick={() => setSubStep(null)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Main screen — two choices
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Wrench className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Tradie Toolbelt</h1>
          </div>
          <p className="text-muted-foreground text-sm">How do you use the app?</p>
        </div>

        <div className="grid gap-3">
          <button
            onClick={() => { setTutorialOn(false); setMode("intro"); }}
            className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                <Receipt className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-card-foreground">Intro Tutorial</h2>
                <p className="text-sm text-muted-foreground">See the basics of the app and how it works.</p>
              </div>
            </div>
          </button>

          <div className="pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next steps (more advanced)</p>
          </div>

          <button
            onClick={() => setSubStep("manager-choice")}
            className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-card-foreground">Manager / Owner</h2>
                <p className="text-sm text-muted-foreground">You run the business and can invoice from On the Tools in the app.</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setTutorialOn(true); setMode("work"); }}
            className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                <Wrench className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-card-foreground">Employee</h2>
                <p className="text-sm text-muted-foreground">On the Tools app mode: can&apos;t invoice or see prices.</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setTutorialOn(false); setMode("timesheet"); }}
            className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-card-foreground">Timesheet Mode</h2>
                <p className="text-sm text-muted-foreground">Great for subcontractors when you don&apos;t want them to know customer information.</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
