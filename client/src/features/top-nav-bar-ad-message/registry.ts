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
    id: 'email-verification',
    source: 'registration',
    priority: 100,
    message: 'Check your inbox and verify your email to unlock 200 bonus credits',
    ctaLabel: 'Resend Email',
    onAction,
    isEligible: () => isLoggedIn && !emailVerified,
    dismissible: true,
  };
}

export function createOffersRegistry(handlers: {
  onResendVerification: () => void;
  isLoggedIn: boolean;
  emailVerified: boolean;
}): Offer[] {
  return [
    createEmailVerificationOffer(handlers.onResendVerification, handlers.isLoggedIn, handlers.emailVerified),
  ];
}
