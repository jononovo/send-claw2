import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

export const useMetaPixel = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'PageView');
      }
      prevLocationRef.current = location;
    }
  }, [location]);
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
