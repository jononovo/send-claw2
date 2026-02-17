export type SuggestionType = 
  | 'expand_results'
  | 'expand_location'
  | 'add_filter'
  | 'find_emails'
  | 'filter_seniority'
  | 'related_roles'
  | 'related_companies'
  | 'narrow_results'
  | 'custom';

export interface SuggestionAction {
  type: SuggestionType;
  payload?: Record<string, any>;
}

export interface Suggestion {
  id: string;
  icon: string;
  title: string;
  description: string;
  action: SuggestionAction;
  priority: number;
}

export interface SearchContext {
  query: string;
  resultCount: number;
  emailCount: number;
  companies: Array<{
    id: number;
    name: string;
    contactCount: number;
  }>;
  criteria?: string[];
}

export interface GenerateSuggestionsRequest {
  query: string;
  resultCount: number;
  emailCount: number;
  companies: Array<{
    id: number;
    name: string;
    contactCount: number;
  }>;
  criteria?: string[];
}

export interface GenerateSuggestionsResponse {
  suggestions: Suggestion[];
}
