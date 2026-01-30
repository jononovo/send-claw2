import { SimplifiedRegistrationModal } from "./simplified-registration-modal";
import { MagicLinkRegistrationModal } from "./magic-link-registration-modal";
import { RegistrationModal } from "./registration-modal";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

// ========================================
// REGISTRATION MODAL CONFIGURATION
// Set ONE of these to true to use that modal
// ========================================
const USE_SIMPLIFIED_REGISTRATION = true;    // Password with gradual disclosure (email → name → password)
const USE_MAGIC_LINK_REGISTRATION = false;   // Magic link flow (email → name → sends password reset email)
const USE_ORIGINAL_REGISTRATION = false;     // Original password-based flow (all fields visible)

export function RegistrationModalContainer() {
  const { isOpen } = useRegistrationModal();
  
  if (!isOpen) {
    return null;
  }
  
  // Use simplified (password gradual disclosure) if its flag is true
  if (USE_SIMPLIFIED_REGISTRATION) {
    return <SimplifiedRegistrationModal />;
  }
  
  // Use magic link flow if its flag is true
  if (USE_MAGIC_LINK_REGISTRATION) {
    return <MagicLinkRegistrationModal />;
  }
  
  // Otherwise use original registration modal
  return <RegistrationModal />;
}
