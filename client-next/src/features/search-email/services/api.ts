import { apiRequest } from '@/lib/queryClient';
import type { Contact } from '@shared/schema';
import type { SearchContext } from '../types';

export interface ConsolidatedSearchResult {
  contact: Contact;
  emailFound: boolean;
  source: string | null;
}

export async function consolidatedEmailSearch(
  contactId: number,
  searchContext?: SearchContext
): Promise<ConsolidatedSearchResult> {
  const response = await apiRequest("POST", `/api/contacts/${contactId}/consolidated-email-search`, {
    searchContext
  });
  return await response.json();
}
