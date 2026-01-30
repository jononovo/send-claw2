import type { Company } from "@shared/schema";
import type { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

// Type for companies with their associated contacts - extends the canonical Company from shared schema
export interface CompanyWithContacts extends Company {
  contacts?: ContactWithCompanyInfo[];
}

export interface SavedSearchState {
  currentQuery: string | null;
  currentResults: CompanyWithContacts[] | null;
  currentListId: number | null;
  lastExecutedQuery?: string | null;
  emailSearchCompleted?: boolean;
  emailSearchTimestamp?: number;
  navigationRefreshTimestamp?: number;
}

export interface SearchStateHookReturn {
  // State loading
  loadSearchState: () => SavedSearchState | null;
  
  // State persistence
  persistSearchState: (
    state: {
      currentResults: CompanyWithContacts[];
      emailSearchCompleted?: boolean;
      emailSearchTimestamp?: number | null;
      navigationRefreshTimestamp?: number;
    },
    currentValues: {
      currentQuery: string;
      currentListId: number | null;
      lastExecutedQuery: string | null;
    }
  ) => void;
  
  // Contact data refresh
  refreshContactDataFromDatabase: (
    companies: CompanyWithContacts[],
    options?: { forceFresh?: boolean }
  ) => Promise<CompanyWithContacts[]>;
  
  refreshAndUpdateResults: (
    companies: CompanyWithContacts[],
    stateValues: {
      currentQuery: string;
      currentListId: number | null;
      lastExecutedQuery: string | null;
    },
    options?: {
      forceUiReset?: boolean;
      clearEmailSearchTimestamp?: boolean;
      forceFresh?: boolean;
      additionalStateFields?: {
        emailSearchCompleted?: boolean;
        emailSearchTimestamp?: number | null;
        navigationRefreshTimestamp?: number;
      };
    }
  ) => Promise<CompanyWithContacts[]>;
  
  // Refs for tracking component state
  isMountedRef: React.MutableRefObject<boolean>;
  isInitializedRef: React.MutableRefObject<boolean>;
  hasSessionRestoredDataRef: React.MutableRefObject<boolean>;
  refreshVersionRef: React.MutableRefObject<number>;
}
