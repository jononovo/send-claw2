import { useQuery } from "@tanstack/react-query";
import { ResolvedPricingConfig } from "./types";

export function usePricingConfig(promoCode?: string | null) {
  const queryParams = promoCode ? `?promo=${encodeURIComponent(promoCode)}` : '';
  
  return useQuery<ResolvedPricingConfig>({
    queryKey: ['/api/pricing/config', promoCode],
    queryFn: async () => {
      const res = await fetch(`/api/pricing/config${queryParams}`);
      if (!res.ok) throw new Error('Failed to fetch pricing config');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function getPromoCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const url = new URL(window.location.href);
  const promoParam = url.searchParams.get('promo');
  if (promoParam) return promoParam;
  
  const hash = window.location.hash.replace('#', '');
  if (hash) return hash;
  
  return null;
}
