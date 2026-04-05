import React, { createContext, useContext, useState, useEffect } from "react";
import { useUserSettings } from "@/contexts/UserSettingsContext";

interface TutorialContextType {
  tutorialOn: boolean;
  setTutorialOn: (on: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType>({ tutorialOn: false, setTutorialOn: () => {} });

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useUserSettings();
  const [tutorialOn, setTutorialOn] = useState(() => {
    try { const v = localStorage.getItem("tutorialOn"); return v === null ? true : v === "true"; } catch { return true; }
  });

  useEffect(() => {
    setTutorialOn(settings.tutorialsEnabled);
  }, [settings.tutorialsEnabled]);

  useEffect(() => {
    localStorage.setItem("tutorialOn", String(tutorialOn));
  }, [tutorialOn]);

  return (
    <TutorialContext.Provider value={{ tutorialOn, setTutorialOn }}>
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => useContext(TutorialContext);
