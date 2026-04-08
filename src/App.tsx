import { Toaster } from "@/components/ui/toaster";

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ThresholdProvider } from "@/contexts/ThresholdContext";
import { NotificationStyleProvider } from "@/contexts/NotificationStyleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToolbarPositionProvider, useToolbarPosition } from "@/contexts/ToolbarPositionContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { AppModeProvider, useAppMode } from "@/contexts/AppModeContext";
import { UserSettingsProvider } from "@/contexts/UserSettingsContext";
import { DemoDataProvider } from "@/contexts/DemoDataContext";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { EntryFlowActionsProvider } from "@/contexts/EntryFlowContext";
import { JobPrefixProvider } from "@/contexts/JobPrefixContext";
import { BackendProvider } from "@/contexts/BackendContext";
import { BackendLogPanel } from "@/components/BackendLogPanel";
import { AppHeader } from "@/components/AppHeader";
import { ModePicker } from "@/components/ModePicker";
import { TradePicker } from "@/components/TradePicker";
import { WorkBottomNav } from "@/components/WorkBottomNav";
import Hub from "./pages/Hub";
import Index from "./pages/Index";
import JobCard from "./pages/JobCard";
import WorkHome from "./pages/WorkHome";
import TimesheetHome from "./pages/TimesheetHome";
import WorkJobCard from "./components/job/WorkJobCard";
import TimesheetOnlyJobCard from "./components/job/TimesheetOnlyJobCard";
import WorkNewJob from "./pages/WorkNewJob";
import IntroJobFlow from "./pages/IntroJobFlow";
import Customers from "./pages/Customers";
import CustomerCard from "./pages/CustomerCard";
import SettingsPage from "./pages/SettingsPage";
import QuotePage from "./pages/QuotePage";
import ComingSoon from "./pages/ComingSoon";
import WorkHub from "./pages/WorkHub";
import WorkTimesheet from "./pages/WorkTimesheet";
import IntroInvoices from "./pages/IntroInvoices";
import WorkNotes from "./pages/WorkNotes";
import WorkChat from "./pages/WorkChat";
import BundlesPage from "./pages/BundlesPage";
import SchedulePage from "./pages/SchedulePage";
import EmailTemplatesPage from "./pages/EmailTemplatesPage";
import SmsTemplatesPage from "./pages/SmsTemplatesPage";
import InvoicePage from "./pages/InvoicePage";

import NotFound from "./pages/NotFound";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import LoginPage from "./pages/LoginPage";
import { resolveLandingPath } from "@/lib/navigation/resolveLanding";
import EntryPage from "./pages/EntryPage";
import PostLoginWorkspaceGate from "./pages/PostLoginWorkspaceGate";

const queryClient = new QueryClient();

