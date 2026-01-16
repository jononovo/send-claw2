import type { SavedSearchState } from "./types";

const STORAGE_KEY = 'searchState';

export const searchSessionStorage = {
  load: (): SavedSearchState | null => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedSearchState;
        if (parsed.currentQuery || (parsed.currentResults && parsed.currentResults.length > 0)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading search session state:', error);
    }
    return null;
  },

  save: (state: SavedSearchState): void => {
    try {
      if (!state.currentQuery && (!state.currentResults || state.currentResults.length === 0)) {
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving search session state:', error);
    }
  },

  clear: (): void => {
    sessionStorage.removeItem(STORAGE_KEY);
  }
};
