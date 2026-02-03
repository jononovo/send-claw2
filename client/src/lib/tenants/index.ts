import sendclawConfig from './sendclaw.json';
import fiveDucksConfig from './5ducks.json';

export interface TenantConfig {
  id: string;
  domains: string[];
  
  branding: {
    name: string;
    tagline: string;
    logo: string;
    logoEmoji: string;
    favicon: string;
    supportEmail: string;
  };
  
  meta: {
    title: string;
    description: string;
    ogImage: string;
    twitterImage: string;
    url: string;
  };
  
  theme: {
    primaryColor: string;
    primaryForeground: string;
    accentColor: string;
  };
  
  routes: {
    guestLanding: string;
    authLanding: string;
  };
  
  features: {
    showSendClaw: boolean;
    showProspecting: boolean;
    showCredits: boolean;
  };
}

const tenants: TenantConfig[] = [
  sendclawConfig as TenantConfig,
  fiveDucksConfig as TenantConfig,
];

const DEFAULT_TENANT_ID = 'sendclaw';

export function getTenantByDomain(hostname: string): TenantConfig {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');
  
  for (const tenant of tenants) {
    for (const domain of tenant.domains) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      if (normalizedHost === normalizedDomain || normalizedHost.endsWith('.' + normalizedDomain)) {
        return tenant;
      }
    }
  }
  
  // Default tenant for development/unknown domains
  return tenants.find(t => t.id === DEFAULT_TENANT_ID) || tenants[0];
}

export function getTenantById(id: string): TenantConfig | undefined {
  return tenants.find(t => t.id === id);
}

export function getAllTenants(): TenantConfig[] {
  return tenants;
}

export function detectCurrentTenant(): TenantConfig {
  if (typeof window === 'undefined') {
    return tenants.find(t => t.id === DEFAULT_TENANT_ID) || tenants[0];
  }
  return getTenantByDomain(window.location.hostname);
}
