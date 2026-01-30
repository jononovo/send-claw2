'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const useMetaPixel = () => {
  const pathname = usePathname();
  const prevLocationRef = useRef<string>(pathname);
  
  useEffect(() => {
    if (pathname !== prevLocationRef.current) {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'PageView');
      }
      prevLocationRef.current = pathname;
    }
  }, [pathname]);
};

export const trackMetaEvent = (
  eventName: string,
  parameters?: Record<string, unknown>
) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, parameters);
  }
};

export const trackMetaCustomEvent = (
  eventName: string,
  parameters?: Record<string, unknown>
) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, parameters);
  }
};
