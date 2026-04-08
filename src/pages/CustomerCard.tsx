import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useDemoData } from "@/contexts/DemoDataContext";

import { PageToolbar } from "@/components/PageToolbar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Plus, Users, StickyNote, UserPlus, MessageSquare, User } from "lucide-react";
import { ReviewRequestDialog } from "@/components/customer/ReviewRequestDialog";
import { MessagesTab } from "@/components/job/MessagesTab";
import { CUSTOMER_CARD_EXTRAS } from "@/config/toolbarTabs";
import { HistoryTab } from "@/components/customer/HistoryTab";
import { CustomerPhotosTab } from "@/components/customer/CustomerPhotosTab";
import { DocumentsTab } from "@/components/customer/DocumentsTab";
import { QuotesTab } from "@/components/customer/QuotesTab";
import { InvoicesTab } from "@/components/customer/InvoicesTab";
import { NewJobDialog } from "@/components/customer/NewJobDialog";
import type { Stage } from "@/data/dummyJobs";

type CustTab = "overview" | "messages" | "jobs" | "contacts" | "notes" | "spend" | "add-job" | "history" | "photos" | "documents" | "quotes" | "invoices";

export default function CustomerCard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as CustTab) || "overview";
  const [activeTab, setActiveTab] = useState<CustTab>(initialTab);

  const { customers, addJob } = useDemoData();
  const customer = useMemo(
    () => customers.find((c) => String(c.id) === id || c.id === Number(id)),
    [customers, id]
  );

  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  function statusColor(s: string) {
    if (s === "active") return "bg-[hsl(var(--status-green))] text-white";
    if (s === "leads") return "bg-[hsl(var(--status-orange))] text-white";
    return "bg-muted text-muted-foreground";
  }

  const outstanding = customer.jobHistory.filter(j => !j.stage.includes("Paid")).reduce((s, j) => s + j.value, 0);
  const openQuotes = customer.jobHistory.filter(j => j.stage.includes("Quote")).length;

  const tabContent: Record<CustTab, React.ReactNode> = {
    overview: (
      <div className="space-y-3 h-full">
        {/* Customer Details Card */}
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <User className="w-4 h-4 text-muted-foreground" /> Customer Details
            </div>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setActiveTab("contacts")}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium text-card-foreground">{customer.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a href={`tel:${customer.phone}`} className="hover:text-primary transition-colors">{customer.phone}</a>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a href={`mailto:${customer.email}`} className="hover:text-primary transition-colors truncate">{customer.email}</a>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <span>{customer.address}</span>
            </div>
            {customer.contacts.length > 1 && (
              <div className="border-t border-border/50 pt-2 mt-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Additional Contacts</div>
                {customer.contacts.slice(1).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                    <Users className="w-3 h-3 shrink-0" />
                    <span className="text-card-foreground font-medium">{c.name}</span>
                    <span>· {c.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Channel Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-card border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab("messages")}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-card-foreground">SMS</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Sent</span><span className="font-medium text-card-foreground">8</span></div>
              <div className="flex justify-between"><span>Received</span><span className="font-medium text-card-foreground">3</span></div>
              <div className="flex justify-between"><span>Last</span><span className="font-medium text-card-foreground">1d ago</span></div>
            </div>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab("messages")}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--status-orange))]/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-[hsl(var(--status-orange))]" />
              </div>
              <span className="text-sm font-semibold text-card-foreground">Email</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between"><span>Sent</span><span className="font-medium text-card-foreground">6</span></div>
              <div className="flex justify-between"><span>Received</span><span className="font-medium text-card-foreground">2</span></div>
              <div className="flex justify-between"><span>Last</span><span className="font-medium text-card-foreground">2d ago</span></div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-card-foreground">{openQuotes}</div>
              <div className="text-[10px] text-muted-foreground">Open Quotes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-card-foreground">${outstanding.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Outstanding</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg bg-card border border-border p-3 flex flex-wrap gap-2">
          <NewJobDialog
            customerName={customer.name}
            customerAddress={customer.address}
            onCreateJob={(job) => addJob({ client: customer.name, jobName: job.jobName, value: job.value, stage: job.stage })}
            trigger={<Button size="sm" variant="outline" className="justify-start gap-2"><Plus className="w-4 h-4" /> New Job Card</Button>}
          />
          <Button size="sm" variant="outline" className="justify-start gap-2" onClick={() => navigate("/quote/new", { state: { customer } })}>
            <Plus className="w-4 h-4" /> New Quote
          </Button>
          <Button size="sm" variant="outline" className="justify-start gap-2" onClick={() => setActiveTab("notes")}>
            <StickyNote className="w-4 h-4" /> Add Note
          </Button>
          <ReviewRequestDialog customerName={customer.name} />
        </div>
      </div>
    ),
    jobs: (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-card-foreground">Jobs ({customer.jobHistory.length})</h2>
          <NewJobDialog
            customerName={customer.name}
            customerAddress={customer.address}
            onCreateJob={(job) => addJob({ client: customer.name, jobName: job.jobName, value: job.value, stage: job.stage })}
            trigger={<Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> New Job Card</Button>}
          />
        </div>
        {customer.jobHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No jobs yet</div>
        ) : (
          customer.jobHistory.map((j) => (
            <div key={j.id} onClick={() => navigate(`/job/${j.id}`)} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-accent/50 cursor-pointer transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-card-foreground truncate">{j.name}</div>
                <div className="text-xs text-muted-foreground">{j.id} · {j.date}</div>
              </div>
              <div className="text-sm font-bold text-card-foreground">${j.value.toLocaleString()}</div>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                j.stage.includes("Paid") ? "bg-[hsl(var(--status-green))] text-white" :
                j.stage.includes("Progress") || j.stage.includes("Invoice") ? "bg-[hsl(var(--status-orange))] text-white" :
                "bg-muted text-muted-foreground"
              )}>{j.stage}</span>
            </div>
          ))
        )}
      </div>
    ),
    contacts: (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-card-foreground">Contacts ({customer.contacts.length})</h2>
          <Button size="sm" className="gap-1.5"><UserPlus className="w-4 h-4" /> Add Contact</Button>
        </div>
        {customer.contacts.map((c, i) => (
          <div key={i} className="p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
              <div>
                <div className="text-sm font-medium text-card-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.role}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" />{c.phone}</a>
              <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="w-3 h-3" />{c.email}</a>
            </div>
          </div>
        ))}
      </div>
    ),
    notes: (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-card-foreground">Notes</h2>
          <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Add Note</Button>
        </div>
        {customer.notes.map((n, i) => (
          <div key={i} className="p-3 rounded-lg bg-card border border-border text-sm text-card-foreground">{n}</div>
        ))}
      </div>
    ),
    spend: (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-card-foreground">Spend Analytics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Total Spend", `$${customer.totalSpend.toLocaleString()}`],
            ["Avg Job Value", customer.jobHistory.length ? `$${Math.round(customer.totalSpend / Math.max(customer.jobHistory.filter(j => j.stage.includes("Paid")).length, 1)).toLocaleString()}` : "$0"],
            ["Total Jobs", String(customer.jobHistory.length)],
            ["Outstanding", `$${customer.jobHistory.filter(j => !j.stage.includes("Paid")).reduce((s, j) => s + j.value, 0).toLocaleString()}`],
          ].map(([label, value]) => (
            <div key={label} className="p-3 rounded-lg bg-card border border-border text-center">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-lg font-bold text-card-foreground mt-1">{value}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">SPEND BY STAGE</div>
          {["Invoice Paid", "In Progress", "To Invoice", "Quote Sent", "Lead"].map((stage) => {
            const total = customer.jobHistory.filter(j => j.stage === stage).reduce((s, j) => s + j.value, 0);
            if (total === 0) return null;
            const pct = customer.totalSpend > 0 ? Math.round((total / Math.max(customer.jobHistory.reduce((s, j) => s + j.value, 0), 1)) * 100) : 0;
            return (
              <div key={stage} className="flex items-center gap-3 py-1.5">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{stage}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium text-card-foreground w-16 text-right">${total.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    ),
    "add-job": (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-card-foreground">Create New Job for {customer.name}</h2>
        <NewJobDialog
          customerName={customer.name}
          customerAddress={customer.address}
          onCreateJob={(job) => addJob({ client: customer.name, jobName: job.jobName, value: job.value, stage: job.stage })}
          trigger={<Button className="gap-1.5"><Plus className="w-4 h-4" /> Create Job</Button>}
        />
      </div>
    ),
    messages: <MessagesTab recordType="customer" customerId={customer.id} showPipelineLink pipelinePath="/" />,
    history: <HistoryTab customer={customer} />,
    photos: <CustomerPhotosTab customer={customer} />,
    documents: <DocumentsTab customer={customer} />,
    quotes: <QuotesTab customer={customer} />,
    invoices: <InvoicesTab customer={customer} />,
  };

  return (
    <>
      <PageToolbar
        currentPage="customers"
        tabs={CUSTOMER_CARD_EXTRAS}
        activeTab={activeTab}
        onTabChange={(id) => {
          if (id === "back") { navigate("/customers"); return; }
          setActiveTab(id as CustTab);
        }}
        pageHeading={<h2 className="text-base font-bold text-card-foreground">{customer.name}</h2>}
      >
        {tabContent[activeTab]}
      </PageToolbar>
    </>
  );
}
