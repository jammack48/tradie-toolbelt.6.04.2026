import { useCallback, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { sanitizeTranscript } from "@/lib/speechText";

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceInputButtonProps {
  /** Appends recognized text (with leading space if value already has content). */
  onTranscript: (text: string) => void;
  className?: string;
  title?: string;
}

export function VoiceInputButton({
  onTranscript,
  className,
  title = "Speak to type (uses device speech recognition)",
}: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      toast({
        title: "Voice input unavailable",
        description: "Try Chrome or Edge on a secure (HTTPS) connection.",
        variant: "destructive",
      });
      return;
    }

    if (listening) {
      stop();
      return;
    }

    const rec = new SR();
    rec.lang = navigator.language?.startsWith("en") ? navigator.language : "en-NZ";
    rec.interimResults = false;
    rec.continuous = false;
    recRef.current = rec;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const text = sanitizeTranscript(event.results[event.resultIndex]?.[0]?.transcript ?? "");
      if (text) onTranscript(text);
      stop();
    };

    rec.onerror = () => {
      toast({ title: "Voice input failed", description: "Check microphone permission.", variant: "destructive" });
      stop();
    };

    rec.onend = () => setListening(false);

    try {
      rec.start();
      setListening(true);
    } catch {
      toast({ title: "Could not start microphone", variant: "destructive" });
      setListening(false);
    }
  }, [listening, onTranscript, stop]);

  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
      size="icon"
      className={cn("h-9 w-9 shrink-0", listening && "animate-pulse", className)}
      title={title}
      aria-pressed={listening}
      onClick={() => (listening ? stop() : start())}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
