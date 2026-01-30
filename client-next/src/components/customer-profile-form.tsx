import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Target, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface CustomerProfileFormProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (profileId?: number) => void;
}

interface FormData {
  exampleCompany: string;
  searchPrompt: string;
  additionalContext: string;
}

export function CustomerProfileForm({ open, onClose, onComplete }: CustomerProfileFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    exampleCompany: '',
    searchPrompt: '',
    additionalContext: ''
  });

  const saveProfile = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest('POST', '/api/customer-profiles', {
        title: data.searchPrompt.slice(0, 50), // Use search prompt as title
        exampleCompany: data.exampleCompany,
        searchPrompt: data.searchPrompt,
        additionalContext: data.additionalContext,
        industry: data.searchPrompt.split(' ').slice(0, 2).join(' '), // Extract first 2 words as industry
        companySize: '' // No default value
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-profiles'] });
      toast({
        title: 'Customer profile created',
        description: 'Your ideal customer profile has been saved'
      });
      if (onComplete) onComplete(data?.id);
      handleClose();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save customer profile',
        variant: 'destructive'
      });
    }
  });

  const handleClose = () => {
    setStep(1);
    setFormData({
      exampleCompany: '',
      searchPrompt: '',
      additionalContext: ''
    });
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && !formData.exampleCompany.trim()) {
      toast({
        title: 'Please fill in the field',
        description: 'Example company is required',
        variant: 'destructive'
      });
      return;
    }
    if (step === 2 && !formData.searchPrompt.trim()) {
      toast({
        title: 'Please fill in the field',
        description: 'Search prompt is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    saveProfile.mutate(formData);
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Who's your ideal customer?</DialogTitle>
              <DialogDescription className="text-base">
                Let's define your target audience
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="example-company">
                  Name a specific company who is a customer, or is very realistic for you to sell to
                </Label>
                <Input
                  id="example-company"
                  value={formData.exampleCompany}
                  onChange={(e) => setFormData(prev => ({ ...prev, exampleCompany: e.target.value }))}
                  placeholder="e.g., Marriott Hotels, Tesla, Local Coffee Shop"
                  data-testid="input-example-company"
                />
                <p className="text-xs text-muted-foreground">
                  This helps us understand your target market
                </p>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Search for similar companies</DialogTitle>
              <DialogDescription className="text-base">
                Create a specific search prompt for finding prospects
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="search-prompt">
                  Provide a prompt for finding companies that need your product/service
                </Label>
                <Textarea
                  id="search-prompt"
                  value={formData.searchPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, searchPrompt: e.target.value }))}
                  placeholder='e.g., "4-star seaside hotels in Florida" or "Family-friendly restaurants in Miami"'
                  className="min-h-[80px]"
                  data-testid="textarea-search-prompt"
                />
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs font-medium mb-1">💡 Make it more specific:</p>
                  <p className="text-xs text-muted-foreground">
                    • Add a city or community (e.g., "in downtown Boston")
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • Include a niche (e.g., "luxury", "eco-friendly", "budget")
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • Be specific about size (e.g., "10-50 employees")
                  </p>
                </div>
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Additional context</DialogTitle>
              <DialogDescription className="text-base">
                Any special circumstances we should know?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="context">
                  Is there a specific time, season, or use case when companies need your product?
                </Label>
                <Textarea
                  id="context"
                  value={formData.additionalContext}
                  onChange={(e) => setFormData(prev => ({ ...prev, additionalContext: e.target.value }))}
                  placeholder="e.g., Hotels need our service during peak tourist season, or companies preparing for trade shows need our displays"
                  className="min-h-[100px]"
                  data-testid="textarea-additional-context"
                />
                <p className="text-xs text-muted-foreground">
                  Optional - This helps us time your outreach perfectly
                </p>
              </div>

              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Ready to save!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We'll use this profile to find the perfect prospects for your outreach campaigns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        {getStepContent()}
        
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`h-2 w-8 rounded-full transition-colors ${
                  num <= step ? 'bg-primary' : 'bg-secondary'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={saveProfile.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            
            {step < 3 ? (
              <Button onClick={handleNext} data-testid="button-next">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={saveProfile.isPending}
                data-testid="button-save-profile"
              >
                {saveProfile.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Save Customer Profile
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}