import { BACKEND_URL } from "@/config/env";
import type { DemoCustomer, DemoMaterial } from "@/types/demoData";
import type { AiQuickQuoteDraft, AiResolvedCustomerResult } from "@/types/aiQuickQuote";

interface ExtractReq {
  transcript: string;
  photo_data_urls: string[];
  candidate_customers: Array<{ id: number; name: string; address: string; phone?: string; email?: string }>;
  candidate_materials: Array<{ id: string; name: string; unit: string; unit_price: number }>;
}

interface ResolveCustomerReq {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  site_address: string;
  candidate_customers: Array<{ id: number; name: string; address: string; phone?: string; email?: string }>;
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Failed to read image"));
    fr.onload = () => resolve(String(fr.result || ""));
    fr.readAsDataURL(file);
  });
}

export async function filesToDataUrls(files: File[]): Promise<string[]> {
  const limited = files.slice(0, 4);
  const urls = await Promise.all(limited.map(toDataUrl));
  // Keep payload bounded for mobile upload and model latency.
  return urls.filter(Boolean);
}

export async function extractQuickQuoteWithAi(args: {
  transcript: string;
  photoDataUrls: string[];
  customers: DemoCustomer[];
  materials: DemoMaterial[];
}): Promise<AiQuickQuoteDraft> {
  const req: ExtractReq = {
    transcript: args.transcript,
    photo_data_urls: args.photoDataUrls,
    candidate_customers: args.customers.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      email: c.email,
    })),
    candidate_materials: args.materials.map((m) => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      unit_price: m.unitPrice,
    })),
  };

  const res = await fetch(`${BACKEND_URL}/ai/quick-quote-extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `AI extraction failed (${res.status})`);
  }
  return res.json() as Promise<AiQuickQuoteDraft>;
}

export async function resolveCustomerWithAi(args: {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  siteAddress?: string;
  customers: DemoCustomer[];
}): Promise<AiResolvedCustomerResult> {
  const req: ResolveCustomerReq = {
    customer_name: args.customerName,
    customer_phone: args.customerPhone ?? "",
    customer_email: args.customerEmail ?? "",
    site_address: args.siteAddress ?? "",
    candidate_customers: args.customers.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      email: c.email,
    })),
  };
  const res = await fetch(`${BACKEND_URL}/ai/resolve-customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `AI customer resolution failed (${res.status})`);
  }
  return res.json() as Promise<AiResolvedCustomerResult>;
}

