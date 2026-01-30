import { useState, useCallback, useRef } from 'react';
import type { SuperSearchState, SearchPlan, SuperSearchResult } from '../types';

const initialState: SuperSearchState = {
  status: 'idle',
  plan: null,
  results: [],
  progressMessages: [],
  error: null,
  completionStats: null
};

export function useSuperSearch() {
  const [state, setState] = useState<SuperSearchState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(initialState);
  }, []);

  const startSearch = useCallback(async (query: string, listId?: number, variantId?: string) => {
    reset();
    
    setState(prev => ({ ...prev, status: 'connecting' }));

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/super-search/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, listId, variantId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start search');
      }

      setState(prev => ({ ...prev, status: 'streaming' }));

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (currentEventType === 'error') {
              let errorMessage = data;
              try {
                const parsed = JSON.parse(data);
                errorMessage = parsed.error || parsed.message || data;
              } catch {
                // data is already a plain text error
              }
              setState(prev => ({
                ...prev,
                status: 'error',
                error: errorMessage
              }));
              currentEventType = '';
              continue;
            }
            
            if (currentEventType === 'complete') {
              try {
                const parsed = JSON.parse(data);
                setState(prev => ({
                  ...prev,
                  status: 'complete',
                  completionStats: parsed
                }));
              } catch (e) {
                setState(prev => ({ ...prev, status: 'complete' }));
              }
              currentEventType = '';
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              if (currentEventType === 'plan' || ('queryType' in parsed && 'displayMode' in parsed)) {
                setState(prev => ({
                  ...prev,
                  plan: parsed as SearchPlan
                }));
              } else if (currentEventType === 'progress' || typeof parsed === 'string') {
                const message = typeof parsed === 'string' ? parsed : String(parsed);
                setState(prev => ({
                  ...prev,
                  progressMessages: [...prev.progressMessages, message]
                }));
              } else if (currentEventType === 'result' || ('type' in parsed && (parsed.type === 'company' || parsed.type === 'contact'))) {
                setState(prev => ({
                  ...prev,
                  results: [...prev.results, parsed as SuperSearchResult]
                }));
              } else if ('totalResults' in parsed) {
                setState(prev => ({
                  ...prev,
                  status: 'complete',
                  completionStats: parsed
                }));
              }
            } catch (e) {
              // Not JSON - might be a plain text progress message
              if (data.trim() && currentEventType === 'progress') {
                setState(prev => ({
                  ...prev,
                  progressMessages: [...prev.progressMessages, data.trim()]
                }));
              }
            }
            
            currentEventType = '';
          }
        }
      }

      setState(prev => {
        if (prev.status !== 'error') {
          return { ...prev, status: 'complete' };
        }
        return prev;
      });

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Search failed'
      }));
    }
  }, [reset]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    reset();
  }, [reset]);

  const loadFromSaved = useCallback((plan: SearchPlan, results: SuperSearchResult[]) => {
    setState({
      status: 'complete',
      plan,
      results,
      progressMessages: [],
      error: null,
      completionStats: {
        totalResults: results.length,
        companiesSaved: results.filter(r => r.type === 'company').length,
        contactsSaved: results.filter(r => r.type === 'contact').length
      }
    });
  }, []);

  return {
    ...state,
    startSearch,
    cancel,
    reset,
    loadFromSaved,
    isLoading: state.status === 'connecting' || state.status === 'streaming'
  };
}
