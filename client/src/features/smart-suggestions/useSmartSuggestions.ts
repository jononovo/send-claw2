import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Suggestion, SearchContext, SmartSuggestionsState } from "./types";

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    id: "find-more",
    icon: "search",
    title: "Find More Results",
    description: "Expand search to include similar roles and companies",
    action: { type: "expand_results" },
    priority: 1,
  },
  {
    id: "expand-location",
    icon: "map-pin",
    title: "Expand Location",
    description: "Include nearby regions and countries",
    action: { type: "expand_location" },
    priority: 2,
  },
  {
    id: "find-emails",
    icon: "mail",
    title: "Find Missing Emails",
    description: "Search for email addresses across all contacts",
    action: { type: "find_emails" },
    priority: 3,
  },
  {
    id: "filter-seniority",
    icon: "user",
    title: "Filter by Seniority",
    description: "Focus on senior, lead, or manager roles",
    action: { type: "filter_seniority" },
    priority: 4,
  },
];

interface UseSmartSuggestionsOptions {
  onActionExecute?: (action: Suggestion["action"]) => void;
}

export function useSmartSuggestions(options: UseSmartSuggestionsOptions = {}) {
  const [state, setState] = useState<SmartSuggestionsState>({
    suggestions: [],
    isLoading: false,
    isOpen: false,
    error: null,
  });

  const generateSuggestionsMutation = useMutation({
    mutationFn: async (context: SearchContext) => {
      const response = await apiRequest("POST", "/api/smart-suggestions/generate", context);
      const data = await response.json();
      return data as { suggestions: Suggestion[] };
    },
    onSuccess: (data) => {
      setState((prev) => ({
        ...prev,
        suggestions: data.suggestions,
        isLoading: false,
        error: null,
      }));
    },
    onError: (error: Error) => {
      console.error("Failed to generate suggestions:", error);
      setState((prev) => ({
        ...prev,
        suggestions: DEFAULT_SUGGESTIONS,
        isLoading: false,
        error: error.message,
      }));
    },
  });

  const generateSuggestions = useCallback(
    (context: SearchContext) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      generateSuggestionsMutation.mutate(context);
    },
    [generateSuggestionsMutation]
  );

  const setDefaultSuggestions = useCallback((context: SearchContext) => {
    const suggestions = [...DEFAULT_SUGGESTIONS];
    
    if (context.resultCount > 50) {
      suggestions.unshift({
        id: "narrow-results",
        icon: "filter",
        title: "Narrow Results",
        description: `${context.resultCount} results found. Add filters to focus.`,
        action: { type: "narrow_results" },
        priority: 0,
      });
    }
    
    if (context.emailCount < context.resultCount * 0.5) {
      const emailSuggestion = suggestions.find((s) => s.id === "find-emails");
      if (emailSuggestion) {
        emailSuggestion.description = `Only ${context.emailCount} of ${context.resultCount} have emails`;
        emailSuggestion.priority = 0;
      }
    }
    
    setState((prev) => ({
      ...prev,
      suggestions: suggestions.sort((a, b) => a.priority - b.priority).slice(0, 4),
    }));
  }, []);

  const openPanel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const closePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const togglePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const executeAction = useCallback(
    (suggestion: Suggestion) => {
      options.onActionExecute?.(suggestion.action);
    },
    [options]
  );

  return {
    ...state,
    generateSuggestions,
    setDefaultSuggestions,
    openPanel,
    closePanel,
    togglePanel,
    executeAction,
  };
}
