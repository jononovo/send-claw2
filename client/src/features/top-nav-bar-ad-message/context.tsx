import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { TopNavAdContextValue, Offer } from './types';
import { createOffersRegistry, setNeedsPasswordSetup } from './registry';

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
  localStorage.setItem(DISMISSED_OFFERS_KEY, JSON.stringify([...dismissed]));
}

const TopNavAdContext = createContext<TopNavAdContextValue | null>(null);

interface TopNavAdProviderProps {
  children: ReactNode;
}

export function TopNavAdProvider({ children }: TopNavAdProviderProps) {
  const [dismissedOffers, setDismissedOffers] = useState<Set<string>>(() => getDismissedOffers());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const openPasswordSetupModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent('openPasswordSetupModal'));
  }, []);

  const offers = useMemo(() => 
    createOffersRegistry({
      onPasswordSetup: openPasswordSetupModal,
    }),
    [openPasswordSetupModal]
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
  }, [offers, isDismissed, refreshTrigger]);

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
