const TENANT_DOMAINS: Record<string, string[]> = {
  'sendclaw': ['sendclaw.com', 'sendclaw'],
  '5ducks': ['fiveducks.ai', 'fiveducks', '5ducks'],
};

const DEFAULT_TENANT = '5ducks';

export function getTenantFromHost(hostname: string): string {
  const normalizedHost = hostname.toLowerCase();
  
  for (const [tenantId, patterns] of Object.entries(TENANT_DOMAINS)) {
    for (const pattern of patterns) {
      if (normalizedHost.includes(pattern)) {
        return tenantId;
      }
    }
  }
  
  return DEFAULT_TENANT;
}

export function getTenantIds(): string[] {
  return Object.keys(TENANT_DOMAINS);
}

export { DEFAULT_TENANT, TENANT_DOMAINS };
