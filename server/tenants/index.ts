import fs from "fs";
import path from "path";

interface TenantPlanConfig {
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

interface TenantPricingConfig {
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

interface TenantConfig {
  id: string;
  domains: string[];
  pricing?: TenantPricingConfig;
}

const TENANTS_DIR = path.join(process.cwd(), "client", "public", "tenants");
const TENANT_IDS = ['5ducks', 'sendclaw'] as const;
const DEFAULT_TENANT = '5ducks';

let tenantConfigs: TenantConfig[] | null = null;

function loadTenantConfigs(): TenantConfig[] {
  if (tenantConfigs) return tenantConfigs;

  tenantConfigs = TENANT_IDS.map(id => {
    const configPath = path.join(TENANTS_DIR, id, "config.json");
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    return { id: config.id, domains: config.domains, pricing: config.pricing };
  });

  return tenantConfigs;
}

export function getTenantFromHost(hostname: string): string {
  const configs = loadTenantConfigs();
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');

  for (const tenant of configs) {
    for (const domain of tenant.domains) {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      if (normalizedHost === normalizedDomain || normalizedHost.endsWith('.' + normalizedDomain)) {
        return tenant.id;
      }
    }
  }

  return DEFAULT_TENANT;
}

export function getTenantPricing(tenantId: string): TenantPricingConfig | undefined {
  const configs = loadTenantConfigs();
  const tenant = configs.find(t => t.id === tenantId);

  if (tenant?.pricing) {
    return tenant.pricing;
  }

  const defaultTenant = configs.find(t => t.id === DEFAULT_TENANT);
  return defaultTenant?.pricing;
}

export function getTenantPricingFromHost(hostname: string): TenantPricingConfig | undefined {
  const tenantId = getTenantFromHost(hostname);
  return getTenantPricing(tenantId);
}

export { DEFAULT_TENANT };
