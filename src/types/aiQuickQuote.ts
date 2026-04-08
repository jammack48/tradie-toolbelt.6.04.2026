export interface AiSuggestedMaterial {
  itemId?: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice?: number;
  confidence: number;
  source?: string;
}

export interface AiSuggestedLabour {
  role: string;
  hours: number;
  rate?: number;
  confidence: number;
}

export interface AiQuickQuoteDraft {
  customerId?: number;
  customerName?: string;
  customerConfidence?: number;
  isNewCustomer?: boolean;
  siteAddress: string;
  siteAddressConfidence: number;
  scopeSummary: string;
  materialsSuggested: AiSuggestedMaterial[];
  labourSuggested: AiSuggestedLabour[];
  assumptions: string[];
  missingFields: string[];
  reviewFlags: string[];
}

