import type { StreamEvent } from '../types';

export interface SearchVariant {
  id: string;
  name: string;
  description: string;
  executeSearch: (query: string) => AsyncGenerator<StreamEvent, void, unknown>;
}
