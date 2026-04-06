import { jobs } from "./dummyJobs";
import type { DemoJob } from "@/types/demoData";

export interface StaffMember {
  name: string;
  role: string;
  avatar: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier: string;
  supplierDoc?: { matched: boolean; ref?: string };
}

export interface NoteEntry {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  isVoice?: boolean;
  voiceDuration?: string;
}

export interface PhotoEntry {
  id: string;
  caption: string;
  color: string;
  timestamp: string;
}

export interface TimeEntry {
  id: string;
  date: string;
  staff: string;
  hours: number;
  description: string;
}

export interface JobDetail {
  id: string;
  jobName: string;
  client: string;
  clientPhone: string;
  clientEmail: string;
  address: string;
  value: number;
  stage: string;
  ageDays: number;
  urgent: boolean;
  description: string;
  startDate: string;
  dueDate: string;
  staff: StaffMember[];
  materials: MaterialItem[];
  notes: NoteEntry[];
  photos: PhotoEntry[];
  timeEntries: TimeEntry[];
  invoiceStatus: "Draft" | "Sent" | "Paid";
  labourTotal: number;
  extrasTotal: number;
}

const staffPool: StaffMember[] = [
  { name: "Jake Turner", role: "Lead Sparky", avatar: "JT" },
  { name: "Ben Kowalski", role: "Apprentice", avatar: "BK" },
  { name: "Maia Johnson", role: "Plumber", avatar: "MJ" },
  { name: "Craig Foster", role: "Roofer", avatar: "CF" },
  { name: "Sam Te Reo", role: "Electrician", avatar: "ST" },
];

export interface CatalogueItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier: string;
  section: "labour" | "materials" | "extras";
}

export const catalogueItems: CatalogueItem[] = [
  // Materials
  { id: "m1", name: "Copper Pipe 15mm (3m)", quantity: 4, unit: "length", unitPrice: 32, supplier: "PlumbWorld", section: "materials" },
  { id: "m2", name: "PVC Elbow 90° 50mm", quantity: 12, unit: "pcs", unitPrice: 4.5, supplier: "PlumbWorld", section: "materials" },
  { id: "m3", name: "Twin & Earth 2.5mm²", quantity: 3, unit: "roll", unitPrice: 89, supplier: "Sparky Supplies", section: "materials" },
  { id: "m4", name: "LED Downlight 10W", quantity: 8, unit: "pcs", unitPrice: 24, supplier: "Sparky Supplies", section: "materials" },
  { id: "m5", name: "Silicone Sealant Clear", quantity: 2, unit: "tube", unitPrice: 12, supplier: "TradeZone", section: "materials" },
  { id: "m6", name: "Roof Screw 65mm Hex", quantity: 1, unit: "box", unitPrice: 48, supplier: "TradeZone", section: "materials" },
  { id: "m7", name: "Flexi Hose 500mm", quantity: 2, unit: "pcs", unitPrice: 18, supplier: "PlumbWorld", section: "materials" },
  { id: "m8", name: "Junction Box IP65", quantity: 4, unit: "pcs", unitPrice: 8.5, supplier: "Sparky Supplies", section: "materials" },
  // Labour
  { id: "l1", name: "Standard Install", quantity: 1, unit: "hrs", unitPrice: 85, supplier: "", section: "labour" },
  { id: "l2", name: "Call-out Fee", quantity: 1, unit: "ea", unitPrice: 120, supplier: "", section: "labour" },
  { id: "l3", name: "Apprentice Rate", quantity: 1, unit: "hrs", unitPrice: 55, supplier: "", section: "labour" },
  { id: "l4", name: "After Hours Rate", quantity: 1, unit: "hrs", unitPrice: 130, supplier: "", section: "labour" },
  // Extras
  { id: "e1", name: "Building Permit", quantity: 1, unit: "ea", unitPrice: 350, supplier: "", section: "extras" },
  { id: "e2", name: "Inspection Fee", quantity: 1, unit: "ea", unitPrice: 180, supplier: "", section: "extras" },
  { id: "e3", name: "Waste Disposal", quantity: 1, unit: "ea", unitPrice: 95, supplier: "", section: "extras" },
  { id: "e4", name: "Travel / Mileage", quantity: 1, unit: "ea", unitPrice: 65, supplier: "", section: "extras" },
];

// Keep backward compat alias
export const materialsPool = catalogueItems.filter(i => i.section === "materials");

export interface BundleTemplate {
  id: string;
  name: string;
  description: string;
  labour: { name: string; qty: number; unitPrice: number }[];
  materials: { name: string; qty: number; unitPrice: number }[];
  extras: { name: string; qty: number; unitPrice: number }[];
}

