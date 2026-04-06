import { Toaster } from "@/components/ui/toaster";

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ThresholdProvider } from "@/contexts/ThresholdContext";
import { NotificationStyleProvider } from "@/contexts/NotificationStyleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToolbarPositionProvider, useToolbarPosition } from "@/contexts/ToolbarPositionContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { AppModeProvider, useAppMode } from "@/contexts/AppModeContext";
import { DemoDataProvider } from "@/contexts/DemoDataContext";
import { useState, useEffect } from "react";
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
import SplashPage from "./pages/SplashPage";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient();

function AppLayout() {
  const { mode, trade, isWorkMode, isTimesheetOnlyMode, isIntroMode } = useAppMode();
  const { position } = useToolbarPosition();
  const [splashDismissed, setSplashDismissed] = useState(false);

  // If mode and trade are already saved in localStorage, skip pickers.
  // Only show splash → trade → mode on very first visit (when nothing is stored).

  if (!splashDismissed) {
    return <SplashPage onStart={() => setSplashDismissed(true)} />;
  }

  if (!trade) {
    return <TradePicker />;
  }

  if (!mode) {
    return <ModePicker />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div
        className={cn(
          isWorkMode && position === "bottom" && "pb-16",
          isWorkMode && position === "top" && "pt-14",
          isWorkMode && position === "left" && "pl-16",
          isWorkMode && position === "right" && "pr-16"
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
      <DemoDataProvider>
      <TutorialProvider>
      <ToolbarPositionProvider>
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
      </ToolbarPositionProvider>
      </TutorialProvider>
      </DemoDataProvider>
      </AppModeProvider>
      </JobPrefixProvider>
      </BackendProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
