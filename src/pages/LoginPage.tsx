import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts/ThemeContext";

interface LoginPageProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function LoginPage({ onSuccess, onBack }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTheme, setIsDark } = useTheme();

  useLayoutEffect(() => {
    setTheme("earthy");
    setIsDark(true);
  }, [setTheme, setIsDark]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted && data.session) onSuccess();
    });

    return () => {
      isMounted = false;
    };
  }, [onSuccess]);

  const isDisabled = useMemo(() => !email.trim() || !password.trim() || submitting, [email, password, submitting]);

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Login</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue to your workspace.</p>
        </div>

        <div className="space-y-4 rounded-xl border-2 border-border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full gap-2" onClick={handleLogin} disabled={isDisabled}>
            <LogIn className="w-4 h-4" />
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
