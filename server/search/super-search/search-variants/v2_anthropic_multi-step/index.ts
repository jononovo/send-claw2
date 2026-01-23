import type { SearchVariant } from '../types';
import { executeSearch } from './stream';

export const variant: SearchVariant = {
  id: 'v2_anthropic_multi-step',
  name: 'Anthropic Multi-Step',
  description: 'Perplexity exploratory search → Claude analysis/planning → Perplexity enrichment per entity → Claude extraction. Uses standard + custom fields for hybrid approach.',
  executeSearch
};
