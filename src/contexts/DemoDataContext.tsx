import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import type { DemoCustomer, DemoJob, DemoMaterial, DemoScheduleItem } from "@/types/demoData";
import type { Stage } from "@/data/dummyJobs";
import {
  getOrCreateSession,
  fetchSessionJobs,
  updateSessionJobStage,
  resetSession,
  fetchCustomers,
  dbAddCustomer,
} from "@/services/dbDemoService";
import { useAppMode } from "@/contexts/AppModeContext";
import materialsSeed from "@/demo-data/materials.json";
import scheduleSeed from "@/demo-data/schedule.json";

interface DemoDataContextType {
  jobs: DemoJob[];
  customers: DemoCustomer[];
  materials: DemoMaterial[];
  schedule: DemoScheduleItem[];
  jobsByStage: (stage: Stage) => DemoJob[];
  updateJobStage: (jobId: string, stage: Stage) => void;
  addCustomer: (customer: Omit<DemoCustomer, "id">) => Promise<number | undefined>;
  addJob: (job: { client: string; jobName: string; value: number; stage: Stage }) => void;
  resetDemo: () => void;
  loading: boolean;
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(undefined);

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const { trade } = useAppMode();
  const [jobs, setJobs] = useState<DemoJob[]>([]);
  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize or switch session when trade changes
  useEffect(() => {
    if (!trade) {
      setJobs([]);
      setSessionId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setJobs([]);
    setLoading(true);

    (async () => {
      try {
        const sid = await getOrCreateSession(trade);
        if (cancelled) return;
        setSessionId(sid);

        const sessionJobs = await fetchSessionJobs(sid);
        if (!cancelled) setJobs(sessionJobs);
      } catch (err) {
        console.error("Failed to load demo session:", err);
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [trade]);

  // Load customers on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const custs = await fetchCustomers();
        if (!cancelled) setCustomers(custs);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Update job stage — persists to DB
  const updateJobStage = useCallback((jobId: string, stage: Stage) => {
    // Optimistic local update
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, stage, ageDays: 0 } : j))
    );

    // Persist to DB
    if (sessionId) {
      updateSessionJobStage(sessionId, jobId, stage).catch((err) => {
        console.error("Failed to persist stage change:", err);
      });
    }
  }, [sessionId]);

  const addCustomer = useCallback(async (customer: Omit<DemoCustomer, "id">): Promise<number | undefined> => {
    try {
      const newCust = await dbAddCustomer(customer);
      setCustomers((prev) => [...prev, newCust]);
      return newCust.id;
    } catch (err) {
      console.error("Failed to add customer:", err);
      return undefined;
    }
  }, []);

  const addJob = useCallback((job: { client: string; jobName: string; value: number; stage: Stage }) => {
    const tempId = `JOB-${Date.now()}`;
    const newJob: DemoJob = {
      id: tempId,
      client: job.client,
      jobName: job.jobName,
      value: job.value,
      ageDays: 0,
      urgent: false,
      stage: job.stage,
    };
    setJobs((prev) => [...prev, newJob]);
  }, []);

  const resetDemo = useCallback(() => {
    if (!trade) {
      setJobs([]);
      return;
    }

    setLoading(true);

    (async () => {
      try {
        // Reset existing session
        if (sessionId) {
          await resetSession(sessionId, trade);
        }

        // Create fresh session
        const newSid = await getOrCreateSession(trade);
        setSessionId(newSid);

        const freshJobs = await fetchSessionJobs(newSid);
        setJobs(freshJobs);
      } catch (err) {
        console.error("Failed to reset demo:", err);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [trade, sessionId]);

  const value = useMemo<DemoDataContextType>(() => ({
    jobs,
    customers,
    materials: materialsSeed as DemoMaterial[],
    schedule: scheduleSeed as DemoScheduleItem[],
    jobsByStage: (stage) => jobs.filter((job) => job.stage === stage),
    updateJobStage,
    addCustomer,
    addJob,
    resetDemo,
    loading,
  }), [jobs, customers, updateJobStage, addCustomer, addJob, resetDemo, loading]);

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDemoData() {
  const ctx = useContext(DemoDataContext);
  if (!ctx) throw new Error("useDemoData must be used within DemoDataProvider");
  return ctx;
}
