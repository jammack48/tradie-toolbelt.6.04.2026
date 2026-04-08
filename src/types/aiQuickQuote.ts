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
  customerPhone?: string;
  customerEmail?: string;
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

export interface AiResolvedCustomerMatch {
  id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  score: number;
  reasons: string[];
}

export interface AiResolvedCustomerDraft {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface AiResolvedCustomerResult {
  extractedCustomer: AiResolvedCustomerDraft;
  topMatches: AiResolvedCustomerMatch[];
  bestMatchId?: number;
  bestMatchScore: number;
  canAutoSelect: boolean;
  shouldCreateNew: boolean;
}

