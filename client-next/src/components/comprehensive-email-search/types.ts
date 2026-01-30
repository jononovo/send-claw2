export interface ComprehensiveSearchButtonProps {
  contact: {
    id: number;
    email?: string | null;
    completedSearches?: string[] | null;
  };
  onSearch: (contactId: number) => void | Promise<void>;
  isPending?: boolean;
  displayMode?: 'icon' | 'text' | 'icon-text';
  size?: 'sm' | 'md';
  className?: string;
}

export type SearchState = 'default' | 'pending' | 'failed' | 'success';