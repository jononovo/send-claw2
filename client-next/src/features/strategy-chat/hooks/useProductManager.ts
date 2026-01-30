import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { strategicProfilesService } from '../services';
import { useToast } from '@/hooks/use-toast';
import type { StrategicProfile } from '../types';

/**
 * Custom hook for managing strategic profiles/products
 */
export function useProductManager() {
  const { toast } = useToast();

  // Query for fetching all profiles
  const profilesQuery = useQuery({
    queryKey: ['/api/products'],
    queryFn: strategicProfilesService.getProfiles
  });

  // Mutation for creating a profile
  const createProfileMutation = useMutation({
    mutationFn: strategicProfilesService.createProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Strategic profile created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create strategic profile",
        variant: "destructive"
      });
    }
  });

  // Mutation for updating a profile
  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StrategicProfile> }) =>
      strategicProfilesService.updateProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Strategic profile updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update strategic profile",
        variant: "destructive"
      });
    }
  });

  // Mutation for deleting a profile
  const deleteProfileMutation = useMutation({
    mutationFn: strategicProfilesService.deleteProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Strategic profile deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete strategic profile",
        variant: "destructive"
      });
    }
  });

  // Mutation for saving product offers
  const saveOffersMutation = useMutation({
    mutationFn: ({ productId, offers }: { productId: number; offers: any }) =>
      strategicProfilesService.saveProductOffers(productId, offers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product offers saved successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save product offers",
        variant: "destructive"
      });
    }
  });

  return {
    profiles: profilesQuery.data,
    isLoading: profilesQuery.isLoading,
    error: profilesQuery.error,
    createProfile: createProfileMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    deleteProfile: deleteProfileMutation.mutate,
    saveOffers: saveOffersMutation.mutate,
    isCreating: createProfileMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
    isDeleting: deleteProfileMutation.isPending,
    isSavingOffers: saveOffersMutation.isPending
  };
}