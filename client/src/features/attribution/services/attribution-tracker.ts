import type { AttributionData, AttributionEventType, ConversionEventPayload } from '../types';
import { apiRequest } from '@/lib/queryClient';

const STORAGE_KEY = 'attribution_data';

function detectSource(data: AttributionData): string {
  if (data.rdt_cid || data.utm_source?.toLowerCase() === 'reddit') return 'reddit';
  if (data.gclid || data.utm_source?.toLowerCase() === 'google') return 'google';
  if (data.li_fat_id || data.utm_source?.toLowerCase() === 'linkedin') return 'linkedin';
  if (data.utm_source) return data.utm_source.toLowerCase();
  if (data.referrer) {
    const referrer = data.referrer.toLowerCase();
    if (referrer.includes('google')) return 'google';
    if (referrer.includes('reddit')) return 'reddit';
    if (referrer.includes('linkedin')) return 'linkedin';
    if (referrer.includes('facebook') || referrer.includes('fb.com')) return 'facebook';
    if (referrer.includes('twitter') || referrer.includes('x.com')) return 'twitter';
  }
  return 'organic';
}

export function captureAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null;

  const existing = getStoredAttribution();
  if (existing) {
    return existing;
  }

  const params = new URLSearchParams(window.location.search);
  
  const data: AttributionData = {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_content: params.get('utm_content') || undefined,
    utm_term: params.get('utm_term') || undefined,
    rdt_cid: params.get('rdt_cid') || undefined,
    gclid: params.get('gclid') || undefined,
    li_fat_id: params.get('li_fat_id') || undefined,
    first_seen: new Date().toISOString(),
    landing_page: window.location.pathname,
    referrer: document.referrer || undefined
  };

  const hasAnyData = Object.values(data).some(v => v !== undefined);
  if (!hasAnyData) {
    data.first_seen = new Date().toISOString();
    data.landing_page = window.location.pathname;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[Attribution] Failed to store attribution data:', e);
  }

  return data;
}

export function getStoredAttribution(): AttributionData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function getAttributionSource(): string {
  const data = getStoredAttribution();
  return data ? detectSource(data) : 'organic';
}

export async function sendAttributionToServer(userId?: number): Promise<void> {
  const data = getStoredAttribution();
  if (!data) return;

  const source = detectSource(data);
  
  try {
    await apiRequest('POST', '/api/attribution', {
      source,
      attributionData: data
    });
    console.debug('[Attribution] Attribution data sent to server');
  } catch (e) {
    console.warn('[Attribution] Failed to send attribution data:', e);
  }
}

export async function logConversionEvent(
  event: AttributionEventType,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await apiRequest('POST', '/api/attribution/event', { event, metadata });
    console.debug(`[Attribution] Conversion event logged: ${event}`);
  } catch (e) {
    console.warn(`[Attribution] Failed to log conversion event ${event}:`, e);
  }
}

export function clearStoredAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}
