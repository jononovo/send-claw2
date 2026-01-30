// Form-related types and interfaces

export interface FormData {
  productService: string;
  customerFeedback: string;
  website: string;
}

export type BusinessType = 'product' | 'service' | null;

export interface FormQuestion {
  title: string;
  subtitle: string;
  field: keyof FormData;
  type: 'textarea' | 'input';
  placeholder: string;
}

export interface FormWizardState {
  businessType: BusinessType;
  currentStep: number;
  formData: FormData;
  isValid: boolean;
}