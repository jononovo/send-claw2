export type QueryType = 'company' | 'contact';
export type TargetCount = 5 | 10 | 20;

export interface CustomField {
  key: string;
  label: string;
}

export interface SearchPlan {
  queryType: QueryType;
  targetCount: TargetCount;
  standardFields: string[];
  customFields: CustomField[];
  searchStrategy: string;
  // Legacy fields for backward compatibility
  displayMode?: string;
  columns?: string[];
}

export interface CompanyResult {
  type: 'company';
  name: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  size?: number;
  services?: string[];
  superSearchNote?: string;
  superSearchResearch?: string;
  superSearchMeta?: Record<string, any>;
}

export interface ContactResult {
  type: 'contact';
  name: string;
  role?: string;
  company: string;
  companyWebsite?: string;
  linkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  department?: string;
  superSearchNote?: string;
  superSearchResearch?: string;
  superSearchMeta?: Record<string, any>;
}

export type SuperSearchResult = CompanyResult | ContactResult;

export interface SuperSearchState {
  status: 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';
  plan: SearchPlan | null;
  results: SuperSearchResult[];
  progressMessages: string[];
  error: string | null;
  completionStats: {
    totalResults: number;
    companiesSaved: number;
    contactsSaved: number;
  } | null;
}
