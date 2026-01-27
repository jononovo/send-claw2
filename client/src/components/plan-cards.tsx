import { useState } from 'react';
import { Zap, Crown, Check } from 'lucide-react';
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@/lib/utils";

interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string | null;
  currentPlan: string | null;
}

// ========================================
// TEMPORARY PROMO - Remove when promo ends
// Set PROMO_ENABLED to false to disable promotional pricing display
// ========================================
const PROMO_ENABLED = true;

const WAITLIST_STORAGE_KEY = '5ducks_waitlist_plans';

function getStoredWaitlistPlans(): string[] {
  try {
    const stored = localStorage.getItem(WAITLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveWaitlistPlans(plans: string[]) {
  try {
    localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(plans));
  } catch {
  }
}

interface PlanCardsProps {
  onClose?: () => void;
}

export function PlanCards({ onClose }: PlanCardsProps) {
  const { user } = useAuth();
  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/stripe/subscription-status'],
    enabled: !!user,
  });
  
  const { toast } = useToast();
  const [waitlistPlans, setWaitlistPlans] = useState<string[]>(() => getStoredWaitlistPlans());

  // TEMPORARY PROMO: regularPrice is the "full" price shown with strikethrough
  // price is the discounted price users actually pay
  const plans = [
    {
      id: 'ugly-duckling',
      name: 'The Duckling',
      credits: 5000,
      bonus: 3000,
      regularPrice: 82,
      price: 18.95,
      icon: Zap,
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'duckin-awesome',
      name: "Mama Duck",
      credits: 10000,
      bonus: 12000,
      regularPrice: 174,
      price: 44.95,
      icon: Crown,
      color: 'from-purple-600 to-pink-600'
    }
  ];

  const getDiscountPercent = (regular: number, discounted: number) => {
    return Math.round(((regular - discounted) / regular) * 100);
  };

  const handlePlanSelect = async (planId: string) => {
    console.log(`Selected plan: ${planId}`);
    
    if (planId === 'duckin-awesome') {
      if (!waitlistPlans.includes(planId)) {
        const newWaitlistPlans = [...waitlistPlans, planId];
        setWaitlistPlans(newWaitlistPlans);
        saveWaitlistPlans(newWaitlistPlans);
        toast({
          title: "Added to Waitlist",
          description: "We'll notify you when Mama Duck becomes available!",
        });
      }
      return;
    }
    
    if (planId === 'ugly-duckling') {
      try {
        onClose?.();
        
        const response = await apiRequest('POST', '/api/stripe/create-checkout-session', {
          planId
        });
        
        const data = await response.json();
        
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          throw new Error('No checkout URL received');
        }
      } catch (error: any) {
        console.error('Stripe checkout error:', error);
        toast({
          title: "Checkout Error",
          description: error.message || "Failed to start checkout process. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const hasActiveSubscription = subscriptionStatus?.hasSubscription && subscriptionStatus?.status === 'active';
  const userCurrentPlan = subscriptionStatus?.currentPlan;

  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const isCurrentPlan = hasActiveSubscription && userCurrentPlan === plan.id;
        const isUpgrade = plan.id === 'duckin-awesome';
        const isOnWaitlist = waitlistPlans.includes(plan.id);
        
        return (
          <Card
            key={plan.id}
            data-testid={`card-plan-${plan.id}`}
            className={cn(
              "relative transition-all duration-300 cursor-pointer hover:shadow-md hover:scale-[1.01] border shadow-md",
              isCurrentPlan 
                ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-700' 
                : 'border-border hover:border-blue-200 dark:hover:border-blue-800'
            )}
            onClick={() => !isCurrentPlan && handlePlanSelect(plan.id)}
          >
            {isCurrentPlan && (
              <div className="absolute top-2 right-2">
                <div className="bg-green-500 text-white rounded-full p-1">
                  <Check className="w-3 h-3" />
                </div>
              </div>
            )}
            
            <CardContent className="pt-3 px-3 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-border">
                  <plan.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{plan.name}</h4>
                  <div className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">{plan.credits.toLocaleString()} Credits</span>
                    <span className="text-green-600 dark:text-green-400 font-medium"> + {plan.bonus.toLocaleString()} Bonus</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* TEMPORARY PROMO: Strikethrough price + discount badge */}
                      {PROMO_ENABLED && (
                        <span className="text-sm text-foreground line-through">${plan.regularPrice}</span>
                      )}
                      <span className={cn(
                        "text-lg font-bold",
                        PROMO_ENABLED ? "text-red-700 dark:text-red-500" : "text-foreground"
                      )}>${plan.price}</span>
                      {PROMO_ENABLED && (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                          {getDiscountPercent(plan.regularPrice, plan.price)}% off
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">Monthly</span>
                  </div>
                </div>
              </div>
              
              {!isCurrentPlan && !isOnWaitlist && (
                <Button
                  data-testid={`button-select-plan-${plan.id}`}
                  className={cn(
                    "w-full mt-3 text-base group relative transition-all duration-300 transform hover:scale-102 hover:shadow-lg",
                    isUpgrade 
                      ? 'bg-gray-100 hover:bg-black hover:text-white text-black border-0' 
                      : 'bg-gradient-to-r from-accent-light to-accent hover:from-accent hover:to-accent-dark text-white border-0 shadow-md hover:shadow-lg'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelect(plan.id);
                  }}
                >
                  {isUpgrade ? (
                    <>
                      <span className="transition-all duration-700 delay-1000 group-hover:opacity-0 group-hover:scale-95">
                        Join Waitlist
                      </span>
                      <span className="absolute transition-all duration-700 delay-1000 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100">
                        Coming Soon
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="transition-all duration-700 delay-1000 group-hover:opacity-0 group-hover:scale-95">
                        Upgrade
                      </span>
                      <span className="absolute transition-all duration-700 delay-1000 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100">
                        Let's Go
                      </span>
                    </>
                  )}
                </Button>
              )}
              
              {isOnWaitlist && (
                <div className="mt-3 text-center">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Added to Waitlist</span>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="mt-3 text-center">
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Current Plan</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
