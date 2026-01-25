import { Offer } from './types';

const NEEDS_PASSWORD_SETUP_KEY = 'needsPasswordSetup';

export function setNeedsPasswordSetup(value: boolean): void {
  if (value) {
    localStorage.setItem(NEEDS_PASSWORD_SETUP_KEY, 'true');
  } else {
    localStorage.removeItem(NEEDS_PASSWORD_SETUP_KEY);
  }
}

export function createEmailVerificationOffer(
  onAction: () => void,
  isLoggedIn: boolean,
  emailVerified: boolean
): Offer {
  return {
    id: 'email-verification-password-setup',
    source: 'registration',
    priority: 100,
    message: 'Verify your email to UNLOCK 200 Super Search Credits',
    ctaLabel: 'Complete Setup',
    onAction,
    isEligible: () => isLoggedIn && !emailVerified,
    dismissible: true,
  };
}

export function createOffersRegistry(handlers: {
  onPasswordSetup: () => void;
  isLoggedIn: boolean;
  emailVerified: boolean;
}): Offer[] {
  return [
    createEmailVerificationOffer(handlers.onPasswordSetup, handlers.isLoggedIn, handlers.emailVerified),
  ];
}
