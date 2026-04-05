import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type VoiceInputButtonProps = {
  onTranscript: (text: string) => void;
  className?: string;
};

export function VoiceInputButton({ onTranscript, className }: VoiceInputButtonProps) {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  const stop = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // no-op
    }
    setListening(false);
  };

  const start = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not supported", description: "Voice dictation isn't available in this browser." });
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast({ title: "Dictation failed", description: "Please try speaking again." });
    };
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim?.();
      if (transcript) onTranscript(transcript);
    };

    recognition.start();
  };

  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
      size="sm"
      className={className}
      onClick={listening ? stop : start}
      title={listening ? "Stop dictation" : "Start dictation"}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      <span className="ml-1">{listening ? "Stop" : "Dictate"}</span>
    </Button>
  );
}
