import { PricingPromo } from "@shared/schema";

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

export const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free Trial',
    credits: 190,
    bonus: 0,
    price: 0,
    description: 'Perfect for testing the waters',
    features: [
      'AI-powered company search',
      'Contact discovery',
      'Email composition',
      'No credit card required',
    ],
    highlight: false,
    cta: 'Start Free',
  },
  {
    id: 'ugly-duckling',
    name: 'The Ugly Duckling',
    credits: 2000,
    bonus: 3000,
    price: 73.90,
    description: 'For serious prospectors',
    features: [
      'Everything in Free',
      '2,000 credits/month',
      '+3,000 bonus credits',
      'Priority email search',
      'Saved search lists',
    ],
    highlight: true,
    cta: 'Start Selling More',
    stripePriceId: process.env.STRIPE_DUCKLING_PRICE_ID,
  },
  {
    id: 'duckin-awesome',
    name: 'Mama Duck',
    credits: 5000,
    bonus: 10000,
    price: 177.90,
    description: 'For power users',
    features: [
      'Everything in Ugly Duckling',
      '5,000 credits/month',
      '+10,000 bonus credits',
      'Advanced analytics',
      'Priority support',
    ],
    highlight: false,
    cta: 'Join Waitlist',
    comingSoon: true,
    stripePriceId: process.env.STRIPE_MAMA_DUCK_PRICE_ID,
  },
  {
    id: 'the-flock',
    name: 'The Flock',
    credits: 15000,
    bonus: 0,
    price: 585,
    description: 'For teams and businesses',
    features: [
      'Everything in Mama Duck',
      '10 team seats',
      '15,000 credits/month',
      'Team collaboration',
      'Dedicated support',
    ],
    highlight: false,
    cta: 'Join Waitlist',
    comingSoon: true,
    stripePriceId: process.env.STRIPE_FLOCK_PRICE_ID,
  },
];

export function applyPromoToPlans(promo: PricingPromo, basePlans: PlanConfig[]): PlanConfig[] {
  const plans: PlanConfig[] = [];
  
  for (const plan of basePlans) {
    if (plan.id === 'free') {
      if (!promo.showFreeTrial) continue;
      plans.push({
        ...plan,
        credits: promo.freeTrialCredits ?? plan.credits,
      });
    } else if (plan.id === 'ugly-duckling') {
      if (!promo.showDuckling) continue;
      plans.push({
        ...plan,
        price: promo.ducklingPrice ?? plan.price,
        credits: promo.ducklingCredits ?? plan.credits,
        bonus: promo.ducklingBonus ?? plan.bonus,
        stripePriceId: promo.ducklingStripePriceId ?? plan.stripePriceId,
        features: [
          'Everything in Free',
          `${promo.ducklingCredits ?? plan.credits} credits/month`,
          `+${promo.ducklingBonus ?? plan.bonus} bonus credits`,
          'Priority email search',
          'Saved search lists',
        ],
      });
    } else if (plan.id === 'duckin-awesome') {
      if (!promo.showMamaDuck) continue;
      plans.push({
        ...plan,
        price: promo.mamaDuckPrice ?? plan.price,
        credits: promo.mamaDuckCredits ?? plan.credits,
        bonus: promo.mamaDuckBonus ?? plan.bonus,
        stripePriceId: promo.mamaDuckStripePriceId ?? plan.stripePriceId,
        features: [
          'Everything in Duckling',
          `${promo.mamaDuckCredits ?? plan.credits} credits/month`,
          `+${promo.mamaDuckBonus ?? plan.bonus} bonus credits`,
          'Advanced analytics',
          'Priority support',
        ],
      });
    }
  }
  
  return plans;
}
