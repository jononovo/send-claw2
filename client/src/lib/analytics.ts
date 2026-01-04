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