export const bundleTemplates: BundleTemplate[] = [
  {
    id: "b1",
    name: "Service Call",
    description: "Diagnose and repair fault on-site, including travel and call-out",
    labour: [{ name: "Call-out Fee", qty: 1, unitPrice: 120 }, { name: "Standard Install", qty: 1, unitPrice: 85 }],
    materials: [{ name: "Silicone Sealant Clear", qty: 1, unitPrice: 12 }],
    extras: [{ name: "Travel / Mileage", qty: 1, unitPrice: 65 }],
  },
  {
    id: "b2",
    name: "Heat Pump Install",
    description: "Supply and install split-system heat pump including electrical connection, commissioning, and building consent",
    labour: [{ name: "Standard Install", qty: 6, unitPrice: 85 }, { name: "Apprentice Rate", qty: 6, unitPrice: 55 }],
    materials: [{ name: "Twin & Earth 2.5mm²", qty: 2, unitPrice: 89 }, { name: "Junction Box IP65", qty: 2, unitPrice: 8.5 }],
    extras: [{ name: "Building Permit", qty: 1, unitPrice: 350 }],
  },
  {
    id: "b3",
    name: "Switchboard Upgrade",
    description: "Replace existing switchboard with modern RCD-protected board, rewire circuits, and test",
    labour: [{ name: "Standard Install", qty: 8, unitPrice: 85 }, { name: "Apprentice Rate", qty: 4, unitPrice: 55 }],
    materials: [{ name: "Twin & Earth 2.5mm²", qty: 3, unitPrice: 89 }, { name: "Junction Box IP65", qty: 4, unitPrice: 8.5 }, { name: "LED Downlight 10W", qty: 6, unitPrice: 24 }],
    extras: [{ name: "Inspection Fee", qty: 1, unitPrice: 180 }],
  },
  {
    id: "b4",
    name: "Maintenance",
    description: "General maintenance visit — inspect, service, and minor repairs",
    labour: [{ name: "Standard Install", qty: 2, unitPrice: 85 }],
    materials: [{ name: "Silicone Sealant Clear", qty: 1, unitPrice: 12 }],
    extras: [{ name: "Waste Disposal", qty: 1, unitPrice: 95 }],
  },
  {
    id: "b5",
    name: "Bathroom Reno",
    description: "Full bathroom renovation including plumbing, fixtures, tiling prep, and waste disposal",
    labour: [{ name: "Standard Install", qty: 16, unitPrice: 85 }, { name: "Apprentice Rate", qty: 16, unitPrice: 55 }],
    materials: [{ name: "Copper Pipe 15mm (3m)", qty: 6, unitPrice: 32 }, { name: "PVC Elbow 90° 50mm", qty: 8, unitPrice: 4.5 }, { name: "Flexi Hose 500mm", qty: 4, unitPrice: 18 }, { name: "Silicone Sealant Clear", qty: 3, unitPrice: 12 }],
    extras: [{ name: "Building Permit", qty: 1, unitPrice: 350 }, { name: "Waste Disposal", qty: 1, unitPrice: 95 }, { name: "Inspection Fee", qty: 1, unitPrice: 180 }],
  },
];

const notesPool: NoteEntry[] = [
  { id: "n1", text: "Client wants work done before Christmas. Confirmed access via side gate — code is 4821.", author: "Jake Turner", timestamp: "2 days ago" },
  { id: "n2", text: "Existing switchboard is 1970s ceramic fuses. Will need full replacement, not just upgrade. Quoted accordingly.", author: "Sam Te Reo", timestamp: "5 days ago" },
  { id: "n3", text: "Left materials in garage. Client happy for us to come and go.", author: "Ben Kowalski", timestamp: "1 day ago" },
  { id: "n4", text: "Site walkthrough complete — all good to proceed.", author: "Jake Turner", timestamp: "3 hours ago", isVoice: true, voiceDuration: "0:42" },
];

const photosPool: PhotoEntry[] = [
  { id: "p1", caption: "Switchboard before", color: "hsl(210 20% 35%)", timestamp: "2 days ago" },
  { id: "p2", caption: "Pipe damage close-up", color: "hsl(30 30% 40%)", timestamp: "2 days ago" },
  { id: "p3", caption: "Roof access point", color: "hsl(145 18% 35%)", timestamp: "1 day ago" },
  { id: "p4", caption: "Material delivery", color: "hsl(8 25% 38%)", timestamp: "1 day ago" },
  { id: "p5", caption: "Wiring run complete", color: "hsl(210 25% 30%)", timestamp: "6 hours ago" },
  { id: "p6", caption: "Final inspection", color: "hsl(30 20% 35%)", timestamp: "3 hours ago" },
];

