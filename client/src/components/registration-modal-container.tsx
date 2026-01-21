import { SimplifiedRegistrationModal } from "./simplified-registration-modal";
import { RegistrationModal } from "./registration-modal";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

// ========================================
// REGISTRATION MODAL CONFIGURATION
// Set ONE of these to true to use that modal
// ========================================
const USE_SIMPLIFIED_REGISTRATION = true;   // Magic link flow (email → name → magic link)
const USE_ORIGINAL_REGISTRATION = false;    // Password-based flow (email/password fields)

export function RegistrationModalContainer() {
  const { isOpen } = useRegistrationModal();
  
  if (!isOpen) {
    return null;
  }
  
  // Use simplified if its flag is true, otherwise use original
  if (USE_SIMPLIFIED_REGISTRATION) {
    return <SimplifiedRegistrationModal />;
  }
  
  return <RegistrationModal />;
}