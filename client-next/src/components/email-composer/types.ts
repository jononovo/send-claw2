import type { StrategicProfile } from '@shared/schema';
import type { RecipientSelection } from '@/components/recipient-selection-modal';

export interface SenderProfile {
  id: number;
  userId: number;
  displayName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  companyPosition?: string;
  companyName?: string;
  companyWebsite?: string;
  isDefault: boolean;
  source?: 'registered' | 'gmail' | 'manual';
  gmailAccountEmail?: string;
}

export interface EmailGenerationControlsProps {
  selectedProduct: number | null;
  selectedProductData: StrategicProfile | null;
  onProductSelect: (product: StrategicProfile) => void;
  onProductClear: () => void;
  selectedTone: string;
  onToneSelect: (toneId: string) => void;
  selectedOfferStrategy: string;
  onOfferStrategySelect: (offerId: string) => void;
  selectedSenderProfile: number | null;
  onSenderProfileSelect: (profileId: number | null) => void;
  senderProfiles: SenderProfile[];
  products: StrategicProfile[];
  emailPrompt: string;
  originalEmailPrompt: string;
  onPromptChange: (value: string) => void;
  onPromptResize: () => void;
  promptTextareaRef: React.RefObject<HTMLTextAreaElement>;
  getDisplayValue: (currentValue: string, originalValue?: string) => string;
  onGenerate: () => void;
  isGenerating: boolean;
  drawerMode?: 'compose' | 'campaign';
  generationMode?: 'ai_unique' | 'merge_field';
  isExpanded?: boolean;
  isMobile?: boolean;
}

export interface ProductChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface GenerateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export interface TemplateManagerProps {
  templates: any[];
  templatesLoading: boolean;
  onTemplateSelect: (template: any) => void;
  onTemplateSave?: (template: any) => void;
  onTemplateUpdate?: (template: any) => void;
  onTemplateDelete?: (templateId: number) => void;
  onMergeFieldInsert: (field: string) => void;
  currentContent: string;
  currentSubject: string;
  emailPrompt: string;
  isEditMode?: boolean;
  isMergeViewMode?: boolean;
  onEditModeChange?: (editMode: boolean) => void;
  onMergeViewToggle: () => void;
  selectedContact: any;
  selectedCompany: any;
  user: any;
  editingTemplateId?: number | null;
  editingTemplate?: any | null;
}

export interface EmailFormProps {
  drawerMode: 'compose' | 'campaign';
  toEmail: string;
  emailSubject: string;
  originalEmailSubject: string;
  emailContent: string;
  originalEmailContent: string;
  onSubjectChange: (value: string) => void;
  onContentChange: (value: string) => void;
  gmailStatus: any;
  gmailUserInfo: any;
  isGmailButtonHovered: boolean;
  onGmailButtonHover: (hovered: boolean) => void;
  onGmailConnect: () => void;
  sendEmailMutation: any;
  isSent: boolean;
  selectedContact: any;
  selectedCompany: any;
  onSendEmail: () => void;
  onManualSend: () => void;
  campaignRecipients?: RecipientSelection | null;
  currentListId: number | null;
  currentQuery: string | null;
  onCreateCampaign: (type: 'scheduled' | 'immediate' | 'draft') => void;
  generationType: 'ai_unique' | 'merge_field';
  creatingCampaign: boolean;
  isMergeViewMode: boolean;
  getDisplayValue: (current: string, original: string) => string;
  isExpanded?: boolean;
  isMobile?: boolean;
}