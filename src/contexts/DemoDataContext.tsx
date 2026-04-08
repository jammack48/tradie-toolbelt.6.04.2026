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
import {
  fetchProdCustomers,
  fetchProdCatalogueMaterials,
  insertProdCustomer,
} from "@/services/prodDataService";
import { useAppMode } from "@/contexts/AppModeContext";
import { useUserSettings } from "@/contexts/UserSettingsContext";
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
  usingProdData: boolean;
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(undefined);

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const { trade } = useAppMode();
  const { userId, companyId, loading: settingsLoading } = useUserSettings();
  const useProdDataset = Boolean(userId && companyId);

  const [jobs, setJobs] = useState<DemoJob[]>([]);
  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [materials, setMaterials] = useState<DemoMaterial[]>(() => materialsSeed as DemoMaterial[]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!trade) {
      setJobs([]);
      setSessionId(null);
      setLoading(false);
      return;
    }

    if (useProdDataset) {
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
  }, [trade, useProdDataset]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (settingsLoading) return;

      if (useProdDataset && companyId) {
        setLoading(true);
        try {
          const [custs, mats] = await Promise.all([
            fetchProdCustomers(companyId),
            fetchProdCatalogueMaterials(companyId),
          ]);
          if (!cancelled) {
            setCustomers(custs);
            setMaterials(mats.length > 0 ? mats : (materialsSeed as DemoMaterial[]));
          }
        } catch (err) {
          console.error("Failed to load production data:", err);
          if (!cancelled) {
            setCustomers([]);
            setMaterials(materialsSeed as DemoMaterial[]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const custs = await fetchCustomers();
        if (!cancelled) setCustomers(custs);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        if (!cancelled) {
          setMaterials(materialsSeed as DemoMaterial[]);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [useProdDataset, companyId, settingsLoading]);

  const updateJobStage = useCallback((jobId: string, stage: Stage) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, stage, ageDays: 0 } : j))
    );

    if (useProdDataset) return;

    if (sessionId) {
      updateSessionJobStage(sessionId, jobId, stage).catch((err) => {
        console.error("Failed to persist stage change:", err);
      });
    }
  }, [sessionId, useProdDataset]);

  const addCustomer = useCallback(async (customer: Omit<DemoCustomer, "id">): Promise<number | undefined> => {
    try {
      if (useProdDataset && companyId) {
        const newCust = await insertProdCustomer(companyId, customer);
        setCustomers((prev) => [...prev, newCust]);
        return newCust.id;
      }
      const newCust = await dbAddCustomer(customer);
      setCustomers((prev) => [...prev, newCust]);
      return newCust.id;
    } catch (err) {
      console.error("Failed to add customer:", err);
      return undefined;
    }
  }, [useProdDataset, companyId]);

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
    if (useProdDataset) return;

    if (!trade) {
      setJobs([]);
      return;
    }

    setLoading(true);

    (async () => {
      try {
        if (sessionId) {
          await resetSession(sessionId, trade);
        }

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
  }, [trade, sessionId, useProdDataset]);

  const value = useMemo<DemoDataContextType>(() => ({
    jobs,
    customers,
    materials,
    schedule: scheduleSeed as DemoScheduleItem[],
    jobsByStage: (stage) => jobs.filter((job) => job.stage === stage),
    updateJobStage,
    addCustomer,
    addJob,
    resetDemo,
    loading,
    usingProdData: useProdDataset,
  }), [jobs, customers, materials, updateJobStage, addCustomer, addJob, resetDemo, loading, useProdDataset]);

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDemoData() {
  const ctx = useContext(DemoDataContext);
  if (!ctx) throw new Error("useDemoData must be used within DemoDataProvider");
  return ctx;
}
