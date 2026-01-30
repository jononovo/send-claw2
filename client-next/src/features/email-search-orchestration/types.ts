import type { CompanyWithContacts } from "@/features/search-state";
import type { SearchProgressState } from "@/features/search-progress";

export interface EmailSearchMetadata {
  emailsFound: number;
  contactsEnriched?: number;
  contactsProcessed?: number;
  companiesSearched?: number;
  companiesProcessed?: number;
  sourceBreakdown?: {
    Perplexity?: number;
    Apollo?: number;
    Hunter?: number;
  };
}

export interface EmailSearchJobResult {
  summary?: EmailSearchMetadata;
  metadata?: EmailSearchMetadata;
  companies?: CompanyWithContacts[];
}

export interface EmailSearchOrchestrationHook {
  isSearching: boolean;
  searchProgress: SearchProgressState;
  summaryVisible: boolean;
  lastEmailSearchCount: number;
  lastSourceBreakdown: any;
  
  runEmailSearch: () => Promise<void>;
  updateEmailSearchMetrics: (emailsFound: number, sourceBreakdown?: Record<string, number>) => void;
  closeSummary: () => void;
  
  getCurrentCompaniesWithoutEmails: () => CompanyWithContacts[];
  getTopContacts: (company: any, count: number) => any[];
}
