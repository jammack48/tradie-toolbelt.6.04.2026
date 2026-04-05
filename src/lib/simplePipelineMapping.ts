import type { Stage } from "@/data/dummyJobs";

export type SimpleBucket = "New" | "Quoted" | "Won" | "Done";

export const SIMPLE_BUCKETS: SimpleBucket[] = ["New", "Quoted", "Won", "Done"];

/** Which real stages map into each simple bucket */
export const BUCKET_STAGES: Record<SimpleBucket, Stage[]> = {
  New: ["Lead", "To Quote"],
  Quoted: ["Quote Sent"],
  Won: ["Quote Accepted", "In Progress"],
  Done: ["To Invoice", "Invoiced", "Invoice Paid"],
};

/** When a job is dropped into a bucket, assign this default stage */
export const BUCKET_DROP_DEFAULT: Record<SimpleBucket, Stage> = {
  New: "Lead",
  Quoted: "Quote Sent",
  Won: "Quote Accepted",
  Done: "Invoice Paid",
};

/** Reverse lookup: given a real stage, which bucket does it belong to? */
export function stageToBucket(stage: string): SimpleBucket {
  for (const [bucket, stages] of Object.entries(BUCKET_STAGES)) {
    if ((stages as string[]).includes(stage)) return bucket as SimpleBucket;
  }
  return "New";
}

/** Bucket display colours (semantic tokens) */
export const BUCKET_COLORS: Record<SimpleBucket, string> = {
  New: "hsl(var(--status-orange))",
  Quoted: "hsl(var(--primary))",
  Won: "hsl(var(--status-green))",
  Done: "hsl(var(--muted-foreground))",
};
