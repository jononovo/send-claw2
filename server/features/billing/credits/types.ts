export interface CreditTransaction {
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  timestamp: number;
  searchType?: string;
  success?: boolean;
}

export interface EasterEgg {
  id: number;
  trigger: string;
  reward: number;
  description: string;
  emoji?: string;
}

export interface UserCredits {
  currentBalance: number;
  lastTopUp: number;
  totalUsed: number;
  isBlocked: boolean;
  transactions: CreditTransaction[];
  monthlyAllowance: number;
  createdAt: number;
  updatedAt: number;
  easterEggs?: number[];  // [0, 1, 1] tracking array
  notifications?: number[];  // [0, 1, 1] temporary notification tracking array
  badges?: number[];  // [0, 1, 1] permanent badge tracking array
  // Stripe subscription fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  currentPlan?: 'ugly-duckling' | 'duckin-awesome';
  subscriptionStartDate?: number;
  subscriptionEndDate?: number;
}

export interface CreditDeductionResult {
  success: boolean;
  newBalance: number;
  isBlocked: boolean;
  transaction?: CreditTransaction;
  error?: string;
}

export type SearchType = 
  | 'company_search'
  | 'email_search'
  | 'company_and_contacts'
  | 'individual_email'
  | 'individual_search'
  | 'search_extension'
  | 'phone_reveal'
  | 'super_search';

export const CREDIT_COSTS: Record<SearchType, number> = {
  'company_search': 10,           // Only Companies search
  'email_search': 160,            // Full search: companies + contacts + emails
  'company_and_contacts': 70,     // Companies + Contacts search
  'individual_email': 20,         // Single contact email lookup
  'individual_search': 100,       // Find Individual search
  'search_extension': 110,        // Extend search with 5 more companies
  'phone_reveal': 8,              // Apollo mobile phone reveal
  'super_search': 250             // AI-powered Super Search
} as const;

export const MONTHLY_CREDIT_ALLOWANCE = 250;

// Re-export STRIPE_CONFIG from stripe module (single source of truth)
export { STRIPE_CONFIG } from '../stripe/types';

// Generic action type alias for non-search billable actions
// Use this when adding new billable features beyond search
export type ActionType = SearchType;

export interface NotificationConfig {
  id: number;
  type: 'welcome' | 'achievement' | 'feature_unlock' | 'milestone';
  trigger: string;
  title: string;
  description: string;
  badge?: string;
  emoji?: string;
  buttonText?: string;
}

export interface BadgeConfig {
  id: number;
  type: 'welcome' | 'achievement' | 'milestone' | 'special';
  trigger: string;
  title: string;
  description: string;
  badge: string;
  emoji?: string;
  buttonText?: string;
}

export const BADGES: BadgeConfig[] = [
  {
    id: 0,
    type: 'welcome',
    trigger: 'registration_complete',
    title: 'Congrats Hatchling Level Unlocked!',
    description: 'You have unlocked **Email Search**.\n\nRun a NEW search now to see complete results including emails of ~2 Key Contacts per company.',
    badge: 'Hatchling',
    emoji: '🦆',
    buttonText: 'Chirp'
  }
];

export const NOTIFICATIONS: NotificationConfig[] = [
  {
    id: 1,
    type: 'milestone',
    trigger: 'waitlist_joined',
    title: 'Added to Waitlist',
    description: 'You\'ll be notified when Duckin\' Awesome becomes available!',
    badge: 'Waitlist Member',
    emoji: '📋',
    buttonText: 'Got It'
  },
  {
    id: 2,
    type: 'feature_unlock',
    trigger: 'search_tooltip_shown',
    title: 'Search Tooltip',
    description: 'Search button tooltip has been shown',
    badge: 'Onboarding',
    emoji: '🔍',
    buttonText: 'Continue'
  },
  {
    id: 3,
    type: 'feature_unlock',
    trigger: 'email_tooltip_shown',
    title: 'Email Discovery Tooltip',
    description: 'Email discovery tooltip has been shown',
    badge: 'Onboarding',
    emoji: '📧',
    buttonText: 'Continue'
  },
  {
    id: 4,
    type: 'feature_unlock',
    trigger: 'start_selling_tooltip_shown',
    title: 'Start Selling Tooltip',
    description: 'Start selling tooltip has been shown',
    badge: 'Onboarding',
    emoji: '🚀',
    buttonText: 'Continue'
  }
];

export const EASTER_EGGS: EasterEgg[] = [
  { 
    id: 0, 
    trigger: "5ducks", 
    reward: 1000, 
    description: "Company mascot discovery", 
    emoji: "🦆" 
  },
  {
    id: 1,
    trigger: "free palestine",
    reward: 3000,
    description: "Solidarity bonus",
    emoji: "🇵🇸"
  },
  {
    id: 2,
    trigger: "he is risen",
    reward: 3000,
    description: "Easter blessing",
    emoji: "🐑"
  }
  // Future eggs easily added here
];