const timePool: TimeEntry[] = [
  { id: "t1", date: "Mon 12 Feb", staff: "Jake Turner", hours: 4.5, description: "Strip out old switchboard, run new cables" },
  { id: "t2", date: "Mon 12 Feb", staff: "Ben Kowalski", hours: 4.5, description: "Assist with cable runs, tidy site" },
  { id: "t3", date: "Tue 13 Feb", staff: "Jake Turner", hours: 6, description: "Install new board, wire circuits" },
  { id: "t4", date: "Wed 14 Feb", staff: "Jake Turner", hours: 3, description: "Testing and commissioning" },
  { id: "t5", date: "Wed 14 Feb", staff: "Ben Kowalski", hours: 3, description: "Install downlights, patch holes" },
  { id: "t6", date: "Thu 15 Feb", staff: "Sam Te Reo", hours: 2, description: "Final inspection and sign-off" },
];

const addresses = [
  "14 Rata Street, Grey Lynn, Auckland 1021",
  "7 Kowhai Crescent, Mt Eden, Auckland 1024",
  "22 Pohutukawa Drive, Ponsonby, Auckland 1011",
  "9 Manuka Road, Parnell, Auckland 1052",
  "31 Rimu Lane, Remuera, Auckland 1050",
];

// Schedule demo IDs → generate a valid JobDetail from schedule data
import { DEMO_JOBS } from "@/components/schedule/scheduleData";


export function getJobDetail(jobId: string, overrides?: { client?: string; address?: string; description?: string }): JobDetail | null {
  if (jobId === "TB-NEW") {
    return {
      id: "TB-NEW",
      jobName: "New Job",
      client: overrides?.client || "New Customer",
      clientPhone: "021 555 1234",
      clientEmail: "",
      address: overrides?.address || "",
      value: 0,
      stage: "In Progress",
      ageDays: 0,
      urgent: false,
      description: overrides?.description || "Charge-up job — add parts and labour as you go.",
      startDate: new Date().toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      dueDate: "",
      staff: [staffPool[0]],
      materials: [],
      notes: [],
      photos: [],
      timeEntries: [],
      invoiceStatus: "Draft",
      labourTotal: 0,
      extrasTotal: 0,
    };
  }

  // Check schedule demo jobs
  const schedJob = DEMO_JOBS.find((j) => j.id === jobId);
  if (schedJob) {
    const idx = DEMO_JOBS.indexOf(schedJob);
    const staffCount = (idx % 3) + 1;
    const matCount = (idx % 4) + 2;
    return {
      id: schedJob.id,
      jobName: schedJob.jobName,
      client: schedJob.client,
      clientPhone: `021 ${400 + idx} ${2000 + idx}`,
      clientEmail: `${schedJob.client.split(" ")[0].toLowerCase()}@email.co.nz`,
      address: schedJob.address,
      value: 1500 + idx * 300,
      stage: schedJob.status,
      ageDays: idx + 1,
      urgent: idx % 4 === 0,
      description: `${schedJob.jobName} at ${schedJob.address}. Standard residential job.`,
      startDate: "Mon 10 Feb 2025",
      dueDate: "Fri 21 Feb 2025",
      staff: staffPool.slice(0, staffCount),
      materials: materialsPool.slice(0, matCount),
      notes: notesPool.slice(0, (idx % 3) + 1),
      photos: photosPool.slice(0, (idx % 3) + 2),
      timeEntries: timePool.slice(0, (idx % 3) + 1),
      invoiceStatus: idx % 3 === 0 ? "Paid" : idx % 3 === 1 ? "Sent" : "Draft",
      labourTotal: timePool.slice(0, (idx % 3) + 1).reduce((s, t) => s + t.hours * 85, 0),
      extrasTotal: (idx % 5) * 75,
    };
  }

  // Handle dynamically generated schedule IDs (WK-xxx-xx pattern)
  if (jobId.startsWith("WK-")) {
    const seed = jobId.split("-").reduce((s, p) => s + (parseInt(p, 10) || 0), 0);
    const staffCount = (seed % 3) + 1;
    const matCount = (seed % 4) + 2;
    return {
      id: jobId,
      jobName: overrides?.description || "Scheduled Job",
      client: overrides?.client || "Site Client",
      clientPhone: `021 ${400 + (seed % 100)} ${2000 + (seed % 100)}`,
      clientEmail: `client${seed % 50}@email.co.nz`,
      address: overrides?.address || addresses[seed % addresses.length],
      value: 1500 + (seed % 10) * 300,
      stage: "In Progress",
      ageDays: (seed % 14) + 1,
      urgent: seed % 5 === 0,
      description: overrides?.description
        ? `${overrides.description} at ${overrides.address || addresses[seed % addresses.length]}. Standard residential job.`
        : "Scheduled job — standard residential work.",
      startDate: "Mon 10 Feb 2025",
      dueDate: "Fri 21 Feb 2025",
      staff: staffPool.slice(0, staffCount),
      materials: materialsPool.slice(0, matCount),
      notes: notesPool.slice(0, (seed % 3) + 1),
      photos: photosPool.slice(0, (seed % 3) + 2),
      timeEntries: timePool.slice(0, (seed % 3) + 1),
      invoiceStatus: seed % 3 === 0 ? "Paid" : seed % 3 === 1 ? "Sent" : "Draft",
      labourTotal: timePool.slice(0, (seed % 3) + 1).reduce((s, t) => s + t.hours * 85, 0),
      extrasTotal: (seed % 5) * 75,
    };
  }

  const job = jobs.find((j) => j.id === jobId);
  if (!job) return null;

  const idx = jobs.indexOf(job);
  const staffCount = (idx % 3) + 1;
  const matCount = (idx % 4) + 5;

  return {
    ...job,
    clientPhone: `021 ${300 + idx} ${1000 + idx}`,
    clientEmail: `${job.client.split(" ")[0].toLowerCase()}@email.co.nz`,
    address: addresses[idx % addresses.length],
    description: `${job.jobName} at ${addresses[idx % addresses.length]}. Standard residential job — ${job.urgent ? "URGENT priority" : "normal priority"}.`,
    startDate: "Mon 10 Feb 2025",
    dueDate: "Fri 21 Feb 2025",
    staff: staffPool.slice(0, staffCount),
    materials: materialsPool.slice(0, matCount),
    notes: notesPool.slice(0, (idx % 3) + 2),
    photos: photosPool.slice(0, (idx % 3) + 3),
    timeEntries: timePool.slice(0, (idx % 3) + 3),
    invoiceStatus: idx % 3 === 0 ? "Paid" : idx % 3 === 1 ? "Sent" : "Draft",
    labourTotal: timePool.slice(0, (idx % 3) + 3).reduce((s, t) => s + t.hours * 85, 0),
    extrasTotal: (idx % 5) * 75,
  };
}

