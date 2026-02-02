import type { StreamEvent } from '../types';

export interface ExpandSearchParams {
  originalQuery: string;
  existingResults: Array<{ name: string; website?: string }>;
  additionalCount: number;
  plan: {
    queryType: 'company' | 'contact';
    standardFields: string[];
    customFields: Array<{ key: string; label: string }>;
  };
}

export interface SearchVariant {
  id: string;
  name: string;
  description: string;
  executeSearch: (query: string) => AsyncGenerator<StreamEvent, void, unknown>;
  executeExpandSearch?: (params: ExpandSearchParams) => AsyncGenerator<StreamEvent, void, unknown>;
}
