import type { SearchVariant } from './types';
export type { SearchVariant } from './types';

import { variant as v1PerplexityOneShot } from './v1_perplexity_one-shot';
import { variant as v2AnthropicMultiStep } from './v2_anthropic_multi-step';

export const variants: Record<string, SearchVariant> = {
  'v1_perplexity_one-shot': v1PerplexityOneShot,
  'v2_anthropic_multi-step': v2AnthropicMultiStep,
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
