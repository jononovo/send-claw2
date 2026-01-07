export const ATTRIBUTION_EVENTS = [
  'access_code_requested',
  'secret_code_unlock', 
  'registration_complete',
  'app_page_view',
  'search_performed',
  'subscription_purchase'
] as const;

export type AttributionEventType = typeof ATTRIBUTION_EVENTS[number];

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  rdt_cid?: string;
  gclid?: string;
  li_fat_id?: string;
  first_seen?: string;
  landing_page?: string;
  referrer?: string;
}

export interface ConversionEvent {
  event: AttributionEventType;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AttributionPayload {
  source?: string;
  attributionData: AttributionData;
}

export interface ConversionEventPayload {
  event: AttributionEventType;
  metadata?: Record<string, any>;
}
