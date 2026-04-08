import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import { parseBusinessProfile, type BusinessProfile } from "@/lib/businessProfile";
import { mergeBusinessProfile } from "@/services/prodDataService";
import { toast } from "@/hooks/use-toast";

const FIELDS: { key: keyof BusinessProfile; label: string; placeholder: string }[] = [
  { key: "displayName", label: "Your first name (tools greeting)", placeholder: "e.g. James" },
  { key: "businessName", label: "Business name", placeholder: "Your trading name" },
  { key: "abn", label: "ABN / NZBN", placeholder: "" },
  { key: "phone", label: "Phone", placeholder: "" },
  { key: "email", label: "Email", placeholder: "" },
  { key: "address", label: "Address", placeholder: "" },
  { key: "website", label: "Website", placeholder: "https://" },
];

export function BusinessProfileForm() {
  const { userId, settings, refresh } = useUserSettings();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = parseBusinessProfile(settings?.business_profile);
    const next: Record<string, string> = {};
    for (const { key } of FIELDS) {
      const v = p[key];
      next[key] = typeof v === "string" ? v : "";
    }
    setForm(next);
  }, [settings?.business_profile]);

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!userId) {
      toast({ title: "Sign in required", description: "Log in to save your business profile to the cloud.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const patch: BusinessProfile = {
        displayName: (form.displayName ?? "").trim() || undefined,
        businessName: (form.businessName ?? "").trim() || undefined,
        abn: (form.abn ?? "").trim() || undefined,
        phone: (form.phone ?? "").trim() || undefined,
        email: (form.email ?? "").trim() || undefined,
        address: (form.address ?? "").trim() || undefined,
        website: (form.website ?? "").trim() || undefined,
      };
      await mergeBusinessProfile(userId, settings?.business_profile, patch);
      await refresh();
      toast({ title: "Saved", description: "Business details updated." });
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`bp-${key}`} className="text-sm font-medium text-foreground">
              {label}
            </Label>
            <Input
              id={`bp-${key}`}
              value={form[key] ?? ""}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              className="text-base"
              autoComplete="off"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save business details"}
        </Button>
        {!userId && (
          <p className="text-sm text-muted-foreground">Sign in to sync these fields to your account.</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        The schedule and tools home greeting uses <strong className="text-foreground">Your first name</strong>, then your{" "}
        <strong className="text-foreground">Business name</strong>, until you fill them in it shows &quot;Not set&quot;.
      </p>
    </div>
  );
}
