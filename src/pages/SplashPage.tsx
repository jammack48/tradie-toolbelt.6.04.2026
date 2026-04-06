import { ArrowRight, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SplashPageProps {
  onStart: () => void;
}

export default function SplashPage({ onStart }: SplashPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Wrench className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Tradie Toolbelt</h1>
        </div>

        <Badge variant="secondary" className="text-xs tracking-wide uppercase">Beta Demo</Badge>

        <div className="rounded-xl border-2 border-border bg-card p-6 text-left space-y-4">
          <p className="text-base font-semibold text-card-foreground">Hey! I'm Jamie 👋</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thanks for checking out my app idea. The goal is to build a <span className="text-foreground font-medium">job management app for tradies</span> — from one-man bands to small companies — that you can actually run from your phone.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            It's in beta, so <span className="text-foreground font-medium">all the data is fake</span> and you can't break anything. Have a play with everything and please give me all your feedback — it's hugely appreciated to help shape the product.
          </p>
        </div>

        <Button size="lg" className="w-full h-12 text-base gap-2" onClick={onStart}>
          Start Demo <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
