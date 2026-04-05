import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SplashPageProps {
  onSignIn: () => void;
  onDemo: () => void;
}

export default function SplashPage({ onSignIn, onDemo }: SplashPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2.5">
            <Wrench className="w-9 h-9 text-primary" />
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Tradie Toolbelt</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Job management for tradies — from your phone.
          </p>
          <Badge variant="secondary" className="text-[10px] tracking-widest uppercase">Beta</Badge>
        </div>

        <div className="space-y-3">
          <Button size="lg" className="w-full h-12 text-base" onClick={onSignIn}>
            Sign In
          </Button>
          <Button size="lg" variant="outline" className="w-full h-12 text-base" onClick={onDemo}>
            Try Demo
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/60">
          Demo mode uses fake data — explore freely, nothing breaks.
        </p>
      </div>
    </div>
  );
}
