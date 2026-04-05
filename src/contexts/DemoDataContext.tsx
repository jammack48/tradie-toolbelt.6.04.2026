import { createContext, useContext, useEffect, useMemo, useState, useCallback, type Context, type ReactNode } from "react";
import type { DemoCustomer, DemoJob, DemoMaterial, DemoScheduleItem } from "@/types/demoData";
import type { Stage } from "@/data/dummyJobs";
import { fetchCustomers, dbAddCustomer } from "@/services/dbDemoService";
import { useAuth } from "@/contexts/AuthContext";
import jobsSeed from "@/demo-data/jobs.json";
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
  refreshCustomers: () => Promise<void>;
  loading: boolean;
}

declare global {
  var __demoDataContextSingleton: Context<DemoDataContextType | undefined> | undefined;
}

const DemoDataContext = globalThis.__demoDataContextSingleton ?? createContext<DemoDataContextType | undefined>(undefined);
globalThis.__demoDataContextSingleton = DemoDataContext;
DemoDataContext.displayName = "DemoDataContext";

function loadSeedJobs(): DemoJob[] {
  return jobsSeed as unknown as DemoJob[];
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const { isDemo, user } = useAuth();
  const [jobs, setJobs] = useState<DemoJob[]>(() => (isDemo ? loadSeedJobs() : []));
  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCustomers = useCallback(async () => {
    const custs = await fetchCustomers(isDemo);
    setCustomers(custs);
  }, [isDemo]);

  useEffect(() => {
    setJobs(isDemo ? loadSeedJobs() : []);
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const custs = await fetchCustomers(isDemo);
        if (!cancelled) setCustomers(custs);
      } catch (err) {
        console.error("Failed to load customers from DB:", err);
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isDemo, user]);

  const updateJobStage = useCallback((jobId: string, stage: Stage) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, stage, ageDays: 0 } : j)));
  }, []);

  const addCustomer = useCallback(async (customer: Omit<DemoCustomer, "id">): Promise<number | undefined> => {
    try {
      const newCust = await dbAddCustomer(customer, isDemo);
      setCustomers((prev) => [...prev, newCust]);
      return newCust.id;
    } catch (err) {
      console.error("Failed to add customer:", err);
      return undefined;
    }
  }, [isDemo]);

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
    if (!isDemo) return;
    setJobs(loadSeedJobs());
  }, [isDemo]);

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
    refreshCustomers,
    loading,
  }), [jobs, customers, updateJobStage, addCustomer, addJob, resetDemo, refreshCustomers, loading]);

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
}

export function useDemoData() {
  const ctx = useContext(DemoDataContext);
  if (!ctx) throw new Error("useDemoData must be used within DemoDataProvider");
  return ctx;
}
