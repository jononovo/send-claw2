// Define globals for GTM
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// All CONVERSION tracking is now handled via GTM (Google Tag Manager)
// Conversion events are pushed to dataLayer, and GTM fires the Google Ads conversion tags
// 
// Conversion events (pushed to dataLayer):
// - 'secret_code_unlock' - when user enters valid secret code
// - 'access_code_requested' - when user submits access code request form
// - 'registration_complete' - when user completes registration
// - 'search_performed' - when user performs a search
// 
// Page view conversions are handled automatically by GTM triggers on:
// - /app (App Page View conversion)
// - /subscription-success (Subscription Purchase conversion)
//
// General analytics events (trackEvent) still use gtag() for GA4 compatibility

// DEPRECATED: initGA is no longer needed - GTM is loaded via index.html
export const initGA = () => {
  console.debug('[Analytics] initGA is deprecated - GTM is loaded via index.html');
};

// DEPRECATED: trackPageView is handled automatically by GTM
export const trackPageView = (url: string) => {
  console.debug('[Analytics] trackPageView is deprecated - GTM handles page views automatically');
};

// General analytics events - uses gtag() for GA4 compatibility
// This is for non-conversion events like button clicks, video plays, etc.
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