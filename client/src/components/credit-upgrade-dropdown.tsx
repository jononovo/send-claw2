import { useState } from 'react';
import { ChevronDown, Coins } from 'lucide-react';
import { useQuery } from "@tanstack/react-query";
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from "@/lib/utils";
import { PlanCards } from '@/components/plan-cards';
import { useAuth } from "@/hooks/use-auth";

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

export function CreditUpgradeDropdown() {
  const { user } = useAuth();
  
  const { data: credits, isLoading } = useQuery<CreditData>({
    queryKey: ['/api/credits'],
    enabled: !!user,
  });

  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/stripe/subscription-status'],
    enabled: !!user,
  });

  // Don't render for unauthenticated users
  if (!user) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);

  const hasActiveSubscription = subscriptionStatus?.hasSubscription && subscriptionStatus?.status === 'active';
  const userCurrentPlan = subscriptionStatus?.currentPlan;

  const getUpgradeText = () => {
    if (hasActiveSubscription) {
      if (userCurrentPlan === 'ugly-duckling') {
        return "Ready to level up?";
      }
      return "You're subscribed!";
    }
    return "Choose your plan to get started";
  };

  const getUpgradeSubtext = () => {
    if (hasActiveSubscription) {
      if (userCurrentPlan === 'ugly-duckling') {
        return "Get 4x more credits + bigger bonus";
      }
      return "You have access to premium features!";
    }
    return "Unlock more credits with a monthly subscription";
  };

  if (isLoading || !credits || typeof credits.balance !== 'number') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
        <Coins className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <>
      {/* Custom overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group relative flex items-center text-sm font-medium h-auto p-2 hover:bg-accent-hover hover:text-accent-foreground transition-all overflow-hidden"
          data-credits-target
          data-testid="credits-display"
        >
          <Coins className={cn(
            "h-4 w-4 transition-all",
            credits.balance >= 1 ? "text-yellow-500" : "text-red-600"
          )} />
          <div className="flex items-center gap-2 max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-200 ease-in-out overflow-hidden">
            <span className="text-muted-foreground ml-2">
              {credits.balance < 0 ? credits.balance : `${credits.balance.toLocaleString()}`}
            </span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 bg-background border shadow-2xl z-50"
        sideOffset={8}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-muted/50 to-muted/30 p-3 border-b">
          <div className="flex items-center gap-2">
            <Coins className={cn(
              "h-5 w-5",
              credits.balance >= 1 ? "text-yellow-500" : "text-red-600"
            )} />
            <div className="flex items-baseline gap-2">
              <p className="font-semibold text-foreground">{credits.balance.toLocaleString()} Credits</p>
              <p className="text-xs text-muted-foreground">Current balance</p>
            </div>
          </div>
        </div>

        {/* Upgrade Message */}
        <div className="px-4 pt-3 pb-2 text-center">
          <h3 className="font-semibold text-foreground mb-1">{getUpgradeText()}</h3>
          <p className="text-sm text-muted-foreground">
            {getUpgradeSubtext()}
          </p>
        </div>

        {/* Plans */}
        <div className="px-4 pb-2">
          <PlanCards onClose={() => setIsOpen(false)} />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-muted/30 text-center border-t">
          <p className="text-xs text-muted-foreground mb-1">
            Plans auto-renew monthly. Cancel anytime.
          </p>
          <Button 
            variant="link"
            size="sm"
            onClick={() => window.open('/pricing', '_blank')}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 h-auto p-0 font-medium"
          >
            See full details and features →
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}