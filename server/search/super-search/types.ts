export type QueryType = 'person' | 'role' | 'company' | 'signals';
export type DisplayMode = 'company_list' | 'company_contacts' | 'contact_list' | 'table';
export type TargetCount = 5 | 10 | 20;

export interface SearchPlan {
  queryType: QueryType;
  displayMode: DisplayMode;
  targetCount: TargetCount;
  columns?: string[];
  searchStrategy: string;
}

export interface CompanyResult {
  type: 'company';
  name: string;
  website?: string;
  city?: string;
  country?: string;
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
  country?: string;
  superSearchNote?: string;
  superSearchResearch?: string;
  superSearchMeta?: Record<string, any>;
}

export type SuperSearchResult = CompanyResult | ContactResult;

export type StreamEvent =
  | { type: 'plan'; data: SearchPlan }
  | { type: 'progress'; data: string }
  | { type: 'result'; data: SuperSearchResult }
  | { type: 'complete'; data: { totalResults: number; companiesSaved: number; contactsSaved: number } }
  | { type: 'error'; data: string };

export interface SuperSearchRequest {
  query: string;
  listId?: number;
}
