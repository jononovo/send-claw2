import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mail, Type, Lock, ChevronDown, ChevronUp, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import QuickTemplates from "./quick-templates";
import { EmailSendButton } from "./email-fallback/EmailSendButton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contact, Company, StrategicProfile, EmailTemplate } from "@shared/schema";
import { useEmailGeneration } from "@/email-content-generation/useOutreachGeneration";
import { resolveFrontendSenderNames, createMergeFieldContext } from "@/email-content-generation/outreach-utils";
import { resolveAllMergeFields } from "@/lib/merge-field-resolver";
import { useAuth } from "@/hooks/use-auth";
import { TONE_OPTIONS, DEFAULT_TONE } from "@/lib/tone-options";
import { OFFER_OPTIONS, DEFAULT_OFFER } from "@/lib/offer-options";
import { RecipientSelectionModal, type RecipientSelection } from "@/components/recipient-selection-modal";
import { CampaignSettings, type CampaignSettingsData } from "@/components/campaign-settings";
import { CampaignSendButton } from "@/components/campaign-send-button/CampaignSendButton";
import { useEmailComposerPersistence } from "@/hooks/use-email-composer-persistence";
import { EmailGenerationTabs, getGenerationModeConfig } from "@/components/email-generation-tabs";
import { EmailGenerationControls } from "./email-composer/EmailGenerationControls";
import { TemplateManager } from "./email-composer/TemplateManager";
import EmailForm from "./email-composer/EmailForm";
import { MergeFieldControls } from "./merge-field-controls";
import MergeFieldDialog from "./merge-field-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Component prop types
interface EmailComposerProps {
  selectedContact: Contact | null;
  selectedCompany: Company | null;
  onContactChange?: (contact: Contact | null) => void;
  onCompanyChange?: (company: Company | null) => void;
  drawerMode?: 'compose' | 'campaign';
  currentListId?: number | null;
  currentQuery?: string | null;
  isExpanded?: boolean;
  isMobile?: boolean;
  // Email state props from parent
  emailPrompt?: string;
  setEmailPrompt?: (value: string) => void;
  emailSubject?: string;
  setEmailSubject?: (value: string) => void;
  emailContent?: string;
  setEmailContent?: (value: string) => void;
  toEmail?: string;
  setToEmail?: (value: string) => void;
  selectedTone?: string;
  setSelectedTone?: (value: string) => void;
  selectedOfferStrategy?: string;
  setSelectedOfferStrategy?: (value: string) => void;
  selectedProduct?: number | null;
  setSelectedProduct?: (value: number | null) => void;
  originalEmailPrompt?: string;
  setOriginalEmailPrompt?: (value: string) => void;
  originalEmailSubject?: string;
  setOriginalEmailSubject?: (value: string) => void;
  originalEmailContent?: string;
  setOriginalEmailContent?: (value: string) => void;
}


