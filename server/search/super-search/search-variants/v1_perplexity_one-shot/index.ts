import type { SearchVariant } from '../index';
import { executeSearch } from './stream';

export const variant: SearchVariant = {
  id: 'v1_perplexity_one-shot',
  name: 'Perplexity One-Shot',
  description: 'Single prompt to Perplexity AI with streaming results',
  executeSearch
};
