export interface PlanConfig {
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
  stripePriceId?: string;
}

export interface ResolvedPricingConfig {
  promoCode: string | null;
  promoName: string | null;
  plans: PlanConfig[];
  isPromoActive: boolean;
}
