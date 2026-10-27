export interface SearchListRequest {
  companies: Array<{
    id?: number;
    name: string;
    website?: string | null;
    industry?: string | null;
    description?: string | null;
    size?: string | null;
    location?: string | null;
    revenue?: string | null;
    contacts?: Array<{
      id?: number;
      name: string;
      email?: string | null;
      role?: string | null;
      linkedinUrl?: string | null;
      phoneNumber?: string | null;
    }>;
  }>;
  prompt: string;
  contactSearchConfig?: {
    enableCustomSearch?: boolean;
    customSearchTarget?: string;
    enableCustomSearch2?: boolean;
    customSearchTarget2?: string;
  };
}

export interface UpdateSearchListRequest extends SearchListRequest {
  // All same fields as create
}

export interface SearchListResponse {
  listId: number;
  prompt: string;
  resultCount: number;
  customSearchTargets?: string[] | null;
  userId: number;
  createdAt?: Date;
}

export interface SearchListWithCompanies extends SearchListResponse {
  companies: Array<{
    id: number;
    name: string;
    description?: string;
    createdAt?: Date;
  }>;
}

/** The `results` a standard search job stores when it completes (see `SearchJobService.executeJob`). */
export interface CompletedSearchJobResults {
  companies: Array<{
    id: number;
    name: string;
    contacts?: Array<{
      id: number;
      name?: string | null;
      role?: string | null;
      email?: string | null;
      probability?: number | null;
    }>;
  }>;
  totalCompanies?: number;
  totalContacts?: number;
  sourceBreakdown?: { Perplexity: number; Apollo: number; Hunter: number } | null;
  savedSearchId?: number;
}
