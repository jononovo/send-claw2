import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Coins, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logConversionEvent } from '@/features/attribution';
import { useTenant } from '@/lib/tenant-context';
import { usePricingConfig } from '@/features/pricing-promos';

interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string | null;
  currentPlan: string | null;
}

export default function SubscriptionSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(10);
  const { tenant } = useTenant();

  const { data: subscriptionStatus, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/stripe/subscription-status'],
    refetchInterval: 2000,
  });

  const { data: pricingConfig } = usePricingConfig();

  const availablePlans = tenant.pricing?.plans || pricingConfig?.plans || [];
  const activePlan = availablePlans.find(
    p => p.id === subscriptionStatus?.currentPlan
  );

  const redirectPath = tenant.routes.authLanding || '/app';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLocation(redirectPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation, redirectPath]);

  const isSubscriptionActive = subscriptionStatus?.hasSubscription && subscriptionStatus?.status === 'active';

  const hasLoggedConversion = useRef(false);
  useEffect(() => {
    if (isSubscriptionActive && !hasLoggedConversion.current) {
      hasLoggedConversion.current = true;
      logConversionEvent('subscription_purchase').catch(() => {});
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'conversion', {
          send_to: 'AW-17847406917/subscription_purchase'
        });
      }
    }
  }, [isSubscriptionActive]);

  const handleGoToApp = () => {
    setLocation(redirectPath);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Confirming your subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planName = activePlan?.name || subscriptionStatus?.currentPlan || 'your plan';
  const planPrice = activePlan?.price;
  const planCredits = activePlan ? activePlan.credits + activePlan.bonus : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {isSubscriptionActive ? `Welcome to ${planName}!` : 'Payment Successful!'}
            </h1>
            <p className="text-muted-foreground">
              {isSubscriptionActive 
                ? `Your subscription is now active${planCredits ? ` and you have been awarded ${planCredits.toLocaleString()} credits` : ''}!`
                : 'Your payment is being processed. You should see your subscription activated shortly.'
              }
            </p>
          </div>

          {isSubscriptionActive && planCredits && (
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-lg p-4 border">
              <div className="flex items-center justify-center gap-2 text-cyan-700 dark:text-cyan-300">
                <Coins className="w-5 h-5" />
                <span className="font-semibold">{planCredits.toLocaleString()} Credits Added</span>
              </div>
              <p className="text-sm text-cyan-600 dark:text-cyan-400 mt-1">
                Plus {planCredits.toLocaleString()} credits every month!
              </p>
            </div>
          )}

          {isSubscriptionActive && activePlan && (
            <div className="text-left space-y-2 bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold text-foreground">Your Plan:</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• {activePlan.name}{planPrice ? ` - $${planPrice}/month` : ''}</p>
                {activePlan.features.slice(0, 3).map((feature, idx) => (
                  <p key={idx}>• {feature}</p>
                ))}
                <p>• Cancel anytime</p>
              </div>
            </div>
          )}

          <Button 
            onClick={handleGoToApp}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium"
            size="lg"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-muted-foreground">
            Redirecting in {countdown} seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
