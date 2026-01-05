// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// DEPRECATED: initGA is no longer needed
// GTM is now loaded in index.html with requestIdleCallback for optimal performance
// This function is kept for backwards compatibility but does nothing
export const initGA = () => {
  // GTM script loading is handled in index.html with deferred loading
  // Do not inject scripts here - it would cause duplicate loading
  console.debug('[Analytics] initGA called but GTM is already loaded via index.html');
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Google Ads Conversion Tracking
// These fire conversion events for Google Ads campaign optimization

export const trackConversion = {
  accessCodeRequested: () => {
    console.log('[Conversion] 🎯 Access Code Requested fired');
    if (typeof window === 'undefined' || !window.gtag) {
      console.warn('[Conversion] gtag not available');
      return;
    }
    window.gtag('event', 'conversion', {
      'send_to': 'AW-17847406917/2QUzCK-Dt90bEMWip75C',
      'value': 2.0,
      'currency': 'USD'
    });
  },
  
  secretCodeUnlock: () => {
    console.log('[Conversion] 🎯 Secret Code Unlock fired');
    if (typeof window === 'undefined' || !window.gtag) {
      console.warn('[Conversion] gtag not available');
      return;
    }
    window.gtag('event', 'conversion', {
      'send_to': 'AW-17847406917/DFXLCK2Lq90bEMWip75C',
      'value': 3.0,
      'currency': 'USD'
    });
  },
  
  registrationComplete: () => {
    console.log('[Conversion] 🎯 Registration Complete fired');
    if (typeof window === 'undefined' || !window.gtag) {
      console.warn('[Conversion] gtag not available');
      return;
    }
    window.gtag('event', 'conversion', {
      'send_to': 'AW-17847406917/Pv7KCMecq90bEMWip75C',
      'value': 3.0,
      'currency': 'USD'
    });
  },
  
  appPageView: () => {
    console.log('[Conversion] 🎯 App Page View fired');
    if (typeof window === 'undefined' || !window.gtag) {
      console.warn('[Conversion] gtag not available');
      return;
    }
    window.gtag('event', 'conversion', {
      'send_to': 'AW-17847406917/WkH_CNqpp90bEMWip75C',
      'value': 1.0,
      'currency': 'USD'
    });
  },
  
  searchPerformed: () => {
    console.log('[Conversion] 🎯 Search Performed fired');
    if (typeof window === 'undefined' || !window.gtag) {
      console.warn('[Conversion] gtag not available');
      return;
    }
    window.gtag('event', 'conversion', {
      'send_to': 'AW-17847406917/_rGeCOjvt90bEMWip75C',
      'value': 2.0,
      'currency': 'USD'
    });
  },
};