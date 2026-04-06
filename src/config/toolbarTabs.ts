import {
  Home, Users, CalendarDays, Package, FilePlus, FileText, Settings,
  ClipboardList, List, StickyNote, History, DollarSign, Clock, Camera,
  ClipboardCheck, Star, Archive, Building2, Bell, Palette, CreditCard,
  Shield, Wrench, Briefcase, UserPlus, BarChart3, Plus, Mail, MessageSquare,
  ArrowLeft, Receipt, FileCheck, GitBranch,
} from "lucide-react";

export interface ToolbarTab {
  id: string;
  label: string;
  icon: React.ElementType;
}

/** Back tab for non-home pages */
export const BACK_TAB: ToolbarTab = { id: "back", label: "Back", icon: ArrowLeft };

/** Always-visible tabs on the Home/Pipeline page only */
export const COMMON_TABS: ToolbarTab[] = [
  { id: "pipeline", label: "Home", icon: Home },
  { id: "manager", label: "Manager", icon: Shield },
  { id: "customers", label: "Customers", icon: Users },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
];

/** Page-specific extras — each already includes BACK_TAB */
export const PIPELINE_EXTRAS: ToolbarTab[] = [
  { id: "bundles", label: "Bundles", icon: Package },
  { id: "quotes", label: "New Quote", icon: FilePlus },
  { id: "invoices", label: "New Invoice", icon: Receipt },
  { id: "servicing", label: "Servicing", icon: Wrench },
  { id: "email", label: "Email Tpl", icon: Mail },
  { id: "sms", label: "SMS Tpl", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export const SCHEDULE_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "pipeline", label: "Pipeline", icon: Home },
  { id: "customers", label: "Customers", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

export const BUNDLES_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "quotes", label: "New Quote", icon: FilePlus },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

export const QUOTE_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "overview", label: "Overview", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "line-items", label: "Line Items", icon: List },
  { id: "variations", label: "Variations", icon: GitBranch },
  { id: "sequences", label: "Sequences", icon: Settings },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "history", label: "History", icon: History },
];

export const JOB_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "overview", label: "Overview", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "history", label: "History", icon: History },
  { id: "quote", label: "Quote", icon: DollarSign },
  { id: "materials", label: "Materials", icon: Package },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "time", label: "Time", icon: Clock },
  { id: "forms", label: "Forms", icon: ClipboardCheck },
  { id: "invoice", label: "Invoice", icon: FileText },
  { id: "variations", label: "Variations", icon: GitBranch },
  { id: "sequences", label: "Sequences", icon: Settings },
];

export const INVOICE_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "overview", label: "Overview", icon: Receipt },
  { id: "line-items", label: "Line Items", icon: List },
  { id: "sequences", label: "Sequences", icon: Settings },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "history", label: "History", icon: History },
];

export const CUSTOMER_LIST_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "leads", label: "Leads", icon: Star },
  { id: "active", label: "Active", icon: Users },
  { id: "archived", label: "Archived", icon: Archive },
];

export const CUSTOMER_CARD_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "overview", label: "Overview", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "quotes", label: "Quotes", icon: FilePlus },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "history", label: "History", icon: History },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "documents", label: "Documents", icon: FileText },
  
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "spend", label: "Spend", icon: BarChart3 },
  { id: "add-job", label: "New Job", icon: Plus },
];

export const SETTINGS_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "business", label: "Business", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "team", label: "Team", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Wrench },
  { id: "documents", label: "Documents", icon: FileCheck },
];

export const EMAIL_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "quotes", label: "Quotes", icon: Mail },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "reminders", label: "Reminders", icon: Clock },
  { id: "services", label: "Services", icon: Wrench },
  { id: "reviews", label: "Reviews", icon: Star },
];

export const SMS_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "quotes", label: "Quotes", icon: MessageSquare },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "reminders", label: "Reminders", icon: Clock },
  { id: "services", label: "Services", icon: Wrench },
  { id: "reviews", label: "Reviews", icon: Star },
];

export const WORK_HOME_TABS: ToolbarTab[] = [
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "add-job", label: "New Job", icon: Plus },
];

export const WORK_JOB_EXTRAS: ToolbarTab[] = [
  BACK_TAB,
  { id: "overview", label: "Overview", icon: ClipboardList },
  { id: "scope", label: "Scope", icon: FileCheck },
  { id: "time", label: "Time", icon: Clock },
  { id: "materials", label: "Materials", icon: Package },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "forms", label: "Forms", icon: ClipboardCheck },
  { id: "variations", label: "Variations", icon: GitBranch },
];

/** Build tabs for the Home/Pipeline page (prepends common tabs) */
export function buildTabs(...extras: ToolbarTab[]): ToolbarTab[] {
  return [...COMMON_TABS, ...extras];
}

/** Standard navigation handler for the Home page common tabs */
export function handleCommonTab(id: string, navigate: (path: string) => void): boolean {
  const routes: Record<string, string> = {
    pipeline: "/",
    customers: "/customers",
    schedule: "/schedule",
    settings: "/settings",
    quotes: "/quote/new",
    invoices: "/invoice/new",
    bundles: "/bundles",
    
    email: "/email-templates",
    sms: "/sms-templates",
  };
  if (routes[id]) {
    navigate(routes[id]);
    return true;
  }
  return false;
}
