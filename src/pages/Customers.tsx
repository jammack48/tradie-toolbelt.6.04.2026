import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, UserPlus, Phone, Mail, MapPin, CheckSquare, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";

import { PageToolbar } from "@/components/PageToolbar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DemoCustomer as Customer } from "@/types/demoData";
import { useDemoData } from "@/contexts/DemoDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { CUSTOMER_LIST_EXTRAS } from "@/config/toolbarTabs";
import { CustomerSearchBar } from "@/components/customer/CustomerSearchBar";
import { CustomerFilters, type SortOption } from "@/components/customer/CustomerFilters";
import { BulkActionBar } from "@/components/customer/BulkActionBar";
import { BulkMessageDialog, ScheduleReminderDialog } from "@/components/customer/BulkMessageDialog";
import { QuickKeywords } from "@/components/customer/QuickKeywords";
import { FilterPresets, type FilterPreset } from "@/components/customer/FilterPresets";
import { NewCustomerDialog } from "@/components/customer/NewCustomerDialog";

type CustomerTab = "all" | "leads" | "active" | "archived";

function customerMatchesQuery(c: Customer, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  const searchable = [
    c.name, c.email, c.phone, c.address,
    ...c.notes,
    ...c.jobHistory.map((j) => j.name),
    ...c.contacts.map((ct) => `${ct.name} ${ct.role} ${ct.email}`),
  ].join(" ").toLowerCase();
  return lower.split(/\s+/).every((word) => searchable.includes(word));
}

export default function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<CustomerTab>("all");
  const { customers, jobs } = useDemoData();
  const { isDemo } = useAuth();
  const unreadClients = useMemo(() => new Set(jobs.filter((j) => j.hasUnread).map((j) => j.client)), [jobs]);
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [minSpend, setMinSpend] = useState(0);
  const [minJobs, setMinJobs] = useState(0);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [smsOpen, setSmsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [newCustOpen, setNewCustOpen] = useState(false);

  const shouldOpenNewCustomer = useMemo(() => {
    const routeState = location.state as { openNewCustomer?: boolean } | null;
    const params = new URLSearchParams(location.search);
    return params.get("new") === "1" || Boolean(routeState?.openNewCustomer);
  }, [location.search, location.state]);

  useEffect(() => {
    if (!shouldOpenNewCustomer) return;

    setNewCustOpen(true);

    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1") {
      params.delete("new");
      const nextSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : "",
        },
        { replace: true, state: location.state },
      );
    }
  }, [shouldOpenNewCustomer, location.pathname, location.search, location.state, navigate]);

  const handleSearch = useCallback((q: string) => setSearchQuery(q), []);

  const filtered = useMemo(() => {
    let list = activeTab === "all" ? customers : customers.filter((c) => c.status === activeTab);
    list = list.filter((c) => customerMatchesQuery(c, searchQuery));
    if (minSpend > 0) list = list.filter((c) => c.totalSpend >= minSpend);
    if (minJobs > 0) list = list.filter((c) => c.jobs >= minJobs);
    list = [...list].sort((a, b) => {
      if (sortBy === "spend") return b.totalSpend - a.totalSpend;
      if (sortBy === "jobs") return b.jobs - a.jobs;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [activeTab, customers, searchQuery, sortBy, minSpend, minJobs]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  return (
    <>
      <PageToolbar
        currentPage="customers"
        tabs={CUSTOMER_LIST_EXTRAS}
        activeTab={activeTab}
        onTabChange={(id) => {
          if (id === "back") { navigate("/"); return; }
          setActiveTab(id as CustomerTab);
        }}
        pageHeading={<h2 className="text-base font-bold text-card-foreground">Customer Directory</h2>}
      >
        {/* Search */}
        <div className="mb-3">
          <CustomerSearchBar onSearch={handleSearch} externalValue={searchInput} />
        </div>

        {/* Quick filters dropdown */}
        <div className="mb-3">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full justify-between">
                <span className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" />Quick Filters & Keywords</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-3">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Keywords</span>
                <QuickKeywords onKeyword={(kw) => { setSearchInput(kw); setSearchQuery(kw); }} />
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Presets</span>
                <FilterPresets onApply={(preset: FilterPreset) => {
                  setSortBy(preset.sortBy);
                  setMinSpend(preset.minSpend);
                  setMinJobs(preset.minJobs);
                  if (preset.tab) setActiveTab(preset.tab);
                }} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Filters + Select toggle */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <CustomerFilters
            sortBy={sortBy} onSortChange={setSortBy}
            minSpend={minSpend} onMinSpendChange={setMinSpend}
            minJobs={minJobs} onMinJobsChange={setMinJobs}
          />
          <Button
            size="sm"
            variant={selectMode ? "default" : "outline"}
            className="gap-1.5 text-xs"
            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {selectMode ? "Cancel" : "Select"}
          </Button>
        </div>

        {/* Count + Add */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{filtered.length} customers</span>
            {selectMode && filtered.length > 0 && (
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={toggleSelectAll}>
                {selected.size === filtered.length ? "Deselect all" : "Select all"}
              </Button>
            )}
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setNewCustOpen(true)}>
            <UserPlus className="w-4 h-4" />Add Customer
          </Button>
        </div>

        {/* Customer list */}
        <div className="space-y-2 pb-20">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => selectMode ? toggleSelect(c.id) : navigate(`/customer/${c.id}`)}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-3 rounded-lg bg-card border border-border hover:bg-accent/50 cursor-pointer transition-colors min-h-[64px]"
            >
              {selectMode && (
                <Checkbox
                  checked={selected.has(c.id)}
                  onCheckedChange={() => toggleSelect(c.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                />
              )}
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-card-foreground truncate flex items-center gap-1.5">
                  {c.name}
                  {unreadClients.has(c.name) && (
                    <>
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-glow-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary shadow-[0_0_6px_2px_hsl(var(--primary)/0.5)]" />
                      </span>
                      <Mail className="w-3.5 h-3.5 text-primary animate-wiggle shrink-0" />
                    </>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                  <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{c.email}</span></span>
                  {!isMobile && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.address}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-muted-foreground">{c.jobs} jobs</div>
                {c.totalSpend > 0 && <div className="text-xs font-medium text-card-foreground">${c.totalSpend.toLocaleString()}</div>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground space-y-3">
              {isDemo ? (
                <div>No customers match your search.</div>
              ) : (
                <>
                  <div>Customers not found</div>
                  <div className="text-xs">No customers yet</div>
                  <Button size="sm" onClick={() => setNewCustOpen(true)}>Add your first customer</Button>
                </>
              )}
            </div>
          )}
        </div>
      </PageToolbar>

      {/* Bulk action bar */}
      <BulkActionBar
        count={selected.size}
        onSendSms={() => setSmsOpen(true)}
        onSendEmail={() => setEmailOpen(true)}
        onScheduleReminder={() => setReminderOpen(true)}
        onClear={() => setSelected(new Set())}
      />

      {/* Dialogs */}
      <BulkMessageDialog open={smsOpen} onOpenChange={setSmsOpen} channel="sms" customerCount={selected.size} />
      <BulkMessageDialog open={emailOpen} onOpenChange={setEmailOpen} channel="email" customerCount={selected.size} />
      <ScheduleReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} customerCount={selected.size} />
      <NewCustomerDialog open={newCustOpen} onOpenChange={setNewCustOpen} />
    </>
  );
}
