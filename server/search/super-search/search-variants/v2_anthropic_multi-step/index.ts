import { executeSearch, type StreamEvent, type SearchPlan, type SuperSearchResult } from './stream';

export interface SearchVariant {
  id: string;
  name: string;
  description: string;
  executeSearch: (query: string) => AsyncGenerator<StreamEvent, void, unknown>;
}

export const variant: SearchVariant = {
  id: 'v2_anthropic_multi-step',
  name: 'Anthropic Multi-Step',
  description: 'Perplexity exploratory search → Claude analysis/planning → Perplexity enrichment per entity → Claude extraction. Uses standard + custom fields for hybrid approach.',
  executeSearch
};

export { executeSearch };
export type { StreamEvent, SearchPlan, SuperSearchResult };
export default variant;
