/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_META_PIXEL_ID: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  fbq: ((
    command: 'init',
    pixelId: string,
    userData?: Record<string, unknown>
  ) => void) & ((
    command: 'track' | 'trackCustom',
    eventName: string,
    parameters?: Record<string, unknown>
  ) => void);
  _fbq: typeof window.fbq;
  __META_PIXEL_ID__?: string;
  __metaPixelLoaded?: boolean;
}