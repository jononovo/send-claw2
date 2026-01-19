// Main service exports
export { CreditService } from './credits/service';
export { TokenService } from './tokens/service';
export { StripeService } from './stripe/service';
export { GamificationService } from './gamification/service';

// Type exports from credits
export type { 
  CreditTransaction,
  UserCredits,
  CreditDeductionResult,
  SearchType
} from './credits/types';

export {
  CREDIT_COSTS,
  MONTHLY_CREDIT_ALLOWANCE,
  STRIPE_CONFIG
} from './credits/types';

// Type exports from tokens
export type {
  UserTokens,
  TokenValidationResult
} from './tokens/types';

// Type exports from stripe
export type {
  StripeCustomerData,
  CheckoutSessionData,
  SubscriptionStatus,
  WebhookEvent
} from './stripe/types';

// Type exports from gamification
export type {
  EasterEgg,
  EasterEggResult
} from './gamification/types';

export {
  EASTER_EGGS
} from './gamification/types';

// Route registration
export { registerBillingRoutes } from './routes';