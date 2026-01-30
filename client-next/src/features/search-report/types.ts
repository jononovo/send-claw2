export interface SourceBreakdown {
  Perplexity: number;
  Apollo: number;
  Hunter: number;
}

export interface SearchReportMetrics {
  query: string;
  totalCompanies: number;
  totalContacts: number;
  totalEmails?: number;
  searchDuration: number;
  companies: CompanyData[];
  searchType?: string;
  sourceBreakdown?: SourceBreakdown;
}

export interface CompanyData {
  id: number;
  name: string;
  contacts?: ContactData[];
}

export interface ContactData {
  id: number;
  name?: string;
  role?: string;
  email?: string;
  probability?: number;
}

export interface CachedResultInfo {
  isCached: boolean;
  cachedDate: Date | null;
  query: string | null;
}

export interface SearchReportModalProps {
  metrics: SearchReportMetrics;
  isVisible: boolean;
  onClose: () => void;
  cachedInfo?: CachedResultInfo;
  onRefresh?: () => void;
}
