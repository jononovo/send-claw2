import { useEffect, useRef } from 'react';

interface EmailComposerState {
  // Drawer state
  isOpen?: boolean;
  drawerMode?: 'compose' | 'campaign';
  
  // Form fields
  emailPrompt?: string;
  emailSubject?: string;
  emailContent?: string;
  toEmail?: string;
  
  // Template mode fields
  templateSubject?: string;
  templateContent?: string;
  
  // AI mode fields
  aiSubject?: string;
  aiContent?: string;
  
  // Settings
  selectedProduct?: any;
  selectedTone?: string;
  selectedOfferStrategy?: string;
  selectedSenderProfileId?: number | null;
  generationMode?: 'ai_unique' | 'merge_field';
  
  // Campaign settings
  campaignSettings?: {
    scheduleSend: boolean;
    autopilot: boolean;
    requiresHumanReview: boolean;
    trackEmails: boolean;
    unsubscribeLink: boolean;
  };
  
  // Campaign recipients
  campaignRecipients?: any;
}

const STORAGE_KEY = 'emailComposerState';
const DEBOUNCE_DELAY = 500; // Save after 500ms of no changes

export function useEmailComposerPersistence(
  state: EmailComposerState,
  isEnabled: boolean = true
) {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isRestoringRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const previousStateRef = useRef<string>('');
  
  // Save state to localStorage with debouncing
  useEffect(() => {
    // Don't save if disabled, restoring, or not yet initialized
    if (!isEnabled || isRestoringRef.current || !hasInitializedRef.current) return;
    
    // Convert state to string for comparison
    const stateString = JSON.stringify(state);
    
    // Don't save if state hasn't actually changed
    if (stateString === previousStateRef.current) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save
    saveTimeoutRef.current = setTimeout(() => {
      try {
        // Filter out undefined values and functions
        const stateToSave = Object.entries(state).reduce((acc, [key, value]) => {
          if (value !== undefined && typeof value !== 'function') {
            acc[key as keyof EmailComposerState] = value;
          }
          return acc;
        }, {} as EmailComposerState);
        
        // Always save if drawer is open (to preserve all settings including campaign settings)
        // This ensures that campaign settings, dropdown selections, etc. are all preserved
        if (stateToSave.isOpen) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
          previousStateRef.current = stateString;
          console.log('Saved email composer state:', stateToSave);
        }
      } catch (error) {
        console.error('Failed to save email composer state:', error);
      }
    }, DEBOUNCE_DELAY);
    
    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, isEnabled]);
  
  // Restore state from localStorage
  const restoreState = (): EmailComposerState | null => {
    try {
      isRestoringRef.current = true;
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        console.log('Restored email composer state:', parsed);
        // Reset flags after a short delay to allow state updates to propagate
        setTimeout(() => {
          isRestoringRef.current = false;
          hasInitializedRef.current = true;
        }, 200);
        return parsed;
      }
    } catch (error) {
      console.error('Failed to restore email composer state:', error);
    }
    isRestoringRef.current = false;
    // Mark as initialized even if no saved state
    setTimeout(() => {
      hasInitializedRef.current = true;
    }, 100);
    return null;
  };
  
  // Clear saved state
  const clearState = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      previousStateRef.current = '';
      console.log('Cleared email composer state');
    } catch (error) {
      console.error('Failed to clear email composer state:', error);
    }
  };
  
  return {
    restoreState,
    clearState
  };
}

// Helper hook to get just the drawer open state
export function getEmailComposerDrawerState(): { isOpen: boolean; drawerMode?: 'compose' | 'campaign'; emailSubject?: string } {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      return {
        isOpen: parsed.isOpen || false,
        drawerMode: parsed.drawerMode,
        emailSubject: parsed.emailSubject || parsed.templateSubject || parsed.aiSubject
      };
    }
  } catch (error) {
    console.error('Failed to get drawer state:', error);
  }
  return { isOpen: false };
}

// Helper to update just the drawer open state
export function setDrawerOpenState(isOpen: boolean) {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      parsed.isOpen = isOpen;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (error) {
    console.error('Failed to update drawer state:', error);
  }
}

// Helper to get current email subject from persisted state
export function getPersistedEmailSubject(): string | undefined {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      return parsed.emailSubject || parsed.templateSubject || parsed.aiSubject;
    }
  } catch (error) {
    console.error('Failed to get email subject:', error);
  }
  return undefined;
}