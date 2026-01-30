import { useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { searchSessionStorage } from "./searchSessionStorage";
import type { SavedSearchState, SearchStateHookReturn, CompanyWithContacts } from "./types";

/**
 * Custom hook for managing search state persistence and restoration
 * Uses sessionStorage for refresh-persistence on /app routes
 * URL-based routes (/search/:slug/:listId) should fetch from API directly
 */
export function useSearchState(
  setCurrentResults: React.Dispatch<React.SetStateAction<CompanyWithContacts[] | null>>
): SearchStateHookReturn {
  const isMountedRef = useRef(true);
  const isInitializedRef = useRef(false);
  const hasSessionRestoredDataRef = useRef(false);
  const refreshVersionRef = useRef(0);
  
  const loadSearchState = useCallback((): SavedSearchState | null => {
    return searchSessionStorage.load();
  }, []);
  
  const persistSearchState = useCallback((
    state: {
      currentResults: CompanyWithContacts[];
      emailSearchCompleted?: boolean;
      emailSearchTimestamp?: number | null;
      navigationRefreshTimestamp?: number;
    },
    currentValues: {
      currentQuery: string;
      currentListId: number | null;
      lastExecutedQuery: string | null;
    }
  ) => {
    const queryToSave = currentValues.lastExecutedQuery || currentValues.currentQuery;
    const stateToSave: SavedSearchState = {
      currentQuery: queryToSave,
      currentResults: state.currentResults,
      currentListId: currentValues.currentListId,
      lastExecutedQuery: currentValues.lastExecutedQuery || queryToSave,
      ...(state.emailSearchCompleted !== undefined && { emailSearchCompleted: state.emailSearchCompleted }),
      ...(state.emailSearchTimestamp !== undefined && { emailSearchTimestamp: state.emailSearchTimestamp ?? undefined }),
      ...(state.navigationRefreshTimestamp !== undefined && { navigationRefreshTimestamp: state.navigationRefreshTimestamp })
    };
    
    searchSessionStorage.save(stateToSave);
    
    console.log('Persisted search state to session storage:', {
      companyCount: state.currentResults.length,
      emailCount: state.currentResults.reduce((total, company) => 
        total + (company.contacts?.filter(c => c.email && c.email.length > 0).length || 0), 0
      ),
      hasListId: !!currentValues.currentListId
    });
  }, []);
  
  const refreshContactDataFromDatabase = useCallback(async (
    companies: CompanyWithContacts[],
    options?: { forceFresh?: boolean }
  ): Promise<CompanyWithContacts[]> => {
    try {
      console.log('Refreshing contact data from database...');
      
      const refreshedResults = await Promise.all(
        companies.map(async (company) => {
          try {
            const response = await apiRequest('GET', `/api/companies/${company.id}/contacts`);
            const freshContacts = await response.json();
            
            return {
              ...company,
              contacts: freshContacts
            };
          } catch (error) {
            console.error(`Failed to refresh contacts for company ${company.id}:`, error);
            return company;
          }
        })
      );
      
      console.log('Contact data refresh completed from database');
      return refreshedResults;
    } catch (error) {
      console.error('Database refresh failed:', error);
      return companies;
    }
  }, []);
  
  const sortCompaniesByContactCount = (companies: CompanyWithContacts[]): CompanyWithContacts[] => {
    return [...companies].sort((a, b) => {
      const contactsA = a.contacts?.length || 0;
      const contactsB = b.contacts?.length || 0;
      return contactsB - contactsA;
    });
  };
  
  const refreshAndUpdateResults = useCallback(async (
    companies: CompanyWithContacts[],
    stateValues: {
      currentQuery: string;
      currentListId: number | null;
      lastExecutedQuery: string | null;
    },
    options: {
      forceUiReset?: boolean;
      clearEmailSearchTimestamp?: boolean;
      forceFresh?: boolean;
      additionalStateFields?: {
        emailSearchCompleted?: boolean;
        emailSearchTimestamp?: number | null;
        navigationRefreshTimestamp?: number;
      };
    } = {}
  ): Promise<CompanyWithContacts[]> => {
    try {
      const thisVersion = ++refreshVersionRef.current;
      
      const refreshedResults = await refreshContactDataFromDatabase(
        companies,
        { forceFresh: options.forceFresh }
      );
      
      if (thisVersion !== refreshVersionRef.current) {
        console.log('Skipping stale refresh result from version', thisVersion);
        return companies;
      }
      
      const sortedResults = sortCompaniesByContactCount(refreshedResults);
      
      if (options.forceUiReset) {
        setCurrentResults([]);
        setTimeout(() => {
          if (thisVersion === refreshVersionRef.current) {
            setCurrentResults(sortedResults);
          }
        }, 100);
      } else {
        setCurrentResults(sortedResults);
      }
      
      persistSearchState({
        currentResults: sortedResults,
        ...options.additionalStateFields
      }, stateValues);
      
      if (options.clearEmailSearchTimestamp) {
        sessionStorage.removeItem('lastEmailSearchTimestamp');
        console.log('Cleared lastEmailSearchTimestamp');
      }
      
      console.log('Refreshed and updated results:', {
        companyCount: sortedResults.length,
        companiesWithContacts: sortedResults.filter(c => c.contacts && c.contacts.length > 0).length
      });
      
      return sortedResults;
    } catch (error) {
      console.error('Failed to refresh and update results:', error);
      return companies;
    }
  }, [refreshContactDataFromDatabase, persistSearchState, setCurrentResults]);
  
  return {
    loadSearchState,
    persistSearchState,
    refreshContactDataFromDatabase,
    refreshAndUpdateResults,
    isMountedRef,
    isInitializedRef,
    hasSessionRestoredDataRef,
    refreshVersionRef,
  };
}
