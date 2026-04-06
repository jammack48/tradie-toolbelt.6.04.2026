import { LogIn, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EntryPageProps {
  onLogin: () => void;
  onDemo: () => void;
}

export default function EntryPage({ onLogin, onDemo }: EntryPageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Tradie Toolbelt</h1>
          <p className="text-sm text-muted-foreground">Choose how you want to start.</p>
        </div>

        <div className="space-y-3 rounded-xl border-2 border-border bg-card p-5">
          <Button className="w-full h-12 gap-2" onClick={onLogin}>
            <LogIn className="w-4 h-4" />
            Login
          </Button>
          <Button variant="outline" className="w-full h-12 gap-2" onClick={onDemo}>
            <PlayCircle className="w-4 h-4" />
            Demo mode
          </Button>
        </div>
      </div>
    </div>
  );
}
