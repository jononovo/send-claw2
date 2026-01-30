import type { Form } from "../types";
import { onboardingQuestionnaire, type OnboardingQuestionnaireData } from "./onboarding-questionnaire";

export const FORMS: Form<any>[] = [
  onboardingQuestionnaire,
];

export function getFormById<T extends Record<string, string> = Record<string, string>>(
  formId: string
): Form<T> | undefined {
  return FORMS.find((f) => f.id === formId) as Form<T> | undefined;
}

export function getAllForms(): Form<any>[] {
  return FORMS;
}

export { FORM_DEFAULTS, resolveDefault } from "../defaults";

export { 
  onboardingQuestionnaire,
  ONBOARDING_QUESTIONNAIRE_INITIAL_DATA,
  type OnboardingQuestionnaireData,
} from "./onboarding-questionnaire";
