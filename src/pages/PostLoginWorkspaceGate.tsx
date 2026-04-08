import { useEffect, useState, useCallback, useRef } from "react";
import { Building2, Wrench, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppMode, type Trade } from "@/contexts/AppModeContext";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import { useTutorial } from "@/contexts/TutorialContext";
import { supabase } from "@/lib/supabase";
import { parseBusinessProfile } from "@/lib/businessProfile";
import { persistWorkspaceChoice } from "@/services/prodDataService";
import type { StoredAppMode } from "@/lib/businessProfile";

const VALID_MODES: StoredAppMode[] = ["manage", "work", "sole-trader", "timesheet", "intro"];

interface PostLoginWorkspaceGateProps {
  onComplete: () => void;
  onSignOut?: () => void;
}

export default function PostLoginWorkspaceGate({ onComplete, onSignOut }: PostLoginWorkspaceGateProps) {
  const { setMode, setTrade, trade } = useAppMode();
  const { settings, loading, error, refresh, userId } = useUserSettings();
  const { setTutorialOn } = useTutorial();
  const [submitting, setSubmitting] = useState(false);
  const autoHandled = useRef(false);

  const finish = useCallback(
    async (mode: StoredAppMode, nextTrade: Trade) => {
      if (!userId || !settings) return;
      setSubmitting(true);
      try {
        setTrade(nextTrade);
        setMode(mode);
        if (mode === "work") setTutorialOn(settings.tutorials_enabled);
        else setTutorialOn(false);
        await persistWorkspaceChoice(userId, mode, nextTrade, settings.business_profile);
        await refresh();
        onComplete();
      } finally {
        setSubmitting(false);
      }
    },
    [userId, settings, setTrade, setMode, setTutorialOn, refresh, onComplete]
  );

  useEffect(() => {
    if (loading || !settings || !userId || autoHandled.current) return;

    const profile = parseBusinessProfile(settings.business_profile);
    const mode = profile.lastWorkspaceMode;
    if (!mode || !VALID_MODES.includes(mode)) return;

    autoHandled.current = true;
    const t = profile.trade ?? trade ?? ("electrical" as Trade);
    setTrade(t);
    setMode(mode);
    if (mode === "work") setTutorialOn(settings.tutorials_enabled);
    else setTutorialOn(false);
    onComplete();
  }, [loading, settings, userId, trade, setTrade, setMode, setTutorialOn, onComplete]);

  const pickManage = () => {
    const t = trade ?? ("electrical" as Trade);
    void finish("manage", t);
  };

  const pickWork = () => {
    const t = trade ?? ("electrical" as Trade);
    void finish("work", t);
  };

  const pickTimesheet = () => {
    const t = trade ?? ("electrical" as Trade);
    void finish("timesheet", t);
  };

  if (loading || submitting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-sm text-destructive text-center max-w-md">{error}</p>
        <Button variant="outline" onClick={() => void refresh()}>
          Retry
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await supabase.auth.signOut();
            (onSignOut ?? onComplete)();
          }}
        >
          Sign out
        </Button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">No session</p>
      </div>
    );
  }

  const profile = parseBusinessProfile(settings.business_profile);
  if (profile.lastWorkspaceMode && VALID_MODES.includes(profile.lastWorkspaceMode)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Opening your workspace…</p>
      </div>
    );
  }

  const showTools = settings.show_tools_mode !== false;
  const showTimesheet = settings.show_timesheet_mode !== false;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Where are you working today?</h1>
          <p className="text-sm text-muted-foreground">We&apos;ll remember your choice in Supabase. Change anytime from the header menu.</p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={pickManage}
            className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-card-foreground">Office</h2>
                <p className="text-sm text-muted-foreground">Manager / owner — pipeline, customers, quotes.</p>
              </div>
            </div>
          </button>

          {showTools && (
            <button
              type="button"
              disabled={submitting}
              onClick={pickWork}
              className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Wrench className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-card-foreground">On the tools</h2>
                  <p className="text-sm text-muted-foreground">Field mode — schedule, job cards, time.</p>
                </div>
              </div>
            </button>
          )}

          {showTimesheet && (
            <button
              type="button"
              disabled={submitting}
              onClick={pickTimesheet}
              className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-card-foreground">Timesheet only</h2>
                  <p className="text-sm text-muted-foreground">Minimal view for subcontractors.</p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
