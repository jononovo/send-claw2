import type { StreamEvent } from '../types';

export interface SearchVariant {
  id: string;
  name: string;
  description: string;
  executeSearch: (query: string) => AsyncGenerator<StreamEvent, void, unknown>;
}

import { variant as v1PerplexityOneShot } from './v1_perplexity_one-shot';

export const variants: Record<string, SearchVariant> = {
  'v1_perplexity_one-shot': v1PerplexityOneShot,
};

export const defaultVariantId = 'v1_perplexity_one-shot';

export function getVariant(id: string): SearchVariant | undefined {
  return variants[id];
}

export function getDefaultVariant(): SearchVariant {
  return variants[defaultVariantId];
}

export function listVariants(): Array<{ id: string; name: string; description: string }> {
  return Object.values(variants).map(v => ({
    id: v.id,
    name: v.name,
    description: v.description
  }));
}
