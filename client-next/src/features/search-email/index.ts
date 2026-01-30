export { useComprehensiveEmailSearch } from './hooks/useComprehensiveEmailSearch';

export { ComprehensiveSearchButton } from '@/components/comprehensive-email-search';

export { FindKeyEmailsButton } from './components/FindKeyEmailsButton';

export { consolidatedEmailSearch } from './services/api';
export type { ConsolidatedSearchResult } from './services/api';

export type {
  SearchContext,
  ComprehensiveSearchButtonProps,
  SearchState,
  UseComprehensiveEmailSearchOptions,
  ComprehensiveEmailSearchResult
} from './types';
