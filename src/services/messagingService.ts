import { BACKEND_URL } from "@/config/env";
import { supabase } from "@/lib/supabase";

export type SendQuotePayload = {
  send_email: boolean;
  send_sms: boolean;
  to_email: string | null;
  to_phone: string | null;
  email_subject: string;
  email_text: string;
  sms_text: string;
  quote_reference?: string | null;
};

export type SendQuoteResult = {
  email_ok: boolean | null;
  sms_ok: boolean | null;
  email_error: string | null;
  sms_error: string | null;
};

export async function sendQuoteMessage(payload: SendQuotePayload): Promise<SendQuoteResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("You need to sign in to send email or SMS.");
  }

  const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/messaging/send-quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => null)) as SendQuoteResult | { detail?: unknown } | null;

  if (!res.ok) {
    if (body && typeof body === "object" && "email_error" in body) {
      const b = body as SendQuoteResult;
      const parts = [b.email_error, b.sms_error].filter(Boolean);
      throw new Error(parts.length ? parts.join(" · ") : `Send failed (${res.status})`);
    }
    const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
    if (typeof detail === "string") throw new Error(detail);
    if (detail && typeof detail === "object") throw new Error(JSON.stringify(detail));
    throw new Error(`Send failed (${res.status})`);
  }

  return body as SendQuoteResult;
}