function AppLayout() {
  const { mode, trade, isWorkMode, isTimesheetOnlyMode, isIntroMode, clearMode, clearTrade } = useAppMode();
  const { position } = useToolbarPosition();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveToolbarPosition =
    isWorkMode && isMobile && (position === "left" || position === "right") ? "bottom" : position;

  type EntryStep = "entry" | "login" | "post_login_workspace" | "trade" | "mode" | "ready";
  const [entryStep, setEntryStep] = useState<EntryStep>(() => (mode && trade ? "ready" : "entry"));

  const beginPostLogin = () => setEntryStep("post_login_workspace");

  const goToLogin = useCallback(async () => {
    navigate("/", { replace: true });
    await supabase.auth.signOut();
    setEntryStep("login");
  }, [navigate]);

  const goToEntry = useCallback(async () => {
    navigate("/", { replace: true });
    await supabase.auth.signOut();
    clearMode();
    clearTrade();
    setEntryStep("entry");
  }, [navigate, clearMode, clearTrade]);

  const withEntryActions = (node: ReactNode) => (
    <EntryFlowActionsProvider goToLogin={goToLogin} goToEntry={goToEntry}>
      {node}
    </EntryFlowActionsProvider>
  );

  useEffect(() => {
    if (entryStep === "trade" && trade) {
      setEntryStep(mode ? "ready" : "mode");
      return;
    }
    if (entryStep === "mode" && mode) {
      setEntryStep(trade ? "ready" : "trade");
      return;
    }
    if (entryStep === "ready" && (!trade || !mode)) {
      setEntryStep(!trade ? "trade" : "mode");
    }
  }, [entryStep, trade, mode]);

  useEffect(() => {
    if (!mode || entryStep !== "ready") return;
    if (location.pathname !== "/") return;
    const target = resolveLandingPath(mode);
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [mode, entryStep, navigate, location.pathname]);

  if (entryStep === "entry") {
    return withEntryActions(
      <EntryPage
        onLogin={() => setEntryStep("login")}
        onDemo={() => setEntryStep(trade ? (mode ? "ready" : "mode") : "trade")}
      />
    );
  }

  if (entryStep === "login") {
    return withEntryActions(
      <LoginPage
        onSuccess={beginPostLogin}
        onBack={() => setEntryStep("entry")}
      />
    );
  }

  if (entryStep === "post_login_workspace") {
    return withEntryActions(
      <PostLoginWorkspaceGate
        onComplete={() => setEntryStep("ready")}
        onSignOut={() => setEntryStep("entry")}
      />
    );
  }

  if (!trade || entryStep === "trade") {
    return withEntryActions(<TradePicker />);
  }

  if (!mode || entryStep === "mode") {
    return withEntryActions(<ModePicker />);
  }

  return withEntryActions(
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div
        className={cn(
          isWorkMode && effectiveToolbarPosition === "bottom" && "pb-16",
          isWorkMode && effectiveToolbarPosition === "top" && "pt-14",
          isWorkMode && effectiveToolbarPosition === "left" && "pl-16",
          isWorkMode && effectiveToolbarPosition === "right" && "pr-16"
        )}
      >
        <Routes>
          {isWorkMode ? (
            isTimesheetOnlyMode ? (
              <>
                <Route path="/" element={<TimesheetHome />} />
                <Route path="/hub" element={<TimesheetHome />} />
                <Route path="/job/:id" element={<TimesheetOnlyJobCard />} />
                <Route path="/timesheet" element={<WorkTimesheet />} />
                <Route path="/schedule" element={<TimesheetHome />} />
                <Route path="*" element={<TimesheetHome />} />
              </>
            ) : isIntroMode ? (
              <>
                <Route path="/" element={<IntroJobFlow />} />
                <Route path="/intro-invoices" element={<IntroInvoices />} />
                <Route path="*" element={<IntroJobFlow />} />
              </>
            ) : (
              <>
                <Route path="/" element={<WorkHome />} />
                <Route path="/hub" element={<WorkHome />} />
                <Route path="/job/:id" element={<WorkJobCard />} />
                <Route path="/new-job" element={<WorkNewJob />} />
                <Route path="/work-notes" element={<WorkNotes />} />
                <Route path="/work-chat" element={<WorkChat />} />
                <Route path="/work-hub" element={<WorkHub />} />
                <Route path="/timesheet" element={<WorkTimesheet />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/quote/:id" element={<QuotePage />} />
                <Route path="*" element={<WorkHome />} />
              </>
            )
          ) : (
            <>
              <Route path="/" element={<Index />} />
              <Route path="/hub" element={<Hub />} />
              <Route path="/pipeline" element={<Index />} />
              <Route path="/job/:id" element={<JobCard />} />
              <Route path="/quote/:id" element={<QuotePage />} />
              <Route path="/invoice/:id" element={<InvoicePage />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customer/:id" element={<CustomerCard />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/bundles" element={<BundlesPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/email-templates" element={<EmailTemplatesPage />} />
              <Route path="/sms-templates" element={<SmsTemplatesPage />} />
              
              <Route path="/coming-soon" element={<ComingSoon />} />
              <Route path="*" element={<NotFound />} />
            </>
          )}
        </Routes>
      </div>
      {isWorkMode && <WorkBottomNav />}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BackendProvider>
      <JobPrefixProvider>
      <AppModeProvider>
      <TutorialProvider>
      <ToolbarPositionProvider>
      <UserSettingsProvider>
      <DemoDataProvider>
      <ThresholdProvider>
      <NotificationStyleProvider>
        <TooltipProvider>
          <Toaster />
          <BackendLogPanel />
          <BrowserRouter>
            <ScrollToTop />
            <AppLayout />
          </BrowserRouter>
        </TooltipProvider>
      </NotificationStyleProvider>
      </ThresholdProvider>
      </DemoDataProvider>
      </UserSettingsProvider>
      </ToolbarPositionProvider>
      </TutorialProvider>
      </AppModeProvider>
      </JobPrefixProvider>
      </BackendProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
