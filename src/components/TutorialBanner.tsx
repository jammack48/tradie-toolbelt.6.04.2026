import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, GraduationCap } from "lucide-react";
import { useTutorial } from "@/contexts/TutorialContext";
import { tutorialPages, getTutorialKey } from "@/data/tutorialContent";

export function TutorialBanner({ overrideKey, tabKey }: { overrideKey?: string; tabKey?: string }) {
  const { tutorialOn } = useTutorial();
  const { pathname } = useLocation();
  const routeKey = overrideKey ?? getTutorialKey(pathname);

  // Compose lookup: try "routeKey:tabKey" first, fall back to "routeKey"
  const composedKey = routeKey && tabKey ? `${routeKey}:${tabKey}` : routeKey;
  const key = composedKey && tutorialPages[composedKey] ? composedKey : routeKey;

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Reset dismissed when navigating to a new page
  const [prevKey, setPrevKey] = useState(key);
  useEffect(() => {
    if (key !== prevKey) {
      setPrevKey(key);
    }
  }, [key, prevKey]);

  if (!tutorialOn || !key) return null;
  const entry = tutorialPages[key];
  if (!entry) return null;
  if (dismissed.has(key)) return null;

  return (
    <div className="mx-3 sm:mx-6 mt-2 sm:mt-3 mb-1 rounded-lg border border-blue-400 bg-blue-500 px-3 sm:px-4 py-2 sm:py-3 flex items-start gap-2 sm:gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-white">{entry.title}</p>
        <p className="text-xs sm:text-sm text-white/80 mt-0.5 leading-relaxed">{entry.body}</p>
      </div>
      <button
        onClick={() => setDismissed((prev) => new Set(prev).add(key))}
        className="shrink-0 text-white/70 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
        aria-label="Dismiss tutorial"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
