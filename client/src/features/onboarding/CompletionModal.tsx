import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Rocket, Package, Users, User, ArrowRight } from 'lucide-react';
import { fireCampaignCompleteConfetti } from '@/features/animations';
import { useEffect } from 'react';

interface CompletionModalProps {
  open: boolean;
  onClose: () => void;
  productId: number | null;
  customerProfileId: number | null;
  senderProfileId: number | null;
}

export function CompletionModal({
  open,
  onClose,
  productId,
  customerProfileId,
  senderProfileId
}: CompletionModalProps) {
  
  useEffect(() => {
    if (open) {
      fireCampaignCompleteConfetti();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            You're all set!
          </DialogTitle>
          <DialogDescription className="text-base">
            Your outreach campaign is ready to launch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Success Message */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900 dark:text-green-100">Campaign Activated!</p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  You'll start receiving 5 personalized leads daily at your scheduled time.
                </p>
              </div>
            </div>
          </div>

          {/* Setup Summary */}
          <div className="space-y-2">
            <p className="text-sm font-medium">What we've set up:</p>
            
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  productId ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-900'
                }`}>
                  <Package className={`h-4 w-4 ${
                    productId ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Product/Service</p>
                  <p className="text-xs text-muted-foreground">
                    {productId ? 'Your offering is configured' : 'Not configured'}
                  </p>
                </div>
                {productId && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  customerProfileId ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-900'
                }`}>
                  <Users className={`h-4 w-4 ${
                    customerProfileId ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Ideal Customer Profile</p>
                  <p className="text-xs text-muted-foreground">
                    {customerProfileId ? 'AI-generated and optimized' : 'Not configured'}
                  </p>
                </div>
                {customerProfileId && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  senderProfileId ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-900'
                }`}>
                  <User className={`h-4 w-4 ${
                    senderProfileId ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sender Profile</p>
                  <p className="text-xs text-muted-foreground">
                    {senderProfileId ? 'Your identity is set' : 'Using default profile'}
                  </p>
                </div>
                {senderProfileId && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>
            </Card>
          </div>

          {/* Next Steps */}
          <div className="p-4 bg-primary/5 rounded-lg">
            <p className="text-sm font-medium mb-2">What happens next:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>We'll analyze your ideal customers and find matching prospects</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>Every day, you'll receive 5 personalized outreach emails to review</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>Send the emails with one click or customize them first</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} size="lg" className="gap-2">
            Go to Campaign Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}