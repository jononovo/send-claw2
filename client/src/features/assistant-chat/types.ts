export interface SearchContext {
  query: string;
  resultCount: number;
  emailCount: number;
  companies: Array<{
    id: number;
    name: string;
    contactCount: number;
  }>;
}

export interface ToolCall {
  toolName: string;
  args: Record<string, any>;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  createdAt: Date;
}

export type ExpandStrategy = "broader_query" | "related_companies" | "similar_roles" | "expand_location";
export type FilterType = "seniority" | "department" | "company_size" | "location" | "has_email";
export type EmailScope = "all" | "top_prospects" | "selected";
export type SeniorityLevel = "c-level" | "vp" | "director" | "manager" | "senior" | "any";
export type AnalysisType = "overview" | "gaps" | "recommendations" | "comparison";

export interface ExpandSearchAction {
  type: "expandSearch";
  strategy: ExpandStrategy;
  modifiedQuery?: string;
}

export interface NarrowSearchAction {
  type: "narrowSearch";
  filterType: FilterType;
  filterValue?: string;
}

export interface FindEmailsAction {
  type: "findEmails";
  scope: EmailScope;
  priority?: "fast" | "thorough";
}

export interface ModifyQueryAction {
  type: "modifyQuery";
  newQuery: string;
  reason?: string;
}

export interface FilterByRoleAction {
  type: "filterByRole";
  roles: string[];
  seniorityLevel?: SeniorityLevel;
}

export interface AnalyzeResultsAction {
  type: "analyzeResults";
  analysisType: AnalysisType;
}

export type AssistantAction = 
  | ExpandSearchAction 
  | NarrowSearchAction 
  | FindEmailsAction 
  | ModifyQueryAction 
  | FilterByRoleAction 
  | AnalyzeResultsAction;

export interface AssistantChatState {
  messages: AssistantMessage[];
  isLoading: boolean;
  isOpen: boolean;
  error: string | null;
  searchContext: SearchContext | null;
}
