import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { TenantConfig, detectCurrentTenant } from './tenants';

interface TenantContextValue {
  tenant: TenantConfig;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantConfig>(() => detectCurrentTenant());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const detectedTenant = detectCurrentTenant();
    setTenant(detectedTenant);
    
    // Apply theme CSS variables
    applyTenantTheme(detectedTenant);
    
    // Update document title
    document.title = detectedTenant.meta.title;
    
    // Update favicon
    updateFavicon(detectedTenant);
    
    // Update meta tags
    updateMetaTags(detectedTenant);
    
    setIsLoading(false);
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

function applyTenantTheme(tenant: TenantConfig) {
  const root = document.documentElement;
  
  // Apply theme colors as CSS variables
  root.style.setProperty('--primary', tenant.theme.primaryColor);
  root.style.setProperty('--primary-foreground', tenant.theme.primaryForeground);
  root.style.setProperty('--accent', tenant.theme.accentColor);
}

function updateFavicon(tenant: TenantConfig) {
  // Use emoji favicon for simplicity (works without actual favicon files)
  const emoji = tenant.branding.logoEmoji;
  const faviconUrl = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`;
  
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}

function updateMetaTags(tenant: TenantConfig) {
  // Update or create description
  let descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.name = 'description';
    document.head.appendChild(descMeta);
  }
  descMeta.content = tenant.meta.description;
  
  // Update or create OG tags
  const ogTags: Record<string, string> = {
    'og:title': tenant.meta.title,
    'og:description': tenant.meta.description,
    'og:image': tenant.meta.ogImage,
    'og:url': tenant.meta.url,
    'og:site_name': tenant.branding.name,
  };
  
  for (const [property, content] of Object.entries(ogTags)) {
    let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }
  
  // Update or create Twitter tags
  const twitterTags: Record<string, string> = {
    'twitter:title': tenant.meta.title,
    'twitter:description': tenant.meta.description,
    'twitter:image': tenant.meta.twitterImage,
  };
  
  for (const [name, content] of Object.entries(twitterTags)) {
    let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }
}
