/**
 * User Account Settings Feature Module
 * Public exports for the feature
 */

// Components
export { ProfileForm } from "./components/ProfileForm";

// Hooks
export { useProfile } from "./hooks/useProfile";
export { usePreferences, useEmailPreferences } from "./hooks/usePreferences";

// Services
export { userAccountApi } from "./services/api";

// Types
export type {
  UserProfile,
  ProfileFormData,
  SubscriptionStatus,
  UserPreferences,
  UserEmailPreferences,
  EmailPreference,
  CreditData
} from "./types";