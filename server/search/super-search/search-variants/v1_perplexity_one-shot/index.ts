import type { SearchVariant } from '../types';
import { executeSearch, executeExpandSearch } from './stream';
export type { ExpandSearchParams } from './stream';

export const variant: SearchVariant = {
  id: 'v1_perplexity_one-shot',
  name: 'Perplexity One-Shot',
  description: 'Single prompt to Perplexity AI with streaming results',
  executeSearch,
  executeExpandSearch
};
