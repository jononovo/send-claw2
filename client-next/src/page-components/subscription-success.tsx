import { useEffect, useState, useRef } from 'react';
'use client';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Coins, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logConversionEvent } from '@/features/attribution';

interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string | null;
  currentPlan: string | null;
}

export default function SubscriptionSuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  // Get subscription status to confirm activation
  const { data: subscriptionStatus, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/stripe/subscription-status'],
    refetchInterval: 2000, // Poll every 2 seconds for status updates
  });

  // Countdown redirect to main app
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/app');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  const isSubscriptionActive = subscriptionStatus?.hasSubscription && subscriptionStatus?.status === 'active';

  // Track subscription purchase for attribution and Google Ads conversion
  const hasLoggedConversion = useRef(false);
  useEffect(() => {
    if (isSubscriptionActive && !hasLoggedConversion.current) {
      hasLoggedConversion.current = true;
      // Log attribution event
      logConversionEvent('subscription_purchase').catch(() => {});
      // Fire Google Ads conversion
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'conversion', {
          send_to: 'AW-17847406917/subscription_purchase'
        });
      }
    }
  }, [isSubscriptionActive]);

  const handleGoToApp = () => {
    router.push('/app');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {isSubscriptionActive ? 'Welcome to The Ugly Duckling!' : 'Payment Successful!'}
            </h1>
            <p className="text-muted-foreground">
              {isSubscriptionActive 
                ? 'Your subscription is now active and you have been awarded 2,500 credits!'
                : 'Your payment is being processed. You should see your subscription activated shortly.'
              }
            </p>
          </div>

          {/* Credit Information */}
          {isSubscriptionActive && (
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-lg p-4 border">
              <div className="flex items-center justify-center gap-2 text-cyan-700 dark:text-cyan-300">
                <Coins className="w-5 h-5" />
                <span className="font-semibold">2,500 Credits Added</span>
              </div>
              <p className="text-sm text-cyan-600 dark:text-cyan-400 mt-1">
                Plus 2,500 credits every month!
              </p>
            </div>
          )}

          {/* Subscription Details */}
          {isSubscriptionActive && (
            <div className="text-left space-y-2 bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold text-foreground">Your Plan:</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• The Ugly Duckling - $18.95/month</p>
                <p>• 2,500 credits monthly</p>
                <p>• Full email search capabilities</p>
                <p>• Cancel anytime</p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button 
            onClick={handleGoToApp}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium"
            size="lg"
          >
            Start Prospecting
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {/* Auto-redirect notice */}
          <p className="text-xs text-muted-foreground">
            Redirecting to app in {countdown} seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}