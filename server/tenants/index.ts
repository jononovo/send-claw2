import fs from "fs";
import path from "path";

interface TenantConfig {
  id: string;
  domains: string[];
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
    return { id: config.id, domains: config.domains };
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

export function getTenantIds(): string[] {
  return loadTenantConfigs().map(t => t.id);
}

export { DEFAULT_TENANT };
