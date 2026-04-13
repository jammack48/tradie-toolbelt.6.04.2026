import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import {
  parseBusinessProfile,
  type BusinessProfile,
  QUOTE_TEMPLATE_VARIABLE_HINTS,
  quoteMessagingFromProfile,
} from "@/lib/businessProfile";
import { mergeBusinessProfile } from "@/services/prodDataService";
import { toast } from "@/hooks/use-toast";

export function QuoteDeliveryTemplatesForm() {
  const { userId, settings, refresh } = useUserSettings();
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [saving, setSaving] = useState(false);
  const targetField = useRef<"subject" | "email" | "sms">("email");

  useEffect(() => {
    const p = parseBusinessProfile(settings?.business_profile);
    const q = quoteMessagingFromProfile(p);
    setSubject(q.quoteEmailSubject);
    setEmailBody(q.quoteEmailBody);
    setSmsBody(q.quoteSmsBody);
  }, [settings?.business_profile]);

  const insertVariable = (token: string) => {
    const t = targetField.current;
    if (t === "subject") setSubject((s) => s + token);
    else if (t === "sms") setSmsBody((s) => s + token);
    else setEmailBody((s) => s + token);
  };

  const save = async () => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Log in to save quote delivery templates.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const patch: BusinessProfile = {
        quoteEmailSubject: subject.trim() || undefined,
        quoteEmailBody: emailBody.trim() || undefined,
        quoteSmsBody: smsBody.trim() || undefined,
      };
      await mergeBusinessProfile(userId, settings?.business_profile, patch);
      await refresh();
      toast({ title: "Saved", description: "Quote email and SMS templates updated." });
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-card-foreground">Quote delivery templates</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Used when you send a quote by email or SMS. API keys for Resend and SMS Everyone are set on the server (e.g.
          Render), not in this app.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Email subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onFocus={() => {
            targetField.current = "subject";
          }}
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Email body</Label>
        <Textarea
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          onFocus={() => {
            targetField.current = "email";
          }}
          className="min-h-[120px] text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">SMS body</Label>
        <Textarea
          value={smsBody}
          onChange={(e) => setSmsBody(e.target.value)}
          onFocus={() => {
            targetField.current = "sms";
          }}
          className="min-h-[72px] text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-muted-foreground">Insert into focused field:</span>
        {QUOTE_TEMPLATE_VARIABLE_HINTS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insertVariable(v)}
            className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-primary/10"
          >
            {v}
          </button>
        ))}
      </div>

      <Button size="sm" onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save templates"}
      </Button>
    </div>
  );
}
