import { useEffect, useRef } from 'react';
import { captureAttribution, getStoredAttribution, getAttributionSource, sendAttributionToServer } from '../services/attribution-tracker';
import type { AttributionData } from '../types';

export function useAttributionCapture() {
  const capturedRef = useRef(false);

  useEffect(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    captureAttribution();
  }, []);
}

export function useAttribution() {
  return {
    getAttribution: getStoredAttribution,
    getSource: getAttributionSource,
    sendToServer: sendAttributionToServer
  };
}
