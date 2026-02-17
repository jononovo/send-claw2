export interface TenantPlanConfig {
  id: string;
  name: string;
  credits: number;
  bonus: number;
  price: number;
  description: string;
  features: string[];
  highlight: boolean;
  cta: string;
  comingSoon?: boolean;
}

export interface TenantPricingConfig {
  headline: string;
  subheadline: string;
  creditsLabel: string;
  creditsExplanation?: {
    title: string;
    subtitle: string;
    items: { value: string; label: string }[];
  };
  ctaSection?: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
  };
  plans: TenantPlanConfig[];
}

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
    mascot: string;
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
  
  pricing?: TenantPricingConfig;
}

const TENANT_IDS = ['5ducks', 'sendclaw'] as const;
const DEFAULT_TENANT_ID = '5ducks';

let tenantsCache: TenantConfig[] | null = null;
let loadingPromise: Promise<TenantConfig[]> | null = null;

async function loadTenantConfig(id: string): Promise<TenantConfig> {
  const response = await fetch(`/tenants/${id}/config.json`);
  if (!response.ok) {
    throw new Error(`Failed to load tenant config for ${id}`);
  }
  return response.json();
}

export async function loadAllTenants(): Promise<TenantConfig[]> {
  if (tenantsCache) {
    return tenantsCache;
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = Promise.all(TENANT_IDS.map(loadTenantConfig))
    .then(configs => {
      tenantsCache = configs;
      return configs;
    });
  
  return loadingPromise;
}

export function getTenantByDomain(hostname: string, tenants: TenantConfig[]): TenantConfig {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');
  
  for (const tenant of tenants) {
    for (const domain of tenant.domains) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      if (normalizedHost === normalizedDomain || normalizedHost.endsWith('.' + normalizedDomain)) {
        return tenant;
      }
    }
  }
  
  return tenants.find(t => t.id === DEFAULT_TENANT_ID) || tenants[0];
}

export function getTenantById(id: string, tenants: TenantConfig[]): TenantConfig | undefined {
  return tenants.find(t => t.id === id);
}

export function getAllTenants(): TenantConfig[] {
  return tenantsCache || [];
}

export async function detectCurrentTenant(): Promise<TenantConfig> {
  const tenants = await loadAllTenants();
  if (typeof window === 'undefined') {
    return tenants.find(t => t.id === DEFAULT_TENANT_ID) || tenants[0];
  }
  return getTenantByDomain(window.location.hostname, tenants);
}

export { DEFAULT_TENANT_ID, TENANT_IDS };
