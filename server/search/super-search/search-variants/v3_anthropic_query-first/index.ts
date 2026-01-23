import type { SearchVariant } from '../types';
import { executeSearch } from './stream';

export const variant: SearchVariant = {
  id: 'v3_anthropic_query-first',
  name: 'Anthropic Query-First',
  description: 'Claude analyzes query intent first → Perplexity cursory search → Claude refines fields based on findings → Perplexity targeted deep searches → Claude final extraction. Optimized for ambiguous queries and signal-based searches.',
  executeSearch
};