export function getNewJobDetail(stage: string): JobDetail {
  return {
    id: "new",
    jobName: "New Job",
    client: "",
    clientPhone: "",
    clientEmail: "",
    address: "",
    value: 0,
    stage,
    ageDays: 0,
    urgent: false,
    description: "",
    startDate: "",
    dueDate: "",
    staff: [],
    materials: [],
    notes: [],
    photos: [],
    timeEntries: [],
    invoiceStatus: "Draft",
    labourTotal: 0,
    extrasTotal: 0,
  };
}

/**
 * Generate a full JobDetail from a DemoJob loaded from the database.
 * Uses a simple hash of the job ID as a stable seed so the same job
 * always produces the same detail data.
 */
export function getJobDetailFromDemoJob(demoJob: DemoJob): JobDetail {
  const seed = demoJob.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const staffCount = (seed % 3) + 1;
  const matCount = (seed % 4) + 2;
  const noteCount = (seed % 3) + 1;
  const photoCount = (seed % 3) + 2;
  const timeCount = (seed % 3) + 1;

  const firstName = demoJob.client.split(" ")[0].toLowerCase();

  return {
    id: demoJob.id,
    jobName: demoJob.jobName,
    client: demoJob.client,
    clientPhone: `021 ${300 + (seed % 100)} ${1000 + (seed % 100)}`,
    clientEmail: `${firstName}@email.co.nz`,
    address: addresses[seed % addresses.length],
    value: demoJob.value,
    stage: demoJob.stage,
    ageDays: demoJob.ageDays,
    urgent: demoJob.urgent,
    description: `${demoJob.jobName} at ${addresses[seed % addresses.length]}. Standard residential job.`,
    startDate: "Mon 10 Feb 2025",
    dueDate: "Fri 21 Feb 2025",
    staff: staffPool.slice(0, staffCount),
    materials: materialsPool.slice(0, matCount),
    notes: notesPool.slice(0, noteCount),
    photos: photosPool.slice(0, photoCount),
    timeEntries: timePool.slice(0, timeCount),
    invoiceStatus: seed % 3 === 0 ? "Paid" : seed % 3 === 1 ? "Sent" : "Draft",
    labourTotal: timePool.slice(0, timeCount).reduce((s, t) => s + t.hours * 85, 0),
    extrasTotal: (seed % 5) * 75,
  };
}