export function EmailComposer({
  selectedContact,
  selectedCompany,
  onContactChange,
  onCompanyChange,
  drawerMode = 'compose',
  currentListId = null,
  currentQuery = null,
  isExpanded = false,
  isMobile = false,
  // Email state props with fallback to internal state for backwards compatibility
  emailPrompt: emailPromptProp,
  setEmailPrompt: setEmailPromptProp,
  emailSubject: emailSubjectProp,
  setEmailSubject: setEmailSubjectProp,
  emailContent: emailContentProp,
  setEmailContent: setEmailContentProp,
  toEmail: toEmailProp,
  setToEmail: setToEmailProp,
  selectedTone: selectedToneProp,
  setSelectedTone: setSelectedToneProp,
  selectedOfferStrategy: selectedOfferStrategyProp,
  setSelectedOfferStrategy: setSelectedOfferStrategyProp,
  selectedProduct: selectedProductProp,
  setSelectedProduct: setSelectedProductProp,
  originalEmailPrompt: originalEmailPromptProp,
  setOriginalEmailPrompt: setOriginalEmailPromptProp,
  originalEmailSubject: originalEmailSubjectProp,
  setOriginalEmailSubject: setOriginalEmailSubjectProp,
  originalEmailContent: originalEmailContentProp,
  setOriginalEmailContent: setOriginalEmailContentProp
}: EmailComposerProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Use props if provided, otherwise use local state for backwards compatibility
  const [localEmailPrompt, setLocalEmailPrompt] = useState("");
  const [localOriginalEmailPrompt, setLocalOriginalEmailPrompt] = useState("");
  const [localToEmail, setLocalToEmail] = useState("");
  const [localEmailSubject, setLocalEmailSubject] = useState("");
  const [localOriginalEmailSubject, setLocalOriginalEmailSubject] = useState("");
  const [localEmailContent, setLocalEmailContent] = useState("");
  const [localOriginalEmailContent, setLocalOriginalEmailContent] = useState("");
  const [localSelectedProduct, setLocalSelectedProduct] = useState<number | null>(null);
  const [selectedProductData, setSelectedProductData] = useState<StrategicProfile | null>(null);
  const [localSelectedTone, setLocalSelectedTone] = useState<string>(DEFAULT_TONE);
  const [localSelectedOfferStrategy, setLocalSelectedOfferStrategy] = useState<string>(DEFAULT_OFFER);

  // Use props if provided, otherwise use local state
  const emailPrompt = emailPromptProp ?? localEmailPrompt;
  const setEmailPrompt = setEmailPromptProp ?? setLocalEmailPrompt;
  const originalEmailPrompt = originalEmailPromptProp ?? localOriginalEmailPrompt;
  const setOriginalEmailPrompt = setOriginalEmailPromptProp ?? setLocalOriginalEmailPrompt;
  const toEmail = toEmailProp ?? localToEmail;
  const setToEmail = setToEmailProp ?? setLocalToEmail;
  const emailSubject = emailSubjectProp ?? localEmailSubject;
  const setEmailSubject = setEmailSubjectProp ?? setLocalEmailSubject;
  const originalEmailSubject = originalEmailSubjectProp ?? localOriginalEmailSubject;
  const setOriginalEmailSubject = setOriginalEmailSubjectProp ?? setLocalOriginalEmailSubject;
  const emailContent = emailContentProp ?? localEmailContent;
  const setEmailContent = setEmailContentProp ?? setLocalEmailContent;
  const originalEmailContent = originalEmailContentProp ?? localOriginalEmailContent;
  const setOriginalEmailContent = setOriginalEmailContentProp ?? setLocalOriginalEmailContent;
  const selectedProduct = selectedProductProp ?? localSelectedProduct;
  const setSelectedProduct = setSelectedProductProp ?? setLocalSelectedProduct;
  const selectedTone = selectedToneProp ?? localSelectedTone;
  const setSelectedTone = setSelectedToneProp ?? setLocalSelectedTone;
  const selectedOfferStrategy = selectedOfferStrategyProp ?? localSelectedOfferStrategy;
  const setSelectedOfferStrategy = setSelectedOfferStrategyProp ?? setLocalSelectedOfferStrategy;
  // Removed isGenerating state - will come from the hook
  const [isSent, setIsSent] = useState(false);
  const [generateConfirmDialogOpen, setGenerateConfirmDialogOpen] = useState(false);
  const [productChangeDialogOpen, setProductChangeDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<StrategicProfile | null>(null);
  const [isMergeViewMode, setIsMergeViewMode] = useState(false);
  const [isGmailButtonHovered, setIsGmailButtonHovered] = useState(false);
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [campaignRecipients, setCampaignRecipients] = useState<RecipientSelection | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettingsData>({
    scheduleSend: false,
    autopilot: false,
    requiresHumanReview: true, // Default to human review enabled for backward compatibility
    trackEmails: true, // Default to on like in the screenshot
    unsubscribeLink: false,
  });
  // Generation mode state for campaign mode
  const [generationMode, setGenerationMode] = useState<'ai_unique' | 'merge_field'>('merge_field');
  
  // Dialog states for merge field controls
  const [mergeFieldDialogOpen, setMergeFieldDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  
  // Separate state for Template mode (merge_field)
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateOriginalSubject, setTemplateOriginalSubject] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [templateOriginalContent, setTemplateOriginalContent] = useState("");
  
  // Separate state for AI mode (ai_unique)
  const [aiSubject, setAiSubject] = useState("");
  const [aiOriginalSubject, setAiOriginalSubject] = useState("");
  const [aiContent, setAiContent] = useState("");
  const [aiOriginalContent, setAiOriginalContent] = useState("");

  // Refs
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const toEmailRef = useRef<HTMLInputElement>(null);
  
  // Sender profile state for dynamic merge fields
  const [senderProfile, setSenderProfile] = useState<any>(null);
  const [selectedSenderProfileId, setSelectedSenderProfileId] = useState<number | null>(null);
  
  // Fetch sender profiles using React Query for proper cache invalidation
  const { data: senderProfiles = [] } = useQuery({
    queryKey: ['/api/sender-profiles'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/sender-profiles');
      if (!response.ok) throw new Error('Failed to fetch sender profiles');
      return response.json();
    },
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Initialize persistence hook with memoized state to prevent unnecessary re-renders
  const composerState = useMemo(() => ({
    isOpen: true, // This is handled by the parent, but we track it for consistency
    drawerMode,
    emailPrompt,
    emailSubject,
    emailContent,
    toEmail,
    templateSubject,
    templateContent,
    aiSubject,
    aiContent,
    selectedProduct,
    selectedTone,
    selectedOfferStrategy,
    selectedSenderProfileId,
    generationMode,
    campaignSettings,
    campaignRecipients
  }), [
    drawerMode,
    emailPrompt,
    emailSubject,
    emailContent,
    toEmail,
    templateSubject,
    templateContent,
    aiSubject,
    aiContent,
    selectedProduct,
    selectedTone,
    selectedOfferStrategy,
    selectedSenderProfileId,
    generationMode,
    campaignSettings,
    campaignRecipients
  ]);
  
  // Queries - moved here to be available for restoration logic
  const { data: products = [] } = useQuery<StrategicProfile[]>({
    queryKey: ['/api/strategic-profiles']
  });
  
  const { restoreState, clearState } = useEmailComposerPersistence(composerState);
  
  // Restore persisted state on mount
  useEffect(() => {
    const savedState = restoreState();
    if (savedState) {
      // Restore all saved state
      if (savedState.emailPrompt !== undefined) {
        setEmailPrompt(savedState.emailPrompt);
        setOriginalEmailPrompt(savedState.emailPrompt);
      }
      if (savedState.emailSubject !== undefined) setEmailSubject(savedState.emailSubject);
      if (savedState.emailContent !== undefined) setEmailContent(savedState.emailContent);
      if (savedState.toEmail !== undefined) setToEmail(savedState.toEmail);
      
      // Restore template mode fields
      if (savedState.templateSubject !== undefined) setTemplateSubject(savedState.templateSubject);
      if (savedState.templateContent !== undefined) setTemplateContent(savedState.templateContent);
      
      // Restore AI mode fields
      if (savedState.aiSubject !== undefined) setAiSubject(savedState.aiSubject);
      if (savedState.aiContent !== undefined) setAiContent(savedState.aiContent);
      
      // Restore settings
      if (savedState.selectedProduct !== undefined) {
        setSelectedProduct(savedState.selectedProduct);
        // Also set the product data if we have products loaded
        if (products && products.length > 0) {
          const product = products.find(p => p.id === savedState.selectedProduct);
          if (product) {
            setSelectedProductData(product);
          }
        }
      }
      if (savedState.selectedTone !== undefined) setSelectedTone(savedState.selectedTone);
      if (savedState.selectedOfferStrategy !== undefined) setSelectedOfferStrategy(savedState.selectedOfferStrategy);
      if (savedState.selectedSenderProfileId !== undefined) setSelectedSenderProfileId(savedState.selectedSenderProfileId);
      if (savedState.generationMode !== undefined) setGenerationMode(savedState.generationMode);
      if (savedState.campaignSettings !== undefined) setCampaignSettings(savedState.campaignSettings);
      if (savedState.campaignRecipients !== undefined) setCampaignRecipients(savedState.campaignRecipients);
      
      console.log('Restored email composer state from localStorage');
    }
  }, []); // Run only once on mount
  
  // Sync selectedProductData when products are loaded or selectedProduct changes
  useEffect(() => {
    if (selectedProduct && products && products.length > 0 && !selectedProductData) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        setSelectedProductData(product);
        console.log('Synced product data from saved product ID:', product);
      }
    }
  }, [products, selectedProduct]); // Run when products are loaded or selectedProduct changes
  
  // Clear state when email is sent successfully
  const handleSuccessfulSend = () => {
    clearState();
    setIsSent(true);
    // Reset form fields
    setEmailPrompt('');
    setEmailSubject('');
    setEmailContent('');
    setToEmail('');
    setTemplateSubject('');
    setTemplateContent('');
    setAiSubject('');
    setAiContent('');
  };
  
  // Helper functions to get/set the correct state based on generation mode
  const getCurrentSubject = () => {
    if (drawerMode === 'campaign') {
      // For merge_field mode, always return the original template with raw merge fields
      // This ensures campaigns are saved with placeholders, not resolved preview values
      if (generationMode === 'merge_field') {
        return templateOriginalSubject || templateSubject;
      }
      return aiSubject;
    }
    return emailSubject; // Use shared state for compose mode
  };
  
  const getCurrentOriginalSubject = () => {
    if (drawerMode === 'campaign') {
      return generationMode === 'merge_field' ? templateOriginalSubject : aiOriginalSubject;
    }
    return originalEmailSubject;
  };
  
  const getCurrentContent = () => {
    if (drawerMode === 'campaign') {
      // For merge_field mode, always return the original template with raw merge fields
      // This ensures campaigns are saved with placeholders, not resolved preview values
      if (generationMode === 'merge_field') {
        return templateOriginalContent || templateContent;
      }
      return aiContent;
    }
    return emailContent;
  };
  
  const getCurrentOriginalContent = () => {
    if (drawerMode === 'campaign') {
      return generationMode === 'merge_field' ? templateOriginalContent : aiOriginalContent;
    }
    return originalEmailContent;
  };
  
  const setCurrentSubject = (value: string) => {
    if (drawerMode === 'campaign') {
      if (generationMode === 'merge_field') {
        setTemplateSubject(value);
      } else {
        setAiSubject(value);
      }
    } else {
      setEmailSubject(value);
    }
  };
  
  const setCurrentOriginalSubject = (value: string) => {
    if (drawerMode === 'campaign') {
      if (generationMode === 'merge_field') {
        setTemplateOriginalSubject(value);
      } else {
        setAiOriginalSubject(value);
      }
    } else {
      setOriginalEmailSubject(value);
    }
  };
  
  const setCurrentContent = (value: string) => {
    if (drawerMode === 'campaign') {
      if (generationMode === 'merge_field') {
        setTemplateContent(value);
      } else {
        setAiContent(value);
      }
    } else {
      setEmailContent(value);
    }
  };
  
  const setCurrentOriginalContent = (value: string) => {
    if (drawerMode === 'campaign') {
      if (generationMode === 'merge_field') {
        setTemplateOriginalContent(value);
      } else {
        setAiOriginalContent(value);
      }
    } else {
      setOriginalEmailContent(value);
    }
  };

  // Create merge field context for resolving merge fields
  const senderNames = resolveFrontendSenderNames(user);
  const mergeFieldContext = createMergeFieldContext(
    selectedContact,
    selectedCompany,
    senderNames.fullName,
    senderNames.firstName,
    senderProfile?.companyName || undefined // Pass sender company name if available
  );

  // Create product context from selected product data (extract only the 4 key fields)
  const productContext = selectedProductData ? {
    productService: selectedProductData.productService || undefined,
    customerFeedback: selectedProductData.customerFeedback || undefined,
    website: selectedProductData.website || undefined,
    reportSalesContextGuidance: selectedProductData.reportSalesContextGuidance || undefined
  } : undefined;

  // Build sender profile payload for email generation
  const senderProfilePayload = senderProfile ? {
    displayName: senderProfile.displayName || '',
    email: senderProfile.email || '',
    firstName: senderProfile.firstName || undefined,
    lastName: senderProfile.lastName || undefined,
    title: senderProfile.title || undefined,
    companyPosition: senderProfile.companyPosition || undefined,
    companyName: senderProfile.companyName || undefined,
    companyWebsite: senderProfile.companyWebsite || undefined
  } : undefined;

  // Extract target audience query from campaign recipients for AI context
  const targetAudienceQuery = 
    campaignRecipients?.type === 'current' ? campaignRecipients.query :
    campaignRecipients?.type === 'multiple' ? campaignRecipients.targetAudienceQuery :
    undefined;

  // Email generation hook
  const { generateEmail: performGeneration, isGenerating } = useEmailGeneration({
    selectedContact,
    selectedCompany,
    emailPrompt,
    emailSubject: getCurrentSubject(),
    emailContent: getCurrentContent(),
    toEmail,
    tone: selectedTone,
    offerStrategy: selectedOfferStrategy,
    generateTemplate: drawerMode === 'campaign' && generationMode === 'merge_field', // Only generate template in campaign mode with merge_field
    mergeFieldContext, // Pass context for dynamic prompt building
    productContext, // Pass rich product context for AI
    senderProfile: senderProfilePayload, // Pass sender identity for personalization
    targetAudienceQuery, // Pass target audience context for AI
    setEmailSubject: setCurrentSubject,
    setOriginalEmailSubject: setCurrentOriginalSubject,
    setToEmail,
    setEmailContent: setCurrentContent,
    setOriginalEmailContent: setCurrentOriginalContent
  });

  // Queries
  // (products query moved earlier for restoration logic)
  
  // Fetch templates at the EmailComposer level to avoid multiple fetches
  const { data: templates = [], isLoading: templatesLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Retry once on failure
    refetchOnMount: false, // Use cached data when available
  });

  const { data: gmailStatus } = useQuery<{authorized: boolean}>({
    queryKey: ['/api/gmail/auth-status'],
    refetchInterval: 5000
  });

  const { data: gmailUserInfo } = useQuery<{email: string}>({
    queryKey: ['/api/gmail/user'],
    enabled: !!(gmailStatus as any)?.authorized
  });

  // Mutations
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      const res = await apiRequest("POST", '/api/send-gmail', data);
      return await res.json();
    },
    onSuccess: () => {
      handleSuccessfulSend();
      toast({
        title: "Email sent successfully!",
        description: "Your email has been sent via Gmail."
      });
      setTimeout(() => setIsSent(false), 3000);
    },
    onError: (error: any) => {
      console.error('Send email error:', error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again or send manually.",
        variant: "destructive"
      });
    }
  });


  // Campaign creation mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (type: 'scheduled' | 'immediate' | 'draft') => {
      // Use campaignRecipients if set, otherwise auto-create from current search
      let recipientsToUse = campaignRecipients;
      
      if (!recipientsToUse && currentListId && currentQuery) {
        recipientsToUse = {
          type: 'current' as const,
          listId: currentListId,
          query: currentQuery
        };
      }
      
      if (!recipientsToUse) {
        console.error('No recipients available:', {
          campaignRecipients,
          currentListId,
          currentQuery,
          drawerMode
        });
        throw new Error('No recipients available. Please run a search first or select recipients for your campaign');
      }

      let contactListId: number;
      
      // Create or use existing contact list based on recipient selection
      if (recipientsToUse.type === 'existing') {
        // Use the existing contact list
        contactListId = recipientsToUse.contactListId;
      } else {
        // Create new contact list from search results
        const listData: any = {};
        
        if (recipientsToUse.type === 'current') {
          listData.currentListId = recipientsToUse.listId;
          listData.currentQuery = recipientsToUse.query;
        } else if (recipientsToUse.type === 'multiple') {
          listData.searchListIds = recipientsToUse.searchListIds;
        }
        
        const contactListRes = await apiRequest("POST", '/api/contact-lists/from-search', listData);
        const contactList = await contactListRes.json();
        contactListId = contactList.id;
      }
      
      // Determine the campaign status based on type
      const status = type === 'scheduled' ? 'scheduled' : (type === 'immediate' ? 'active' : 'draft');
      
      // Create the campaign with all settings
      const campaignData: any = {
        // Basic campaign details
        name: getCurrentSubject() || 'Untitled Campaign',
        subject: getCurrentSubject(),
        body: getCurrentContent(),
        prompt: emailPrompt,
        contactListId: contactListId,
        status: status,
        
        // Email generation settings
        tone: selectedTone,
        offerType: selectedOfferStrategy,
        generationType: generationMode, // Track which generation mode was used
        
        // Set start_date based on campaign type with smart business hours scheduling
        start_date: type === 'immediate' 
          ? new Date().toISOString() // Immediate campaigns start right away
          : (campaignSettings.scheduleSend && campaignSettings.scheduleDate 
              ? new Date(campaignSettings.scheduleDate).toISOString() // Use user-selected schedule
              : getNextBusinessHourStart().toISOString()), // Smart scheduling for business hours
        
        // Scheduling settings
        sendTimePreference: type,
        scheduleDate: campaignSettings.scheduleSend && campaignSettings.scheduleDate ? campaignSettings.scheduleDate : undefined,
        scheduleTime: campaignSettings.scheduleSend && campaignSettings.scheduleTime ? campaignSettings.scheduleTime : undefined,
        timezone: 'America/New_York', // Default timezone, could be made configurable
        
        // Autopilot settings
        autopilotEnabled: campaignSettings.autopilot,
        autopilotSettings: campaignSettings.autopilotSettings,
        maxEmailsPerDay: campaignSettings.autopilotSettings?.maxEmailsPerDay || 20,
        delayBetweenEmails: campaignSettings.autopilotSettings?.delayBetweenEmails || 30,
        
        // Tracking settings
        trackEmails: campaignSettings.trackEmails,
        unsubscribeLink: campaignSettings.unsubscribeLink,
        
        // Human review setting - critical for auto-send functionality
        requiresHumanReview: campaignSettings.requiresHumanReview,
        
        // Sender profile - links campaign to specific sender identity
        senderProfileId: selectedSenderProfileId
      };
      
      // Only include productId and strategicProfileId if they have valid values
      if (selectedProduct) {
        campaignData.productId = selectedProduct;
        campaignData.strategicProfileId = selectedProduct; // Use the same product ID for strategic profile
      }
      
      const campaignRes = await apiRequest("POST", '/api/campaigns', campaignData);
      
      return await campaignRes.json();
    },
    onSuccess: (campaign, variables) => {
      const campaignType = variables;
      
      let title = "Campaign Created!";
      let description = `Your campaign "${campaign.name}" has been created successfully.`;
      
      if (campaignType === 'immediate') {
        title = "Campaign Started!";
        description = `Your campaign "${campaign.name}" has started and emails are being sent.`;
      } else if (campaignType === 'draft') {
        title = "Campaign Saved as Draft!";
        description = `Your campaign "${campaign.name}" has been saved as a draft for later.`;
      } else if (campaignType === 'scheduled') {
        title = "Campaign Scheduled!";
        description = `Your campaign "${campaign.name}" has been scheduled and will start at the configured time.`;
      }
      
      toast({ title, description });
      
      // Clear all state after successful campaign creation
      clearState();
      setEmailPrompt('');
      setEmailSubject('');
      setEmailContent('');
      setTemplateSubject('');
      setTemplateContent('');
      setAiSubject('');
      setAiContent('');
      setCampaignRecipients(null);
      
      // Invalidate campaign list query
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error) => {
      toast({
        title: "Campaign Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create campaign',
        variant: "destructive"
      });
    }
  });

  // Effects
  // Set default sender profile when profiles are loaded
  useEffect(() => {
    if (senderProfiles.length > 0 && !selectedSenderProfileId) {
      // Set the default profile as selected
      const defaultProfile = senderProfiles.find((p: any) => p.isDefault) || senderProfiles[0];
      if (defaultProfile) {
        setSenderProfile(defaultProfile);
        setSelectedSenderProfileId(defaultProfile.id);
      }
    }
  }, [senderProfiles]); // Run when sender profiles are loaded or changed
  
  useEffect(() => {
    console.log('EmailComposer useEffect - campaign recipients check:', {
      drawerMode,
      currentListId,
      currentQuery,
      hasCampaignRecipients: !!campaignRecipients,
      selectedContactEmail: selectedContact?.email
    });
    
    if (drawerMode === 'compose' && selectedContact?.email) {
      setToEmail(selectedContact.email);
    } else if (drawerMode === 'campaign' && currentListId && currentQuery && !campaignRecipients) {
      // Auto-set current list as default recipients in campaign mode
      console.log('Auto-setting campaign recipients with current search:', {
        type: 'current',
        listId: currentListId,
        query: currentQuery
      });
      setCampaignRecipients({ 
        type: 'current', 
        listId: currentListId, 
        query: currentQuery 
      });
    } else if (drawerMode === 'campaign' && (!currentListId || !currentQuery)) {
      console.warn('Cannot auto-set recipients - missing search data:', {
        currentListId,
        currentQuery
      });
    }
  }, [selectedContact, drawerMode, currentListId, currentQuery]);

  useEffect(() => {
    handlePromptTextareaResize();
  }, [emailPrompt]);

  // Handlers

  const handlePromptTextareaResize = () => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = 'auto';
      const scrollHeight = promptTextareaRef.current.scrollHeight;
      const maxHeight = 120;
      const minHeight = 32;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      promptTextareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const getDisplayValue = (currentValue: string, originalValue?: string) => {
    // In merge view mode, show the raw template with merge fields
    if (isMergeViewMode) return originalValue || currentValue;
    
    // Default: resolve merge fields to show actual values
    return resolveAllMergeFields(originalValue || currentValue, mergeFieldContext);
  };

  const handleSelectProduct = (product: StrategicProfile) => {
    // If there's custom prompt text and we're switching products, confirm the change
    if (emailPrompt && selectedProductData && product.id !== selectedProductData.id) {
      setPendingProduct(product);
      setProductChangeDialogOpen(true);
    } else {
      applyProductChange(product);
    }
  };

  const handleSelectNone = () => {
    // If there's custom prompt text, confirm clearing the product
    if (emailPrompt && selectedProductData) {
      setPendingProduct(null);
      setProductChangeDialogOpen(true);
    } else {
      setSelectedProduct(null);
      setSelectedProductData(null);
      setEmailPrompt("");
      setOriginalEmailPrompt("");
    }
  };

  const applyProductChange = (product: StrategicProfile | null) => {
    if (product) {
      setSelectedProduct(product.id);
      setSelectedProductData(product);
      // Don't paste product text into prompt anymore - keep prompt for custom instructions
      // The product context will be sent separately during generation
    } else {
      setSelectedProduct(null);
      setSelectedProductData(null);
      // Clear prompt when removing product
      setEmailPrompt("");
      setOriginalEmailPrompt("");
    }
  };

  const handleConfirmProductChange = () => {
    applyProductChange(pendingProduct);
    setProductChangeDialogOpen(false);
    setPendingProduct(null);
  };

  const handleCancelProductChange = () => {
    setProductChangeDialogOpen(false);
    setPendingProduct(null);
  };

  const handleGenerateEmail = () => {
    // Check if either a product is selected OR prompt is provided
    if (!selectedProductData && (!emailPrompt || emailPrompt.trim() === '')) {
      toast({
        title: "No Context Provided",
        description: "Please select a product or provide details about your offering.",
        variant: "destructive",
      });
      return;
    }

    if (emailContent || emailSubject) {
      setGenerateConfirmDialogOpen(true);
    } else {
      performGeneration();
    }
  };

  const handleConfirmGenerate = () => {
    setGenerateConfirmDialogOpen(false);
    performGeneration();
  };

  const handleSendEmail = () => {
    if (!toEmail || !emailSubject || !emailContent) {
      toast({
        title: "Missing fields",
        description: "Please fill in all email fields.",
        variant: "destructive"
      });
      return;
    }
    sendEmailMutation.mutate({
      to: toEmail,
      subject: emailSubject,
      body: emailContent
    });
  };

  const handleManualSend = () => {
    // The EmailSendButton already handles opening the email client with the proper formatting.
    // This callback is now only used for tracking/confirmation purposes.
    // The duplicate mailto link creation has been removed to fix the double email window issue.
    console.log('Email opened in default client');
  };

  const handleGmailConnect = () => {
    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to connect Gmail.",
        variant: "destructive"
      });
      return;
    }
    window.open(`/api/gmail/auth?userId=${user.id}`, '_blank');
  };


  const handleMergeFieldInsert = (field: string) => {
    // Since the textarea is now in EmailForm component, we append the field to the end
    const currentContent = getCurrentContent();
    const newText = currentContent + field;
    setCurrentContent(newText);
    setCurrentOriginalContent(newText);
  };


  const toggleMergeView = () => {
    setIsMergeViewMode(!isMergeViewMode);
  };

  const handleSaveAsTemplate = () => {
    setTemplateName("");
    setSaveTemplateDialogOpen(true);
  };

  const handleConfirmSaveTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      await apiRequest("POST", '/api/email-templates', {
        name: templateName,
        subject: getCurrentSubject(),
        content: getCurrentContent(),
        description: emailPrompt
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({ title: "Template saved successfully!" });
      setSaveTemplateDialogOpen(false);
      setTemplateName("");
    } catch (error) {
      console.error('Save template error:', error);
      toast({
        title: "Failed to save template",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRecipientSelect = (selection: RecipientSelection) => {
    setCampaignRecipients(selection);
    setRecipientModalOpen(false);
  };

  const getRecipientDisplayText = () => {
    if (!campaignRecipients) {
      return "Select recipients";
    }
    
    if (campaignRecipients.type === 'current') {
      return campaignRecipients.query;
    } else if (campaignRecipients.type === 'multiple') {
      return `${campaignRecipients.searchListIds.length} search lists selected`;
    } else if (campaignRecipients.type === 'existing') {
      return campaignRecipients.contactListName;
    }
    
    return "Select recipients";
  };

  // Helper function for smart business hour scheduling
  const getNextBusinessHourStart = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // If it's a weekend, schedule for Monday 9 AM
    if (day === 0 || day === 6) {
      const monday = new Date(now);
      monday.setDate(now.getDate() + ((8 - day) % 7)); // Move to next Monday
      monday.setHours(9, 0, 0, 0);
      return monday;
    }
    
    // If before business hours (before 9 AM), schedule for 9 AM today
    if (hour < 9) {
      const today9am = new Date(now);
      today9am.setHours(9, 0, 0, 0);
      return today9am;
    }
    
    // If after business hours (5 PM or later), schedule for 9 AM next business day
    if (hour >= 17) {
      const nextDay = new Date(now);
      // If Friday, jump to Monday
      if (day === 5) {
        nextDay.setDate(now.getDate() + 3);
      } else {
        nextDay.setDate(now.getDate() + 1);
      }
      nextDay.setHours(9, 0, 0, 0);
      return nextDay;
    }
    
    // During business hours (9 AM - 4:59 PM), round up to next hour
    const nextHour = new Date(now);
    nextHour.setHours(hour + 1, 0, 0, 0);
    
    // But if rounding up would go past 5 PM, schedule for next business day 9 AM
    if (nextHour.getHours() >= 17) {
      const nextDay = new Date(now);
      // If Friday, jump to Monday
      if (day === 5) {
        nextDay.setDate(now.getDate() + 3);
      } else {
        nextDay.setDate(now.getDate() + 1);
      }
      nextDay.setHours(9, 0, 0, 0);
      return nextDay;
    }
    
    return nextHour;
  };

  const handleCreateCampaign = (type: 'scheduled' | 'immediate' | 'draft' = 'scheduled') => {
    // Validate requirements first
    if (!currentListId && !campaignRecipients) {
      toast({
        title: "No Recipients Available",
        description: "Please run a search first or select recipients for your campaign",
        variant: "destructive"
      });
      return;
    }

    if (!getCurrentContent()) {
      toast({
        title: "No Email Content",
        description: "Please add email content for your campaign",
        variant: "destructive"
      });
      return;
    }

    // Auto-set recipients if not already set
    if (!campaignRecipients && currentListId && currentQuery) {
      const autoRecipients: RecipientSelection = {
        type: 'current',
        listId: currentListId,
        query: currentQuery
      };
      setCampaignRecipients(autoRecipients);
    }

    // Update settings based on type
    setCampaignSettings(prev => ({
      ...prev,
      scheduleSend: type === 'scheduled'
    }));

    // Launch the campaign
    createCampaignMutation.mutate(type);
  };

  return (
    <div className={isMobile ? "flex flex-col h-full overflow-y-auto" : (drawerMode === 'campaign' ? "space-y-0" : "space-y-0 md:space-y-4")}>
      {/* Tabs and Prompt grouped together in campaign mode */}
      <div className={drawerMode === 'campaign' ? "relative" : ""}>
        {/* Generation Mode Tabs - Only shown in campaign mode */}
        {drawerMode === 'campaign' && (
          <div className="relative z-20">
            <EmailGenerationTabs
              selectedMode={generationMode}
              onModeChange={setGenerationMode}
              className=""
            />
          </div>
        )}
        
        {/* Email Prompt Field with Generation Controls */}
        <EmailGenerationControls
          selectedProduct={selectedProduct}
          selectedProductData={selectedProductData}
          onProductSelect={handleSelectProduct}
          onProductClear={handleSelectNone}
          selectedTone={selectedTone}
          onToneSelect={setSelectedTone}
          selectedOfferStrategy={selectedOfferStrategy}
          onOfferStrategySelect={setSelectedOfferStrategy}
          products={products}
          emailPrompt={emailPrompt}
          originalEmailPrompt={originalEmailPrompt}
          onPromptChange={(value) => {
            setEmailPrompt(value);
            setOriginalEmailPrompt(value);
          }}
          onPromptResize={handlePromptTextareaResize}
          promptTextareaRef={promptTextareaRef}
          getDisplayValue={getDisplayValue}
          onGenerate={handleGenerateEmail}
          isGenerating={isGenerating}
          drawerMode={drawerMode}
          generationMode={generationMode}
          selectedSenderProfile={selectedSenderProfileId}
          onSenderProfileSelect={(profileId) => {
            setSelectedSenderProfileId(profileId);
            const profile = senderProfiles.find((p: any) => p.id === profileId);
            if (profile) {
              setSenderProfile(profile);
            }
          }}
          senderProfiles={senderProfiles}
          isExpanded={isExpanded}
          isMobile={isMobile}
        />
    </div>

    {/* To Email Field / Campaign Recipients */}
    <div className="relative border-b md:border-b-0 md:mb-6" style={{ marginBottom: '-1px' }}>
      {drawerMode === 'compose' ? (
        <>
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            ref={toEmailRef}
            placeholder="Recipient Email"
            value={getDisplayValue(toEmail)}
            onChange={(e) => setToEmail(e.target.value)}
            type="email"
            className="mobile-input mobile-input-text-fix pl-10 border-0 rounded-none md:border md:rounded-t-md focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
          />
        </>
      ) : (
        <>
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <div
            onClick={() => setRecipientModalOpen(true)}
            className="mobile-input mobile-input-text-fix pl-10 pr-3 py-2 border-0 rounded-none md:border md:rounded-t-md cursor-pointer transition-colors hover:bg-muted/50 flex items-center justify-between"
          >
            {campaignRecipients ? (
              <span className="group inline-flex items-center px-2.5 py-1 rounded bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary text-sm font-normal truncate max-w-full transition-colors relative">
                <span className="truncate">{getRecipientDisplayText()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCampaignRecipients(null);
                  }}
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-destructive"
                  aria-label="Remove recipients"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {getRecipientDisplayText()}
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <RecipientSelectionModal
            open={recipientModalOpen}
            onOpenChange={setRecipientModalOpen}
            currentListId={currentListId}
            currentQuery={currentQuery}
            onSelect={handleRecipientSelect}
          />
        </>
      )}
    </div>

    {/* Email Form */}
    <div className={isMobile ? "flex-1 min-h-0 flex flex-col" : ""}>
      <EmailForm
        drawerMode={drawerMode}
        toEmail={toEmail}
        emailSubject={getCurrentSubject()}
        originalEmailSubject={getCurrentOriginalSubject()}
        emailContent={getCurrentContent()}
        originalEmailContent={getCurrentOriginalContent()}
        onSubjectChange={(value) => {
          setCurrentSubject(value);
          // In compose mode, always sync both values for normal editing
          // In campaign mode, only update original when in merge view mode (editing raw template)
          if (drawerMode === 'compose' || isMergeViewMode) {
            setCurrentOriginalSubject(value);
          }
        }}
        onContentChange={(value) => {
          setCurrentContent(value);
          // In compose mode, always sync both values for normal editing
          // In campaign mode, only update original when in merge view mode (editing raw template)
          if (drawerMode === 'compose' || isMergeViewMode) {
            setCurrentOriginalContent(value);
          }
        }}
        gmailStatus={gmailStatus}
        gmailUserInfo={gmailUserInfo}
        isGmailButtonHovered={isGmailButtonHovered}
        onGmailButtonHover={setIsGmailButtonHovered}
        onGmailConnect={handleGmailConnect}
        sendEmailMutation={sendEmailMutation}
        isSent={isSent}
        selectedContact={selectedContact}
        selectedCompany={selectedCompany}
        onSendEmail={handleSendEmail}
        onManualSend={handleManualSend}
        campaignRecipients={campaignRecipients || undefined}
        currentListId={currentListId}
        currentQuery={currentQuery}
        onCreateCampaign={handleCreateCampaign}
        generationType={generationMode}
        creatingCampaign={createCampaignMutation.isPending}
        isMergeViewMode={isMergeViewMode}
        getDisplayValue={getDisplayValue}
        isExpanded={isExpanded}
        isMobile={isMobile}
      />
    </div>

    {/* Merge Field Controls - Show immediately after EmailForm in Campaign Template mode */}
    {drawerMode === 'campaign' && generationMode === 'merge_field' && (
      <>
        {/* Merge View Mode Notification Banner */}
        {isMergeViewMode && (
          <div className="mt-8 mb-3 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-md text-sm">
            Merge View Mode - Showing technical merge fields
          </div>
        )}
        <div className="mt-4 pt-2 flex justify-end">
          <MergeFieldControls 
            isMergeViewMode={isMergeViewMode}
            onToggleMergeView={toggleMergeView}
            onMergeFieldClick={() => setMergeFieldDialogOpen(true)}
            onSaveTemplateClick={handleSaveAsTemplate}
          />
        </div>
      </>
    )}

    {/* Settings and Templates Buttons Row - with proper spacing from email field */}
    <div className="mt-2 pt-1">
      <div className="flex justify-start gap-2">
        {/* Campaign Settings Button - Only shown in campaign mode */}
        {drawerMode === 'campaign' && (
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md"
          >
            <span>Campaign Settings</span>
            {settingsOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        
        {/* Templates Button */}
        <button
          onClick={() => setTemplatesOpen(!templatesOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md"
          data-testid="button-templates-toggle"
        >
          <span>Templates</span>
          {templatesOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      
      {/* Campaign Settings Collapsible Container - Only shown when open and in campaign mode */}
      {drawerMode === 'campaign' && (
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          settingsOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
        )}>
          <CampaignSettings
            open={true} // Always true since we control visibility with the container
            onOpenChange={() => {}} // No-op since we handle it above
            settings={campaignSettings}
            onSettingsChange={setCampaignSettings}
            totalRecipients={campaignRecipients ? 100 : 50}
            className=""
          />
        </div>
      )}
      
      {/* Templates Collapsible Container */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        templatesOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
      )}>
        <TemplateManager
          templates={templates}
          templatesLoading={templatesLoading}
          onTemplateSelect={(template: EmailTemplate) => {
            setEmailPrompt(template.description || "");
            setCurrentContent(template.content);
            setCurrentSubject(template.subject || "");
            setOriginalEmailPrompt(template.description || "");
            setCurrentOriginalContent(template.content);
            setCurrentOriginalSubject(template.subject || "");
          }}
          currentContent={getCurrentContent()}
          currentSubject={getCurrentSubject()}
          emailPrompt={emailPrompt}
          isMergeViewMode={isMergeViewMode}
          onMergeViewToggle={toggleMergeView}
          onMergeFieldInsert={handleMergeFieldInsert}
          selectedContact={selectedContact}
          selectedCompany={selectedCompany}
          user={user}
          editingTemplateId={null}
          editingTemplate={null}
        />
      </div>
    </div>

    {/* Generate Email Confirmation Dialog */}
    <AlertDialog open={generateConfirmDialogOpen} onOpenChange={setGenerateConfirmDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate AI Email</AlertDialogTitle>
          <AlertDialogDescription>
            This will replace all content in email subject and body fields.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setGenerateConfirmDialogOpen(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmGenerate}>
            Generate Email
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Product Change Confirmation Dialog */}
    <AlertDialog open={productChangeDialogOpen} onOpenChange={setProductChangeDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Product</AlertDialogTitle>
          <AlertDialogDescription>
            This will replace the current email prompt with the new product details. Continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelProductChange}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmProductChange}>
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Merge Field Dialog */}
    <MergeFieldDialog 
      open={mergeFieldDialogOpen} 
      onOpenChange={setMergeFieldDialogOpen}
      onMergeFieldInsert={handleMergeFieldInsert}
    />

    {/* Save Template Dialog */}
    <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Enter name of new template:
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Sales Genius 2027"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && templateName.trim()) {
                handleConfirmSaveTemplate();
              }
            }}
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setSaveTemplateDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSaveTemplate}
            disabled={!templateName.trim()}
          >
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}