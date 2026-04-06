import React, { createContext, useContext, useState, useEffect } from "react";

interface TutorialContextType {
  tutorialOn: boolean;
  setTutorialOn: (on: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType>({ tutorialOn: false, setTutorialOn: () => {} });

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [tutorialOn, setTutorialOn] = useState(() => {
    try { const v = localStorage.getItem("tutorialOn"); return v === null ? true : v === "true"; } catch { return true; }
  });

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
