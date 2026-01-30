import { useEffect } from 'react';
import { useInsufficientCreditsHandler, setGlobalInsufficientCreditsTrigger } from '@/hooks/use-insufficient-credits-handler';

export function InsufficientCreditsHandlerSetup() {
  const { triggerInsufficientCredits, cleanup } = useInsufficientCreditsHandler();

  useEffect(() => {
    setGlobalInsufficientCreditsTrigger(triggerInsufficientCredits);
    return () => {
      setGlobalInsufficientCreditsTrigger(null);
      cleanup();
    };
  }, [triggerInsufficientCredits, cleanup]);

  return null;
}
