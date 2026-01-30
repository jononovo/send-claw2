import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, ArrowLeft, CheckCircle, Rocket, Package, Briefcase } from 'lucide-react';

interface ProductOnboardingFormProps {
  open: boolean;
  onClose: () => void;
  onComplete: (profileId?: number) => void;
}

interface FormData {
  businessType: 'product' | 'service';
  productService: string;
  customerFeedback: string;
  website: string;
}

export function ProductOnboardingForm({ open, onClose, onComplete }: ProductOnboardingFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    businessType: 'product',
    productService: '',
    customerFeedback: '',
    website: ''
  });

  // Save product profile mutation using strategic profiles
  const saveProduct = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest('POST', '/api/strategic-profiles/quick-setup', {
        businessType: data.businessType,
        productService: data.productService,
        customerFeedback: data.customerFeedback,
        website: data.website,
        title: data.productService.slice(0, 50) // Use first 50 chars as title
      });
      return res.json();
    },
    onSuccess: async (newProfile) => {
      const profileId = newProfile?.profile?.id || newProfile?.id;
      // Enable daily outreach
      await apiRequest('PUT', '/api/daily-outreach/preferences', {
        enabled: true,
        minContactsRequired: 5,
        activeStrategicProfileId: profileId // Set the new profile as active
      });
      
      toast({
        title: 'Success!',
        description: 'Your product has been added and is now active.',
      });
      
      // Refresh the products list (which is actually strategic profiles) and related data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-outreach/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-outreach/streak-stats'] });
      
      onComplete(profileId);
      handleClose();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save your product information. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleNext = () => {
    if (step === 1 && !formData.businessType) {
      toast({
        title: 'Please select an option',
        description: 'Choose whether you offer a product or service',
        variant: 'destructive'
      });
      return;
    }
    if (step === 2 && !formData.productService.trim()) {
      toast({
        title: 'Required field',
        description: 'Please describe what you offer',
        variant: 'destructive'
      });
      return;
    }
    if (step === 3 && !formData.customerFeedback.trim()) {
      toast({
        title: 'Required field',
        description: 'Please share what customers appreciate',
        variant: 'destructive'
      });
      return;
    }
    
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    if (!formData.website.trim()) {
      // Website is optional, but let's set a default
      setFormData(prev => ({ ...prev, website: '' }));
    }
    saveProduct.mutate(formData);
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      businessType: 'product',
      productService: '',
      customerFeedback: '',
      website: ''
    });
    onClose();
  };

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Let's activate your daily sales companion</DialogTitle>
              <DialogDescription className="text-base">
                First, tell us what you offer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <RadioGroup
                value={formData.businessType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value as 'product' | 'service' }))}
              >
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-secondary cursor-pointer">
                  <RadioGroupItem value="product" id="product" />
                  <Label htmlFor="product" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Product</div>
                      <div className="text-sm text-muted-foreground">Physical or digital products</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-secondary cursor-pointer">
                  <RadioGroupItem value="service" id="service" />
                  <Label htmlFor="service" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Service</div>
                      <div className="text-sm text-muted-foreground">Professional or business services</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Describe your {formData.businessType}</DialogTitle>
              <DialogDescription className="text-base">
                Give us a one-liner about what you offer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="product-service">Your {formData.businessType} in one sentence</Label>
                <Textarea
                  id="product-service"
                  value={formData.productService}
                  onChange={(e) => setFormData(prev => ({ ...prev, productService: e.target.value }))}
                  placeholder={
                    formData.businessType === 'product' 
                      ? "e.g., AI-powered email automation tool that helps sales teams close more deals"
                      : "e.g., Digital marketing agency specializing in B2B lead generation"
                  }
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  This helps us craft personalized outreach messages
                </p>
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">What do customers love?</DialogTitle>
              <DialogDescription className="text-base">
                Share what people appreciate most about your {formData.businessType}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customer-feedback">Customer feedback</Label>
                <Textarea
                  id="customer-feedback"
                  value={formData.customerFeedback}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerFeedback: e.target.value }))}
                  placeholder={
                    formData.businessType === 'product'
                      ? "e.g., Easy to use, saves 10 hours per week, great customer support"
                      : "e.g., Professional team, delivers results quickly, transparent pricing"
                  }
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  This helps highlight your strengths in outreach
                </p>
              </div>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Almost done!</DialogTitle>
              <DialogDescription className="text-base">
                Add a link for more information (optional)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website or landing page</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                />
                <p className="text-xs text-muted-foreground">
                  Optional - Include a link prospects can visit
                </p>
              </div>

              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Ready to activate!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Once activated, you'll receive 5 personalized leads every day at your scheduled time.
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {getStepContent()}
        
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((num) => (
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
                disabled={saveProduct.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            
            {step < 4 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={saveProduct.isPending}
              >
                {saveProduct.isPending ? (
                  <>Activating...</>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Activate Daily Sales
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