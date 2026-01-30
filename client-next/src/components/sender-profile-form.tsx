import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, Mail, Building2, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface SenderProfileFormProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (profileId?: number) => void;
}

interface FormData {
  // Page 1 - Essential
  email: string;
  displayName: string;
  // Page 2 - Optional
  firstName: string;
  lastName: string;
  title: string;
  // Page 3 - Optional
  company: string;
  city: string;
  website: string;
}

export function SenderProfileForm({ open, onClose, onComplete }: SenderProfileFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    displayName: '',
    firstName: '',
    lastName: '',
    title: '',
    company: '',
    city: '',
    website: ''
  });

  const saveProfile = useMutation({
    mutationFn: async (data: FormData) => {
      // Build the name from display name or first/last if available
      const name = data.displayName || `${data.firstName} ${data.lastName}`.trim() || 'Unknown Sender';
      
      const res = await apiRequest('POST', '/api/sender-profiles', {
        name: name,
        email: data.email,
        firstName: data.firstName || data.displayName.split(' ')[0] || '',
        lastName: data.lastName || data.displayName.split(' ').slice(1).join(' ') || '',
        title: data.title || '',
        company: data.company || '',
        city: data.city || '',
        website: data.website || '',
        isDefault: false
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sender-profiles'] });
      toast({
        title: 'Sender profile created',
        description: 'Your sender profile has been saved'
      });
      if (onComplete) onComplete(data?.id);
      handleClose();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save sender profile',
        variant: 'destructive'
      });
    }
  });

  const handleClose = () => {
    setStep(1);
    setFormData({
      email: '',
      displayName: '',
      firstName: '',
      lastName: '',
      title: '',
      company: '',
      city: '',
      website: ''
    });
    onClose();
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.email.trim()) {
        toast({
          title: 'Email is required',
          description: 'Please enter your sender email address',
          variant: 'destructive'
        });
        return;
      }
      if (!formData.displayName.trim()) {
        toast({
          title: 'Display name is required',
          description: 'Please enter the name recipients will see',
          variant: 'destructive'
        });
        return;
      }
      // Basic email validation
      if (!formData.email.includes('@')) {
        toast({
          title: 'Invalid email',
          description: 'Please enter a valid email address',
          variant: 'destructive'
        });
        return;
      }
    }
    
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSkipToSave = () => {
    // Can save with just page 1 data
    saveProfile.mutate(formData);
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
              <DialogTitle className="text-2xl">Set up your sender identity</DialogTitle>
              <DialogDescription className="text-base">
                How will you appear in recipient inboxes?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Sender Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@company.com"
                  data-testid="input-sender-email"
                />
                <p className="text-xs text-muted-foreground">
                  The email address your messages will be sent from
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-name">
                  Email Sender Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="display-name"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="John from Acme Corp"
                  data-testid="input-display-name"
                />
                <p className="text-xs text-muted-foreground">
                  What recipients see in their inbox (e.g., "Sarah from TechCo")
                </p>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                  ✓ This is all you need to create your profile!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  You can add more details on the next pages or save now.
                </p>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Personal details (Optional)</DialogTitle>
              <DialogDescription className="text-base">
                Add more information about yourself
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  data-testid="input-first-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  data-testid="input-last-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Role / Designation</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Sales Director, CEO, Founder, etc."
                  data-testid="input-title"
                />
                <p className="text-xs text-muted-foreground">
                  Your professional title or role
                </p>
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Company information (Optional)</DialogTitle>
              <DialogDescription className="text-base">
                Add your company details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Acme Corporation"
                  data-testid="input-company"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="San Francisco"
                  data-testid="input-city"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Company Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company.com"
                  data-testid="input-website"
                />
                <p className="text-xs text-muted-foreground">
                  Your company's website URL
                </p>
              </div>

              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Profile complete!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your sender profile is ready to use in email campaigns.
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
            
            {step === 1 && (
              <>
                <Button 
                  variant="outline"
                  onClick={handleSkipToSave}
                  disabled={saveProfile.isPending || !formData.email || !formData.displayName}
                  data-testid="button-save-basic"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Basic Profile
                </Button>
                <Button onClick={handleNext} data-testid="button-next">
                  Add More Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
            
            {step === 2 && (
              <Button onClick={handleNext} data-testid="button-next">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {step === 3 && (
              <Button 
                onClick={handleSubmit}
                disabled={saveProfile.isPending}
                data-testid="button-save-profile"
              >
                {saveProfile.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Save Sender Profile
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