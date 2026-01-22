export type OfferSource = 'registration' | 'onboarding' | 'campaign' | 'upgrade';

export interface Offer {
  id: string;
  source: OfferSource;
  priority: number;
  message: string;
  ctaLabel: string;
  onAction: () => void;
  isEligible: () => boolean;
  dismissible?: boolean;
}

export interface TopNavAdContextValue {
  activeOffer: Offer | null;
  dismissOffer: (offerId: string) => void;
  isDismissed: (offerId: string) => boolean;
}
