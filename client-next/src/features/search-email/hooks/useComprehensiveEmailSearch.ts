import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@shared/schema';
import { consolidatedEmailSearch } from '../services/api';
import type { 
  SearchContext, 
  UseComprehensiveEmailSearchOptions,
  ComprehensiveEmailSearchResult 
} from '../types';

export function useComprehensiveEmailSearch(
  options: UseComprehensiveEmailSearchOptions = {}
): ComprehensiveEmailSearchResult {
  const [pendingSearchIds, setPendingSearchIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const { onContactUpdate, onSearchComplete } = options;

  const handleComprehensiveEmailSearch = useCallback(async (
    contactId: number,
    contact: Contact,
    searchContext?: SearchContext
  ) => {
    if (pendingSearchIds.has(contactId)) return;
    
    if (contact.email) {
      toast({
        title: "Email Already Found",
        description: `${contact.name} already has email: ${contact.email}`,
        variant: "default",
      });
      return;
    }
    
    if (contact.completedSearches?.includes('comprehensive_search')) {
      console.log('[search-email] Comprehensive search already attempted, allowing retry');
    }
    
    setPendingSearchIds(prev => new Set(prev).add(contactId));
    
    try {
      // Single consolidated API call - server handles waterfall and billing
      const result = await consolidatedEmailSearch(contactId, searchContext);
      
      if (result.emailFound && result.contact) {
        toast({
          title: "Email Found!",
          description: `Found email for ${contact.name} via ${result.source}`,
          variant: "default",
        });
        
        onContactUpdate?.(result.contact);
        onSearchComplete?.(contactId, true);
      } else {
        toast({
          title: "Search Complete",
          description: `No email found for ${contact.name}. All search methods exhausted.`,
          variant: "default",
        });
        
        if (result.contact) {
          onContactUpdate?.(result.contact);
        }
        onSearchComplete?.(contactId, false);
      }
      
    } catch (error: any) {
      console.error('[search-email] Comprehensive search error:', error);
      
      // Handle insufficient credits error
      if (error?.message?.includes('402') || error?.status === 402) {
        toast({
          title: "Insufficient Credits",
          description: "Please add more credits to continue searching for emails.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search Error",
          description: "Failed to complete email search. Please try again.",
          variant: "destructive",
        });
      }
      
      onSearchComplete?.(contactId, false);
    } finally {
      setPendingSearchIds(prev => {
        const next = new Set(prev);
        next.delete(contactId);
        return next;
      });
    }
  }, [pendingSearchIds, toast, onContactUpdate, onSearchComplete]);

  return {
    handleComprehensiveEmailSearch,
    pendingSearchIds,
    isPending: (contactId: number) => pendingSearchIds.has(contactId)
  };
}
