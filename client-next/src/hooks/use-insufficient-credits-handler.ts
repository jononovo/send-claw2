import { useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useInsufficientCredits } from '@/contexts/insufficient-credits-context';

export function useInsufficientCreditsHandler() {
  const { toast } = useToast();
  const { openModal } = useInsufficientCredits();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const openModalRef = useRef(openModal);

  // Keep the ref updated with the latest openModal function
  useEffect(() => {
    openModalRef.current = openModal;
  }, [openModal]);

  const triggerInsufficientCredits = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    toast({
      title: "You're out of credits",
      description: "Upgrade your plan to continue.",
      variant: "destructive",
    });

    timeoutRef.current = setTimeout(() => {
      openModalRef.current();
      timeoutRef.current = null;
    }, 1500);
  }, [toast]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { triggerInsufficientCredits, cleanup };
}

let globalTrigger: (() => void) | null = null;

export function setGlobalInsufficientCreditsTrigger(trigger: (() => void) | null) {
  globalTrigger = trigger;
}

export function triggerInsufficientCreditsGlobally() {
  if (globalTrigger) {
    globalTrigger();
  }
}
