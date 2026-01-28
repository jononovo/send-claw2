import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { TopNavAdContextValue, Offer } from './types';
import { createOffersRegistry, setNeedsPasswordSetup } from './registry';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const DISMISSED_OFFERS_KEY = 'dismissedOffers';

function getDismissedOffers(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_OFFERS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedOffers(dismissed: Set<string>): void {
  localStorage.setItem(DISMISSED_OFFERS_KEY, JSON.stringify(Array.from(dismissed)));
}

const TopNavAdContext = createContext<TopNavAdContextValue | null>(null);

interface TopNavAdProviderProps {
  children: ReactNode;
}

export function TopNavAdProvider({ children }: TopNavAdProviderProps) {
  const [dismissedOffers, setDismissedOffers] = useState<Set<string>>(() => getDismissedOffers());
  const { user, emailVerified } = useAuth();
  const { toast } = useToast();

  const resendVerificationEmail = useCallback(async () => {
    try {
      const { loadFirebase } = await import('@/lib/firebase');
      const firebase = await loadFirebase();
      const currentUser = firebase.auth.currentUser;
      
      if (currentUser) {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(currentUser);
        toast({
          title: 'Verification Email Sent',
          description: 'Please check your inbox and click the verification link.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Could not send email',
        description: error.code === 'auth/too-many-requests' 
          ? 'Please wait a few minutes before requesting another email.'
          : 'Please try again later.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const offers = useMemo(() => 
    createOffersRegistry({
      onResendVerification: resendVerificationEmail,
      isLoggedIn: !!user,
      emailVerified,
    }),
    [resendVerificationEmail, user, emailVerified]
  );

  const isDismissed = useCallback((offerId: string) => {
    return dismissedOffers.has(offerId);
  }, [dismissedOffers]);

  const dismissOffer = useCallback((offerId: string) => {
    setDismissedOffers(prev => {
      const next = new Set(prev);
      next.add(offerId);
      saveDismissedOffers(next);
      return next;
    });
  }, []);

  const activeOffer = useMemo(() => {
    const eligible = offers
      .filter(offer => offer.isEligible() && !isDismissed(offer.id))
      .sort((a, b) => b.priority - a.priority);
    
    return eligible[0] || null;
  }, [offers, isDismissed]);

  const value: TopNavAdContextValue = useMemo(() => ({
    activeOffer,
    dismissOffer,
    isDismissed,
  }), [activeOffer, dismissOffer, isDismissed]);

  return (
    <TopNavAdContext.Provider value={value}>
      {children}
    </TopNavAdContext.Provider>
  );
}

export function useTopNavAd(): TopNavAdContextValue {
  const context = useContext(TopNavAdContext);
  if (!context) {
    throw new Error('useTopNavAd must be used within TopNavAdProvider');
  }
  return context;
}

export { setNeedsPasswordSetup };
