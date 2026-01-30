/**
 * Custom hook for managing user profile
 * Provides profile data fetching and update functionality
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { userAccountApi } from "../services/api";
import type { UserProfile, ProfileFormData } from "../types";

export function useProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile
  const profileQuery = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
    queryFn: userAccountApi.getProfile,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => userAccountApi.updateProfile(data),
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
}