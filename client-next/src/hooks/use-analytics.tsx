'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '../lib/analytics';

export const useAnalytics = () => {
  const pathname = usePathname();
  const prevLocationRef = useRef<string>(pathname);
  
  useEffect(() => {
    if (pathname !== prevLocationRef.current) {
      trackPageView(pathname);
      prevLocationRef.current = pathname;
    }
  }, [pathname]);
};
