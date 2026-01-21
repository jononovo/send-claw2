import { SimplifiedRegistrationModal } from "./simplified-registration-modal";
import { RegistrationModal } from "./registration-modal";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

// Toggle this to switch between registration modals
// true = simplified (email magic link), false = original (password-based)
const USE_SIMPLIFIED_REGISTRATION = true;

export function RegistrationModalContainer() {
  const { isOpen } = useRegistrationModal();
  
  if (!isOpen) {
    return null;
  }
  
  return USE_SIMPLIFIED_REGISTRATION 
    ? <SimplifiedRegistrationModal /> 
    : <RegistrationModal />;
}