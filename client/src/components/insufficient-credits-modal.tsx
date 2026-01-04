import { Coins } from 'lucide-react';
import { useQuery } from "@tanstack/react-query";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlanCards } from '@/components/plan-cards';
import { useInsufficientCredits } from '@/contexts/insufficient-credits-context';
import { useAuth } from '@/hooks/use-auth';
import { cn } from "@/lib/utils";

interface CreditData {
  balance: number;
  isBlocked: boolean;
  lastTopUp: number;
  totalUsed: number;
  monthlyAllowance: number;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string | null;
  currentPlan: string | null;
}

export function InsufficientCreditsModal() {
  const { isOpen, closeModal } = useInsufficientCredits();
  const { user } = useAuth();
  
  const { data: credits } = useQuery<CreditData>({
    queryKey: ['/api/credits'],
    enabled: !!user && isOpen,
  });

  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/stripe/subscription-status'],
    enabled: !!user && isOpen,
  });

  const hasActiveSubscription = subscriptionStatus?.hasSubscription && subscriptionStatus?.status === 'active';
  const userCurrentPlan = subscriptionStatus?.currentPlan;

  const getHeaderText = () => {
    if (hasActiveSubscription) {
      if (userCurrentPlan === 'ugly-duckling') {
        return "Time to upgrade!";
      }
      return "You've run out of credits";
    }
    return "You need more credits";
  };

  const getSubtext = () => {
    if (hasActiveSubscription) {
      if (userCurrentPlan === 'ugly-duckling') {
        return "Upgrade to Mama Duck for 4x more credits + a bigger bonus";
      }
      return "Your credits will refresh next month";
    }
    return "Choose a plan to unlock more credits and keep selling";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent 
        className="sm:max-w-md p-0 bg-background border shadow-2xl overflow-hidden"
        data-testid="modal-insufficient-credits"
      >
        <DialogHeader className="bg-gradient-to-r from-muted/50 to-muted/30 p-4 border-b">
          <div className="flex items-center gap-2">
            <Coins className={cn(
              "h-5 w-5",
              (credits?.balance ?? 0) >= 1 ? "text-yellow-500" : "text-red-600"
            )} />
            <div className="flex items-baseline gap-2">
              <p className="font-semibold text-foreground">
                {(credits?.balance ?? 0).toLocaleString()} Credits
              </p>
              <p className="text-xs text-muted-foreground">Current balance</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 pt-4 pb-2 text-center">
          <DialogTitle className="font-semibold text-foreground text-lg mb-1">
            {getHeaderText()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {getSubtext()}
          </p>
        </div>

        <div className="px-4 pb-2">
          <PlanCards onClose={closeModal} />
        </div>

        <div className="px-4 py-3 bg-muted/30 text-center border-t">
          <p className="text-xs text-muted-foreground mb-1">
            Plans auto-renew monthly. Cancel anytime.
          </p>
          <Button 
            variant="link"
            size="sm"
            onClick={() => {
              closeModal();
              window.open('/pricing', '_blank');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 h-auto p-0 font-medium"
            data-testid="link-pricing-details"
          >
            See full details and features →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
