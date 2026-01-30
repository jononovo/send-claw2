import type { Contact } from '@shared/schema';

export interface SearchContext {
  companyName?: string;
  companyWebsite?: string;
  companyDescription?: string;
}

export interface ComprehensiveSearchButtonProps {
  contact: {
    id: number;
    name?: string;
    email?: string | null;
    completedSearches?: string[] | null;
  };
  onSearch: (contactId: number) => void | Promise<void>;
  isPending?: boolean;
  displayMode?: 'icon' | 'text' | 'icon-text';
  size?: 'sm' | 'md';
  className?: string;
}

export type SearchState = 'default' | 'pending' | 'failed' | 'success';

export interface UseComprehensiveEmailSearchOptions {
  onContactUpdate?: (contact: Contact) => void;
  onSearchComplete?: (contactId: number, emailFound: boolean) => void;
  enableBilling?: boolean;
}

export interface ComprehensiveEmailSearchResult {
  handleComprehensiveEmailSearch: (
    contactId: number,
    contact: Contact,
    searchContext?: SearchContext
  ) => Promise<void>;
  pendingSearchIds: Set<number>;
  isPending: (contactId: number) => boolean;
}

export interface BillingResult {
  success: boolean;
  charged: boolean;
  newBalance?: number;
  isBlocked?: boolean;
  message?: string;
}

export interface EmailSearchBillingOptions {
  onBillingComplete?: (result: BillingResult) => void;
  onInsufficientCredits?: (balance: number) => void;
}
