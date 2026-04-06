import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ReceiptText, Phone, Mail } from "lucide-react";
import { loadIntroInvoices } from "@/pages/IntroJobFlow";

export default function IntroInvoices() {
  const navigate = useNavigate();
  const invoices = useMemo(() => loadIntroInvoices(), []);

  return (
    <div className="h-[calc(100dvh-48px)] overflow-y-auto px-4 py-3 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => navigate("/")}
          className="h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center"
          aria-label="Back to intro invoicing"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Invoices Sent</h1>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          No invoices sent yet. Finish the intro invoice flow and sent invoices will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <button
              key={invoice.id}
              onClick={() => navigate("/")}
              className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-card-foreground truncate">{invoice.customerName || "Unknown customer"}</div>
                <div className="text-sm font-bold text-primary">${invoice.total.toFixed(2)}</div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1"><ReceiptText className="w-3.5 h-3.5" />{new Date(invoice.sentAt).toLocaleString()}</span>
                {invoice.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{invoice.phone}</span>}
                {invoice.email && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{invoice.email}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
