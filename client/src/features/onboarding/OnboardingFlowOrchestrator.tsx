import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SearchConfirmationModal } from './SearchConfirmationModal';
import { ProductOnboardingForm } from '@/components/product-onboarding-form';
import { CustomerProfileForm } from '@/components/customer-profile-form';
import { ICPPreviewModal } from './ICPPreviewModal';
import { SenderProfileForm } from '@/components/sender-profile-form';
import { CompletionModal } from './CompletionModal';
import { useLocation } from 'wouter';

type OnboardingPhase = 
  | 'search_confirmation'
  | 'product_setup' 
  | 'icp_generation'
  | 'icp_preview'
  | 'sender_setup'
  | 'complete';

interface OnboardingFlowOrchestratorProps {
  searchQuery: string;
  searchResults: any[];
  onComplete?: () => void;
  onClose?: () => void;
}

export function OnboardingFlowOrchestrator({ 
  searchQuery, 
  searchResults,
  onComplete,
  onClose 
}: OnboardingFlowOrchestratorProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentPhase, setCurrentPhase] = useState<OnboardingPhase>('search_confirmation');
  const [productId, setProductId] = useState<number | null>(null);
  const [generatedICP, setGeneratedICP] = useState<any>(null);
  const [customerProfileId, setCustomerProfileId] = useState<number | null>(null);
  const [senderProfileId, setSenderProfileId] = useState<number | null>(null);
  const [skipSenderProfile, setSkipSenderProfile] = useState(false);

  // Generate ICP based on search results and product
  const generateICP = useMutation({
    mutationFn: async (data?: { productId: number }) => {
      const idToUse = data?.productId || productId;
      console.log('Generating ICP with productId:', idToUse);
      
      if (!idToUse) {
        throw new Error('Product ID is required for ICP generation');
      }
      
      const res = await apiRequest('POST', '/api/onboarding/generate-icp', {
        searchQuery,
        searchResults: searchResults.slice(0, 10).map(r => ({
          name: r.name,
          description: r.description,
          size: r.size,
          industry: r.industry
        })),
        productId: idToUse
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedICP(data.icp);
      setCurrentPhase('icp_preview');
    },
    onError: (error) => {
      console.error('ICP generation error:', error);
      toast({
        title: 'Error generating ICP',
        description: error instanceof Error ? error.message : 'We couldn\'t generate your ideal customer profile. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Save ICP as customer profile
  const saveICPAsProfile = useMutation({
    mutationFn: async (icpData: any) => {
      const res = await apiRequest('POST', '/api/customer-profiles', {
        title: icpData.title || 'Generated ICP',
        exampleCompany: icpData.exampleCompany || searchResults[0]?.name || '',
        searchPrompt: icpData.searchPrompt || searchQuery,
        additionalContext: icpData.additionalContext || '',
        industry: icpData.industry || '',
        companySize: icpData.companySize || '',
        targetRoles: icpData.targetRoles || [],
        painPoints: icpData.painPoints || [],
        valueProposition: icpData.valueProposition || ''
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCustomerProfileId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/customer-profiles'] });
      
      // Move to sender setup or complete
      if (!skipSenderProfile) {
        setCurrentPhase('sender_setup');
      } else {
        handleComplete();
      }
    }
  });

  const handleSearchConfirm = () => {
    setCurrentPhase('product_setup');
  };

  const handleSearchRefine = () => {
    // Close the orchestrator and return to search
    if (onClose) onClose();
  };

  const handleProductComplete = (newProductId?: number) => {
    if (newProductId) {
      setProductId(newProductId);
      // Start ICP generation with the productId
      generateICP.mutate({ productId: newProductId });
      setCurrentPhase('icp_generation');
    }
  };

  const handleICPConfirm = (updatedICP: any) => {
    saveICPAsProfile.mutate(updatedICP);
  };

  const handleICPEdit = () => {
    // Open customer profile form with pre-filled data
    setCurrentPhase('icp_preview'); // Keep showing ICP preview but with edit mode
  };

  const handleSenderProfileComplete = (profileId?: number) => {
    if (profileId) {
      setSenderProfileId(profileId);
    }
    handleComplete();
  };

  const handleSkipSenderProfile = () => {
    setSkipSenderProfile(true);
    if (customerProfileId) {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setCurrentPhase('complete');
    
    // Activate the campaign if all components are ready
    if (productId && customerProfileId) {
      apiRequest('PUT', '/api/daily-outreach/preferences', {
        enabled: true,
        activeProductId: productId,
        activeCustomerProfileId: customerProfileId,
        activeSenderProfileId: senderProfileId
      }).then(() => {
        toast({
          title: 'Campaign activated!',
          description: 'Your daily outreach campaign is now active.'
        });
      });
    }
  };

  const handleFinalComplete = () => {
    if (onComplete) onComplete();
    // Navigate to campaign dashboard
    setLocation('/streak');
  };

  return (
    <>
      {/* Search Confirmation */}
      <SearchConfirmationModal
        open={currentPhase === 'search_confirmation'}
        onClose={() => onClose && onClose()}
        onConfirm={handleSearchConfirm}
        onRefine={handleSearchRefine}
        searchQuery={searchQuery}
        searchResults={searchResults}
      />

      {/* Product Setup - using existing form */}
      <ProductOnboardingForm
        open={currentPhase === 'product_setup'}
        onClose={() => setCurrentPhase('search_confirmation')}
        onComplete={handleProductComplete}
      />

      {/* ICP Generation Loading State */}
      {currentPhase === 'icp_generation' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-sm">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-center">
                <span className="font-medium">Analyzing your product and market...</span>
                <br />
                <span className="text-sm text-muted-foreground">
                  Generating your ideal customer profile
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ICP Preview/Confirmation */}
      <ICPPreviewModal
        open={currentPhase === 'icp_preview'}
        onClose={() => setCurrentPhase('product_setup')}
        onConfirm={handleICPConfirm}
        onEdit={handleICPEdit}
        icpData={generatedICP}
        searchResults={searchResults}
      />

      {/* Sender Profile Setup - optional */}
      <SenderProfileForm
        open={currentPhase === 'sender_setup'}
        onClose={handleSkipSenderProfile}
        onComplete={handleSenderProfileComplete}
      />

      {/* Completion */}
      <CompletionModal
        open={currentPhase === 'complete'}
        onClose={handleFinalComplete}
        productId={productId}
        customerProfileId={customerProfileId}
        senderProfileId={senderProfileId}
      />
    </>
  );
}