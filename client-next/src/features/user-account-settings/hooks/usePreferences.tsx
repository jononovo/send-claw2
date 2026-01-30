/**
 * Custom hook for managing user preferences
 * Provides preferences data fetching and update functionality
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { userAccountApi } from "../services/api";
import type { UserPreferences, UserEmailPreferences } from "../types";

export function usePreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const preferencesQuery = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    queryFn: userAccountApi.getPreferences,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: UserPreferences) => userAccountApi.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update preferences.",
        variant: "destructive",
      });
    },
  });

  return {
    preferences: preferencesQuery.data,
    isLoading: preferencesQuery.isLoading,
    error: preferencesQuery.error,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
}

export function useEmailPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch email preferences
  const emailPreferencesQuery = useQuery<UserEmailPreferences>({
    queryKey: ["/api/email-preferences"],
    queryFn: userAccountApi.getEmailPreferences,
  });

  // Update email preferences mutation
  const updateEmailPreferencesMutation = useMutation({
    mutationFn: (preferences: Partial<UserEmailPreferences>) => 
      userAccountApi.updateEmailPreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-preferences"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update email preferences.",
        variant: "destructive",
      });
    },
  });

  return {
    emailPreferences: emailPreferencesQuery.data,
    isLoading: emailPreferencesQuery.isLoading,
    error: emailPreferencesQuery.error,
    updateEmailPreferences: updateEmailPreferencesMutation.mutate,
    isUpdating: updateEmailPreferencesMutation.isPending,
  };
}