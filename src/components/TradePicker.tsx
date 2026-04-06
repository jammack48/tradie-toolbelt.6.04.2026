import { Zap, Wind, Droplets, Square, Building2, Wrench, Paintbrush, TreePine, Home } from "lucide-react";
import { useAppMode, type Trade } from "@/contexts/AppModeContext";

const trades: { id: Trade; label: string; icon: React.ElementType }[] = [
  { id: "electrical", label: "Electrical", icon: Zap },
  { id: "hvac", label: "HVAC", icon: Wind },
  { id: "plumbing", label: "Plumbing", icon: Droplets },
  { id: "glazing", label: "Glazing", icon: Square },
  { id: "building", label: "Building", icon: Building2 },
  { id: "mechanic", label: "Mechanic", icon: Wrench },
  { id: "painting", label: "Painting", icon: Paintbrush },
  { id: "landscaping", label: "Landscaping", icon: TreePine },
  { id: "roofer", label: "Roofer", icon: Home },
];

export function TradePicker() {
  const { setTrade } = useAppMode();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">What's your trade?</h1>
          <p className="text-muted-foreground text-sm">We'll set up demo jobs tailored to your industry</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {trades.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTrade(id)}
              className="flex flex-col items-center gap-2 p-5 rounded-xl border border-border bg-card hover:border-primary hover:bg-accent transition-colors"
            >
              <Icon className="h-7 w-7 text-primary" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
