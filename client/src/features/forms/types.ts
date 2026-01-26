import { ReactNode } from "react";

export type SlideType = 
  | "welcome" 
  | "section-intro" 
  | "single-select" 
  | "multi-select"
  | "text-input" 
  | "multi-field"
  | "section-complete" 
  | "final-complete";

export interface SlideOption {
  id: string;
  label: string;
  icon: ReactNode;
  description?: string;
}

export interface SkipLink {
  text: string;
  action: "skip";
}

export interface FormSlide<T extends Record<string, string> = Record<string, string>> {
  id: string;
  slideType: SlideType;
  title: string;
  subtitle?: string;
  emoji?: string;
  options?: SlideOption[];
  placeholder?: string;
  inputType?: "text" | "textarea" | "url";
  conditionalOn?: keyof T;
  conditionalValue?: string;
  component?: string;
  validate?: (data: T) => boolean;
  optional?: boolean;
  skipLink?: SkipLink;
}

export interface FormSectionTrigger {
  type: "auto" | "afterSection" | "manual";
  afterSectionId?: string;
}

export interface FormSection<T extends Record<string, string> = Record<string, string>> {
  id: string;
  name: string;
  emoji?: string;
  slides: FormSlide<T>[];
  completionCredits?: number;
  trigger?: FormSectionTrigger;
}

export interface FormTrigger {
  type: "route" | "userEvent" | "manual" | "firstVisit";
  route?: string;
  eventName?: string;
  requiresAuth?: boolean;
  once?: boolean;
}

export interface Form<T extends Record<string, string> = Record<string, string>> {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  trigger?: FormTrigger;
  sections: FormSection<T>[];
  initialData: T;
}

export interface FormState<T extends Record<string, string>> {
  currentStep: number;
  data: T;
  visibleSlides: FormSlide<T>[];
  totalSteps: number;
  progress: number;
  currentSlide: FormSlide<T> | null;
  currentSection: FormSection<T> | null;
}

export interface FormActions<T extends Record<string, string>> {
  setData: (key: keyof T, value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
  canContinue: () => boolean;
  getButtonText: () => string;
}

export interface FormFlowReturn<T extends Record<string, string>> 
  extends FormState<T>, FormActions<T> {}

export interface FormShellProps<T extends Record<string, string>> {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  flow: FormFlowReturn<T>;
  componentRegistry?: Record<string, React.ComponentType<SlideComponentProps<T>>>;
  onSkip?: () => void;
}

export interface SlideComponentProps<T extends Record<string, string>> {
  slide: FormSlide<T>;
  data: T;
  onSelect?: (slideId: string, optionId: string) => void;
  onTextInput?: (slideId: string, value: string) => void;
  onNext?: () => void;
}

export interface ScreenComponentProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  credits?: number;
}
