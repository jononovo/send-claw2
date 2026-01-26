import { 
  FormShell, 
  useFormFlow,
  SlideCompanyDetails,
  onboardingQuestionnaire,
  type OnboardingQuestionnaireData,
  type SlideComponentProps
} from "@/features/forms";

interface StealthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const componentRegistry: Record<string, React.ComponentType<SlideComponentProps<OnboardingQuestionnaireData>>> = {
  "company-details": SlideCompanyDetails as React.ComponentType<SlideComponentProps<OnboardingQuestionnaireData>>,
};

export function StealthOnboardingModal({ isOpen, onClose, onComplete }: StealthOnboardingModalProps) {
  const flow = useFormFlow<OnboardingQuestionnaireData>(onboardingQuestionnaire, { persistToStorage: true });

  const handleSkip = () => {
    window.location.href = "/app";
  };

  return (
    <FormShell
      isOpen={isOpen}
      onClose={onClose}
      onComplete={onComplete}
      flow={flow}
      componentRegistry={componentRegistry}
      onSkip={handleSkip}
    />
  );
}
