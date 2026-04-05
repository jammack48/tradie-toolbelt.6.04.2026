import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Loader2, CheckCircle } from "lucide-react";
import { authSupabase } from "@/lib/authSupabase";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!authSupabase) {
      setChecking(false);
      return;
    }
    // Check if user has an active session (set by recovery link)
    authSupabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (!authSupabase) {
      toast({ title: "Auth not configured", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await authSupabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Password Updated</h2>
          <p className="text-sm text-muted-foreground">Your password has been set. You can now sign in.</p>
          <Button className="w-full" onClick={() => window.location.href = "/"}>
            Go to App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Wrench className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Set Password</h1>
        </div>

        {!hasSession && (
          <p className="text-sm text-muted-foreground text-center">
            This page requires a valid recovery link. Check your email for the link.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-pw">New Password</Label>
            <Input id="new-pw" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Confirm Password</Label>
            <Input id="confirm-pw" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading || !hasSession}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
