import { useState, useEffect, useRef, lazy, Suspense, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchProgressIndicator, type SearchProgressState } from "@/features/search-progress";
import { TableSkeleton } from "@/components/ui/table-skeleton";

// Lazy load heavy components
const CompanyCards = lazy(() => import("@/components/company-cards"));
const PromptEditor = lazy(() => import("@/components/prompt-editor"));

// Import consolidated search report modal
import { SearchReportModal } from "@/features/search-report";
import { OnboardingFlowOrchestrator } from "@/components/onboarding/OnboardingFlowOrchestrator";
import { EmailDrawer, useEmailDrawer } from "@/features/email-drawer";
import { SearchManagementDrawer, useSearchManagementDrawer } from "@/features/search-management-drawer";
import { TopProspectsCard } from "@/features/top-prospects";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { useToast } from "@/hooks/use-toast";
import { getPersistedEmailSubject } from "@/hooks/use-email-composer-persistence";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationToast } from "@/components/ui/notification-toast";
import {
  Search,
  Code2,
  UserCircle,
  Banknote,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  ThumbsUp,
  ThumbsDown,
  Star,
  MessageSquare,
  Gem,
  MoreHorizontal,
  Menu,
  Mail,
  Megaphone,
  Target,
  Plus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { EggAnimation } from "@/components/egg-animation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Company, Contact, SearchList } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { filterTopProspects, ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";
import { Checkbox } from "@/components/ui/checkbox";
import { ContactActionColumn } from "@/components/contact-action-column";
import { SearchSessionManager } from "@/lib/search-session-manager";
import { useComprehensiveEmailSearch } from "@/features/search-email";
import { useSearchState, type SavedSearchState, type CompanyWithContacts } from "@/features/search-state";
import { useEmailSearchOrchestration } from "@/features/email-search-orchestration";
import { FeedbackModal } from "@/features/find-ideal-customer/components/FeedbackModal";

// Define SourceBreakdown interface to match EmailSearchSummary
interface SourceBreakdown {
  Perplexity: number;
  Apollo: number;
  Hunter: number;
}

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [currentResults, setCurrentResults] = useState<CompanyWithContacts[] | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentListId, setCurrentListIdBase] = useState<number | null>(null);
  
  // Wrapper to log currentListId changes
  const setCurrentListId = (newListId: number | null) => {
    console.log('🟢 LIST ID CHANGED:', {
      from: currentListId,
      to: newListId,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack?.split('\n').slice(2, 5).join('\n')
    });
    setCurrentListIdBase(newListId);
  };
  const [companiesViewMode, setCompaniesViewMode] = useState<'scroll' | 'slides'>('scroll');
  const [pendingContactIds, setPendingContactIds] = useState<Set<number>>(new Set());
  // State for selected contacts (for multi-select checkboxes)
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  // Add new state for tracking contact loading status
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  // Track if user came from landing page
  const [isFromLandingPage, setIsFromLandingPage] = useState(false);
  // Track the last executed search query and if input has changed
  const [lastExecutedQuery, setLastExecutedQuery] = useState<string | null>(null);
  const [inputHasChanged, setInputHasChanged] = useState(false);
  // Track current session ID for email search persistence
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  // Tour modal has been removed
  
  // Email drawer state management
  const emailDrawer = useEmailDrawer({
    onClose: () => {
      setSearchSectionCollapsed(false);
    }
  });
  
  // Search Management drawer
  const searchManagementDrawer = useSearchManagementDrawer();
  
  const [searchSectionCollapsed, setSearchSectionCollapsed] = useState(false);
  
  // Search progress state (lifted from PromptEditor for rendering outside collapsible section)
  const [promptEditorProgress, setPromptEditorProgress] = useState<SearchProgressState>({
    phase: "",
    completed: 0,
    total: 5,
    isVisible: false
  });
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSearchQuery, setOnboardingSearchQuery] = useState<string>("");
  const [onboardingSearchResults, setOnboardingSearchResults] = useState<any[]>([]);
  
  // Feedback modal state
  const [feedbackModalState, setFeedbackModalState] = useState<{
    isOpen: boolean;
    contactId: number | null;
    contactName: string;
    feedbackType: "excellent" | "terrible";
  }>({
    isOpen: false,
    contactId: null,
    contactName: "",
    feedbackType: "excellent",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const registrationModal = useRegistrationModal();
  const auth = useAuth();
  const { notificationState, triggerNotification, closeNotification } = useNotifications();
  
  // Use shared comprehensive email search hook
  // Handler for contact click to open email drawer
  const handleContactClick = (contact: ContactWithCompanyInfo, company: Company) => {
    // Get all contacts from the same company
    const companyContacts = currentResults
      ?.find(c => c.id === company.id)
      ?.contacts || [];
    
    // Open the drawer with the selected contact
    emailDrawer.openDrawer(contact, company, companyContacts);
    
    // Check if contact has an email and handle accordingly
    if (!contact.email) {
      // Check if we've already searched comprehensively for this contact
      const hasSearchedComprehensively = contact.completedSearches?.includes('comprehensive_search');
      
      if (hasSearchedComprehensively) {
        toast({
          title: "No email available",
          description: `All search methods have been exhausted for ${contact.name}. Consider selecting another contact.`,
          variant: "default",
        });
      } else {
        toast({
          title: "No email found",
          description: `Click the "Find email" button to search for it.`,
          variant: "default",
        });
      }
    }
    
    // Auto-collapse search section when email drawer opens
    setSearchSectionCollapsed(true);
  };
  
  const handleEmailContactChange = (newContact: Contact | null) => {
    emailDrawer.setSelectedContact(newContact);
  };

  // Auto-collapse search section when email drawer opens or when search results exist
  useEffect(() => {
    if (emailDrawer.isOpen) {
      setSearchSectionCollapsed(true);
    } else if (currentResults && currentResults.length > 0) {
      // Also collapse when search results are shown
      setSearchSectionCollapsed(true);
    } else {
      // Expand when drawer closes and no results
      setSearchSectionCollapsed(false);
    }
  }, [emailDrawer.isOpen, currentResults]);
  
  const { 
    handleComprehensiveEmailSearch: comprehensiveSearchHook, 
    pendingSearchIds: pendingComprehensiveSearchIds 
  } = useComprehensiveEmailSearch({
    onContactUpdate: (updatedContact) => {
      // Update the contact in currentResults
      setCurrentResults(prev => {
        if (!prev) return null;
        const updatedResults = prev.map(company => ({
          ...company,
          contacts: company.contacts?.map(contact =>
            contact.id === updatedContact.id 
              ? { ...updatedContact, companyName: company.name, companyId: company.id } as ContactWithCompanyInfo
              : contact
          )
        }));
        
        // Save to localStorage for persistence
        // Save lastExecutedQuery as currentQuery to ensure consistency
        const queryToSave = lastExecutedQuery || currentQuery;
        const stateToSave = {
          currentQuery: queryToSave,
          currentResults: updatedResults,
          currentListId,
          lastExecutedQuery
        };
        localStorage.setItem('searchState', JSON.stringify(stateToSave));
        sessionStorage.setItem('searchState', JSON.stringify(stateToSave));
        
        return updatedResults;
      });
    }
  });

  // Initialize search state management hook
  const searchState = useSearchState(setCurrentResults);
  const { 
    loadSearchState, 
    persistSearchState, 
    refreshContactDataFromDatabase,
    refreshAndUpdateResults,
    isMountedRef,
    isInitializedRef,
    hasSessionRestoredDataRef,
    refreshVersionRef
  } = searchState;
  
  // Other refs for list mutations and debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listMutationInProgressRef = useRef(false);
  const listUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredWelcomeRef = useRef(false);
  // Ref to store pending metrics to persist after list creation
  const pendingMetricsRef = useRef<{
    totalContacts: number | null;
    totalEmails: number | null;
    searchDurationSeconds: number | null;
    sourceBreakdown: SourceBreakdown | null;
  } | null>(null);



  // Auto-refresh contact data if there was a recent email search
  const refreshContactDataIfNeeded = async (companies: CompanyWithContacts[]) => {
    try {
      // Check if there was a recent email search (within last 2 minutes)
      const lastEmailSearch = localStorage.getItem('lastEmailSearchTimestamp');
      if (lastEmailSearch) {
        const timeSinceSearch = Date.now() - parseInt(lastEmailSearch);
        if (timeSinceSearch < 120000) { // 2 minutes
          console.log('Recent email search detected, refreshing contact data...');
          
          // Use the unified refresh helper with email search timestamp clearing
          const refreshedResults = await refreshAndUpdateResults(
            companies,
            {
              currentQuery: currentQuery,
              currentListId: currentListId,
              lastExecutedQuery: lastExecutedQuery
            },
            {
              clearEmailSearchTimestamp: true
            }
          );
          
          console.log('Contact data refresh completed');
          
          // Return the refreshed results for immediate use
          return refreshedResults;
        }
      }
    } catch (error) {
      console.error('Auto-refresh failed:', error);
    }
    
    // Return original companies if no refresh was needed
    return companies;
  };

  // Helper function to check if data has complete contact information
  const hasCompleteContacts = (data: CompanyWithContacts[] | null): boolean => {
    if (!data || !Array.isArray(data)) return false;
    
    // Check if at least one company has contacts
    return data.some(company => 
      company.contacts && Array.isArray(company.contacts) && company.contacts.length > 0
    );
  };

  // Load state from localStorage on component mount
  useEffect(() => {
    console.log('🟣 COMPONENT MOUNT - Home page mounting');
    
    // Check for pending search query from landing page
    const pendingQuery = localStorage.getItem('pendingSearchQuery');
    if (pendingQuery) {
      console.log('Found pending search query:', pendingQuery);
      setCurrentQuery(pendingQuery);
      setIsFromLandingPage(true); // Set flag when coming from landing page
      localStorage.removeItem('pendingSearchQuery');
      // Clear any existing search state AND list ID when starting fresh search
      localStorage.removeItem('searchState');
      sessionStorage.removeItem('searchState');
      setCurrentListId(null); // Clear any existing list ID
      setIsSaved(false);
      // No longer automatically triggering search - user must click the search button
    } else {
      // Enhanced data restoration logic with intelligent merging
      const savedState = loadSearchState();
      
      if (savedState && savedState.currentResults && !hasSessionRestoredDataRef.current) {
        console.log('Found localStorage data:', {
          query: savedState.currentQuery,
          resultsCount: savedState.currentResults?.length,
          hasContacts: hasCompleteContacts(savedState.currentResults),
          listId: savedState.currentListId
        });
        
        // Restore state variables
        const queryToRestore = savedState.currentQuery || "";
        const listIdToRestore = savedState.currentListId;
        
        console.log('[LOCALSTORAGE RESTORE] Loading saved state:', {
          queryToRestore,
          listIdToRestore,
          resultsCount: savedState.currentResults?.length,
          hasListId: !!listIdToRestore,
          savedStateKeys: Object.keys(savedState)
        });
        
        // Set state only once
        setCurrentQuery(queryToRestore);
        setCurrentListId(listIdToRestore);
        setCurrentResults(savedState.currentResults);
        setLastExecutedQuery(savedState.lastExecutedQuery || savedState.currentQuery);
        setInputHasChanged(false); // Set to false when loading saved state
        
        // Mark list as saved if we have a listId
        if (listIdToRestore) {
          setIsSaved(true);
          console.log('[LOCALSTORAGE RESTORE] Restored saved search list with ID:', listIdToRestore);
        } else {
          // Do NOT auto-create a new list for orphaned results
          // This prevents duplicate lists when user navigates away before list creation completes
          console.log('🔵 [LOCALSTORAGE RESTORE] No listId found - will be created if user performs new search');
        }
        
        // Always refresh contact data when restoring from localStorage to ensure emails are preserved
        console.log('Refreshing contact data from database to preserve emails after navigation');
        console.log('Companies before refresh:', savedState.currentResults.map((c: CompanyWithContacts) => ({
          name: c.name,
          contactCount: c.contacts?.length || 0,
          contactsWithEmails: c.contacts?.filter(contact => contact.email).length || 0,
          listId: listIdToRestore
        })));
        
        // Always refresh from database to ensure fresh data (including emails)
        console.log('NAVIGATION: Passing listId to refreshAndUpdateResults:', listIdToRestore);
        refreshAndUpdateResults(
          savedState.currentResults,
          {
            currentQuery: queryToRestore,
            currentListId: listIdToRestore,
            lastExecutedQuery: savedState.lastExecutedQuery || savedState.currentQuery
          },
          {
            additionalStateFields: {
              emailSearchCompleted: savedState.emailSearchCompleted || false,
              emailSearchTimestamp: savedState.emailSearchTimestamp || null,
              navigationRefreshTimestamp: Date.now()
            }
          }
        ).then(refreshedResults => {
          const emailsAfterRefresh = refreshedResults.reduce((total, company) => 
            total + (company.contacts?.filter(c => c.email && c.email.length > 0).length || 0), 0
          );
          
          console.log(`NAVIGATION: Database refresh completed with ${emailsAfterRefresh} emails`);
          console.log('NAVIGATION: Companies after refresh:', refreshedResults.map(c => ({
            name: c.name,
            contactCount: c.contacts?.length || 0,
            contactsWithEmails: c.contacts?.filter(contact => contact.email && contact.email.length > 0).length || 0
          })));
          
          if (emailsAfterRefresh > 0) {
            console.log(`NAVIGATION: Successfully restored ${emailsAfterRefresh} emails`);
          }
        }).catch(error => {
          console.error('NAVIGATION: Database refresh failed:', error);
          // Fallback to using saved state as-is
          setCurrentResults(savedState.currentResults);
        });
      } else {
        console.log('No saved search state found or session data already restored');
      }
    }

    // Registration success callback setup (only set once)
    const handleRegistrationSuccess = async () => {
      if (hasTriggeredWelcomeRef.current) return;
      hasTriggeredWelcomeRef.current = true;
      
      console.log('Registration success detected, triggering welcome notification');
      
      try {
        // Extract guest data BEFORE cleanup (critical timing fix)
        const savedState = loadSearchState();
        const guestData = {
          originalQuery: savedState?.currentQuery || null
        };
        
        console.log('Extracted guest data:', guestData);
        
        // Clear all guest localStorage data
        localStorage.removeItem('searchState');
        sessionStorage.removeItem('searchState');
        localStorage.removeItem('contactSearchConfig');
        localStorage.removeItem('lastEmailSearchTimestamp');
        localStorage.removeItem('pendingSearchQuery');
        
        // Clear guidance engine localStorage so new user gets fresh guidance
        localStorage.removeItem('fluffy-guidance-progress');
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('fluffy-quest-triggered-')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear component state
        setCurrentResults(null);
        setCurrentListId(null);
        setIsSaved(false);
        setContactsLoaded(false);
        
        // Reset search button state for clean starting point
        setLastExecutedQuery(null);
        setInputHasChanged(false);
        
        // Clear saved searches cache to remove demo user's lists
        queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
        
        console.log('Guest data cleared successfully');
        
        // Restore original query to input field
        if (guestData.originalQuery) {
          setCurrentQuery(guestData.originalQuery);
          console.log('Restored guest query to input:', guestData.originalQuery);
        }
        
        // Toast removed - redundant with welcome notification system
        
        // Trigger welcome notification (client-side)
        triggerNotification('registration_complete');
      } catch (error) {
        console.error('Failed to handle registration success:', error);
      }
    };

    // Only set callback once when component mounts
    if (!isInitializedRef.current) {
      registrationModal.setRegistrationSuccessCallback(handleRegistrationSuccess);
    }
    
    // Mark component as initialized
    isInitializedRef.current = true;
    
    // Cleanup function to prevent localStorage corruption during unmount
    return () => {
      // Clear the registration callback to prevent it from being triggered on next mount
      registrationModal.setRegistrationSuccessCallback(() => {});
      
      isMountedRef.current = false;
    };
  }, []); // Remove dependencies to prevent re-running

  // Listen for search events from global navigation (drawer is now managed by layout.tsx)
  useEffect(() => {
    const handleLoadSearchEvent = (event: CustomEvent) => {
      handleLoadSavedSearch(event.detail);
    };
    
    const handleNewSearchEvent = () => {
      handleNewSearch();
    };
    
    const handleOpenComposeEvent = () => {
      emailDrawer.openCompose();
    };

    window.addEventListener('loadSavedSearch', handleLoadSearchEvent as EventListener);
    window.addEventListener('startNewSearch', handleNewSearchEvent);
    window.addEventListener('openEmailCompose', handleOpenComposeEvent);
    
    return () => {
      window.removeEventListener('loadSavedSearch', handleLoadSearchEvent as EventListener);
      window.removeEventListener('startNewSearch', handleNewSearchEvent);
      window.removeEventListener('openEmailCompose', handleOpenComposeEvent);
    };
  }, [emailDrawer.openCompose]);

  // Save state to localStorage whenever it changes (but prevent corruption during unmount)
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set 1000ms delay for existing save logic
    debounceTimerRef.current = setTimeout(() => {
      // Only save if component is mounted and initialized (prevents corruption during unmount)
      if (!isMountedRef.current || !isInitializedRef.current) {
        console.log('Skipping localStorage save - component not ready or unmounting');
        return;
      }
      
      // Only save if we have meaningful data (prevents saving null states)
      if (currentQuery || (currentResults && currentResults.length > 0)) {
        // Save lastExecutedQuery as currentQuery to ensure the saved query matches the results
        // If no search has been executed yet, fall back to currentQuery
        const queryToSave = lastExecutedQuery || currentQuery;
        const stateToSave: SavedSearchState = {
          currentQuery: queryToSave,
          currentResults,
          currentListId,
          lastExecutedQuery
        };
        console.log('Saving search state:', {
          query: queryToSave,
          resultsCount: currentResults?.length,
          listId: currentListId,
          companies: currentResults?.map(c => ({ id: c.id, name: c.name }))
        });
        
        // Save to both localStorage and sessionStorage for redundancy
        const stateString = JSON.stringify(stateToSave);
        localStorage.setItem('searchState', stateString);
        sessionStorage.setItem('searchState', stateString);
      } else {
        console.log('Skipping localStorage save - no meaningful data to save');
      }
    }, 1000);
    
    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentQuery, currentResults, currentListId, lastExecutedQuery]);





  
  // Auto-creation mutation for silent list creation after search
  const autoCreateListMutation = useMutation({
    mutationFn: async ({ query, companies }: { query: string; companies: CompanyWithContacts[] }) => {
      console.log('🔴 LIST CREATION - Starting auto-create mutation:', {
        query: query,
        companiesCount: companies?.length,
        timestamp: new Date().toISOString()
      });
      
      if (!query || !companies) return;
      
      // Get current contact search config from localStorage
      const savedConfig = localStorage.getItem('contactSearchConfig');
      let contactSearchConfig = null;
      if (savedConfig) {
        try {
          contactSearchConfig = JSON.parse(savedConfig);
        } catch (error) {
          console.error('Error parsing contact search config:', error);
        }
      }
      
      const res = await apiRequest("POST", "/api/lists", {
        companies: companies,
        prompt: query,
        contactSearchConfig: contactSearchConfig
      });
      const jsonData = await res.json();
      console.log('🔴 [AUTO-CREATE LIST] Backend response from POST /api/lists:', jsonData);
      console.log('🔴 [AUTO-CREATE LIST] Response fields:', Object.keys(jsonData));
      return jsonData;
    },
    onSuccess: (data) => {
      console.log('Backend returned data from list creation:', data); // Debug log to see exact structure
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      
      // FIX: Backend returns both 'id' (table PK) and 'listId' (the actual list ID we need)
      const listId = data.listId; // Use the correct field: listId not id
      setCurrentListId(listId); // Track the auto-created list
      setIsSaved(true); // Mark as saved
      listMutationInProgressRef.current = false; // Reset flag
      console.log('List created successfully with listId:', listId);
      
      // IMPORTANT: Persist the listId to localStorage immediately after creation
      persistSearchState(
        {
          currentResults: currentResults || []
        },
        {
          currentQuery: currentQuery,
          currentListId: listId, // Use the correct ID field
          lastExecutedQuery: lastExecutedQuery
        }
      );
      console.log('Persisted new listId to localStorage:', listId);
      
      // Persist any pending metrics that were collected before list creation
      if (pendingMetricsRef.current && listId) {
        const pendingMetrics = pendingMetricsRef.current;
        apiRequest("PATCH", `/api/lists/${listId}/metrics`, pendingMetrics)
          .then(() => {
            console.log(`Persisted pending search metrics to newly created list ${listId}`);
            pendingMetricsRef.current = null; // Clear pending metrics
          })
          .catch((error) => {
            console.error('Failed to persist pending search metrics:', error);
          });
      }
      // No toast notification (silent auto-save)
    },
    onError: (error) => {
      console.error("Auto list creation failed:", error);
      listMutationInProgressRef.current = false; // Reset flag
      // Silent failure - don't show error to user
    },
  });

  // Mutation for updating existing list
  const updateListMutation = useMutation({
    mutationFn: async ({ query, companies, listId }: { query: string; companies: CompanyWithContacts[]; listId: number }) => {
      console.log('🟡 LIST UPDATE - Starting update mutation:', {
        listId: listId,
        query: query,
        companiesCount: companies?.length,
        timestamp: new Date().toISOString()
      });
      
      if (!query || !companies || !listId) {
        console.error('Update list validation failed:', {
          hasQuery: !!query,
          hasResults: !!companies,
          hasListId: !!listId,
          listId
        });
        throw new Error('Missing required data for list update');
      }
      
      console.log('Starting list update:', {
        listId: listId,
        query: query,
        companyCount: companies.length,
        companyIds: companies.map(c => c.id)
      });
      
      // Get current contact search config from localStorage
      const savedConfig = localStorage.getItem('contactSearchConfig');
      let contactSearchConfig = null;
      if (savedConfig) {
        try {
          contactSearchConfig = JSON.parse(savedConfig);
        } catch (error) {
          console.error('Error parsing contact search config:', error);
        }
      }
      
      const res = await apiRequest("PUT", `/api/lists/${listId}`, {
        companies: companies,
        prompt: query,
        contactSearchConfig: contactSearchConfig
      });
      return res.json();
    },
    onSuccess: (data) => {
      console.log('List update successful:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      listMutationInProgressRef.current = false; // Reset flag
      // Silent update - no toast for progressive updates
    },
    onError: (error) => {
      console.error('List update failed:', error);
      listMutationInProgressRef.current = false; // Reset flag
      // Silent failure for progressive updates
    },
  });

  // Ref for tracking automated search state (needed by email orchestration hook)
  const isAutomatedSearchRef = useRef(false);

  // Initialize email search orchestration hook
  const emailOrchestration = useEmailSearchOrchestration({
    currentResults,
    currentQuery,
    currentListId,
    lastExecutedQuery,
    currentSessionId,
    setCurrentResults,
    refreshContactDataIfNeeded,
    refreshAndUpdateResults,
    updateListMutation,
    isAutomatedSearchRef
  });

  // Mutation for saving list
  const saveAndNavigateMutation = useMutation({
    mutationFn: async () => {
      if (!currentQuery || !currentResults) return null;
      
      // Get current contact search config from localStorage
      const savedConfig = localStorage.getItem('contactSearchConfig');
      let contactSearchConfig = null;
      if (savedConfig) {
        try {
          contactSearchConfig = JSON.parse(savedConfig);
        } catch (error) {
          console.error('Error parsing contact search config:', error);
        }
      }
      
      const res = await apiRequest("POST", "/api/lists", {
        companies: currentResults,
        prompt: currentQuery,
        contactSearchConfig: contactSearchConfig
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "List Saved",
        description: "Your search results have been saved. Click on any contact to compose an email.",
      });
      setIsSaved(true);
      
      // Update the current list ID so the email drawer can reference it
      if (data && data.listId) {
        setCurrentListId(data.listId);
      }
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
  };

  // Helper function to sort companies by contact count
  const sortCompaniesByContactCount = (companies: CompanyWithContacts[]): CompanyWithContacts[] => {
    return [...companies].sort((a, b) => {
      const contactsA = a.contacts?.length || 0;
      const contactsB = b.contacts?.length || 0;
      return contactsB - contactsA; // Descending order (most contacts first)
    });
  };

  // New handler for initial companies data
  const handleCompaniesReceived = (query: string, companies: Company[]) => {
    console.log('Companies received:', companies.length);
    // Mark that we've received session-restored data
    hasSessionRestoredDataRef.current = true;
    // Update the UI with just the companies data
    setCurrentQuery(query);
    // Convert Company[] to CompanyWithContacts[] with empty contacts arrays
    const companiesWithEmptyContacts = companies.map(company => ({ ...company, contacts: [] }));
    // Apply sorting even though all have 0 contacts - maintains consistency
    const sortedCompanies = sortCompaniesByContactCount(companiesWithEmptyContacts);
    setCurrentResults(sortedCompanies);
    setIsSaved(false);
    setIsLoadingContacts(true);
    setContactsLoaded(false);
  };

  // Modified search results handler for the full data with contacts
  const handleSearchResults = (query: string, results: CompanyWithContacts[]) => {
    console.log('=== PARENT COMPONENT: handleSearchResults called ===');
    console.log('Received query:', query);
    console.log('Received results count:', results.length);
    console.log('Current component state - query:', currentQuery);
    console.log('Current component state - results count:', currentResults?.length || 0);
    console.log('Complete results received with contacts:', results.length);
    
    // Detect if this is a new search (different from current query)
    const isNewSearch = currentQuery !== query;
    
    // Store search results for potential AI training (but don't auto-trigger modal)
    if (results.length > 0) {
      setOnboardingSearchQuery(query);
      setOnboardingSearchResults(results);
    }
    
    // Clear any stale localStorage data that might conflict with new search results
    if (isNewSearch) {
      console.log('New search detected - clearing stale localStorage data and list ID');
      localStorage.removeItem('searchState');
      sessionStorage.removeItem('searchState');
      setCurrentListId(null);
      setIsSaved(false);
    }
    
    // Mark that we've received session-restored data
    hasSessionRestoredDataRef.current = true;
    
    // Sort companies by contact count (most contacts first)
    const sortedResults = sortCompaniesByContactCount(results);
    
    console.log('Companies reordered by contact count:', 
      sortedResults.map(c => ({ name: c.name, contacts: c.contacts?.length || 0 }))
    );
    
    setCurrentQuery(query);
    setCurrentResults(sortedResults);
    setIsSaved(false);
    setIsLoadingContacts(false);
    
    console.log('=== PARENT COMPONENT: State updated ===');
    console.log('New state - query:', query);
    console.log('New state - results count:', sortedResults.length);
    console.log('handleSearchResults completed');
    setContactsLoaded(true);
    setLastExecutedQuery(query); // Store the last executed query
    setInputHasChanged(false); // Reset the input changed flag
    
    // Show contact discovery report for any search with companies
    const companiesWithContacts = results.filter(company => 
      company.contacts && company.contacts.length > 0
    ).length;
    
    console.log("Companies with contacts:", companiesWithContacts, "of", results.length);
    
    // Don't show the report during progressive updates - let it be shown when search completes
    // The report will be shown via onSearchMetricsUpdate callback from PromptEditor
    
    // Auto-create/update list after search completes with contacts
    // Clear any pending timeout to prevent duplicate calls
    if (listUpdateTimeoutRef.current) {
      clearTimeout(listUpdateTimeoutRef.current);
    }
    
    if (sortedResults.length > 0) {
      // Capture values at timeout creation to avoid race conditions
      const queryAtTimeOfResults = query;
      const resultsAtTimeOfResults = sortedResults;
      // IMPORTANT: For new searches, always create a new list
      // Don't use currentListId if this is a new search - force null to create new list
      const listIdAtTimeOfResults = isNewSearch ? null : currentListId;
      
      // Debounce list creation/update to prevent duplicate calls during progressive updates
      listUpdateTimeoutRef.current = setTimeout(() => {
        console.log('🔵 LIST DECISION - Timer fired after 1.5s:', {
          listIdAtTimeOfResults,
          queryAtTimeOfResults,
          resultsCount: resultsAtTimeOfResults.length,
          mutationInProgress: listMutationInProgressRef.current,
          timestamp: new Date().toISOString()
        });
        
        // Check if a mutation is already in progress
        if (listMutationInProgressRef.current) {
          console.log('🔵 LIST DECISION - List mutation already in progress, skipping duplicate call');
          return;
        }
        
        if (!listIdAtTimeOfResults) {
          // Create new list (for new searches or when no list exists)
          console.log('🔵 LIST DECISION - Creating new list for search results (new search or no existing list)');
          listMutationInProgressRef.current = true;
          autoCreateListMutation.mutate({ 
            query: queryAtTimeOfResults, 
            companies: resultsAtTimeOfResults 
          });
        } else {
          // Update existing list (only for progressive updates of same search)
          console.log('🔵 LIST DECISION - Updating existing list:', listIdAtTimeOfResults);
          listMutationInProgressRef.current = true;
          updateListMutation.mutate({ 
            query: queryAtTimeOfResults, 
            companies: resultsAtTimeOfResults,
            listId: listIdAtTimeOfResults
          });
        }
      }, 1500); // 1.5 second delay to allow progressive updates to settle
    }
    
    // Keep isFromLandingPage true until email button is clicked
    // (removed automatic reset to allow email tooltip to show)
  };

  

  // Memoized top prospects - only recalculates when currentResults changes
  const topProspects = useMemo((): ContactWithCompanyInfo[] => {
    if (!currentResults) return [];

    const allContacts: ContactWithCompanyInfo[] = [];
    currentResults.forEach(company => {
      if (company.contacts) {
        allContacts.push(...company.contacts);
      }
    });

    return filterTopProspects(allContacts, {
      maxPerCompany: 3,
      minProbability: 50
    });
  }, [currentResults]);

  // Updated navigation handlers with SEO-friendly URLs
  const handleContactView = (contact: { id: number; slug?: string | null; name: string }) => {
    const slug = contact.slug || contact.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
    setLocation(`/p/${slug}/${contact.id}`);
  };

  const handleCompanyView = (company: { id: number; slug?: string | null; name: string }) => {
    const slug = company.slug || company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
    setLocation(`/company/${slug}/${company.id}`);
  };


  const isContactEnriched = (contact: Contact) => {
    // Consider a contact "enriched" if it's been processed, even if no data was found
    return contact.completedSearches?.includes('contact_enrichment') || false;
  };

  const isContactPending = (contactId: number) => {
    return pendingContactIds.has(contactId);
  };

  // Add mutation for contact feedback with context
  const feedbackMutation = useMutation({
    mutationFn: async ({ contactId, feedbackType, ispContext }: { contactId: number; feedbackType: string; ispContext: string }) => {
      const response = await apiRequest("POST", `/api/contacts/${contactId}/feedback`, {
        feedbackType,
        ispContext,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update the contact in the results
      setCurrentResults((prev) => {
        if (!prev) return null;
        return prev.map((company) => ({
          ...company,
          contacts: company.contacts?.map((contact) =>
            contact.id === data.contactId
              ? {
                  ...contact,
                  feedbackType: data.feedbackType,
                  ispContext: data.ispContext,
                  feedbackAt: data.feedbackAt,
                }
              : contact
          ),
        }));
      });

      toast({
        title: "Feedback Recorded",
        description: "Thank you for helping us find your ideal customer!",
      });
      
      // Close the modal
      setFeedbackModalState(prev => ({ ...prev, isOpen: false }));
    },
    onError: (error) => {
      toast({
        title: "Feedback Failed",
        description: error instanceof Error ? error.message : "Failed to record feedback",
        variant: "destructive",
      });
    },
  });

  // Open feedback modal when user selects a feedback option
  const handleContactFeedback = (contactId: number, feedbackType: "excellent" | "terrible") => {
    // Find the contact to get their name
    const contact = currentResults
      ?.flatMap(company => company.contacts || [])
      ?.find(c => c.id === contactId);
    
    if (!contact) {
      toast({
        title: "Error",
        description: "Contact not found",
        variant: "destructive",
      });
      return;
    }
    
    // Check if feedback was already given
    if (contact.feedbackType) {
      toast({
        title: "Feedback Already Given",
        description: "You have already provided feedback for this contact.",
      });
      return;
    }
    
    setFeedbackModalState({
      isOpen: true,
      contactId,
      contactName: contact.name,
      feedbackType,
    });
  };
  
  // Handle feedback modal submission
  const handleFeedbackSubmit = (feedbackType: "excellent" | "terrible", ispContext: string) => {
    if (feedbackModalState.contactId) {
      feedbackMutation.mutate({
        contactId: feedbackModalState.contactId,
        feedbackType,
        ispContext,
      });
    }
  };
  
  // Close feedback modal
  const handleFeedbackModalClose = () => {
    setFeedbackModalState(prev => ({ ...prev, isOpen: false }));
  };

  // Handle loading a saved search from the drawer
  const handleLoadSavedSearch = async (list: SearchList) => {
    console.log('Loading saved search:', {
      searchName: list.prompt,
      listId: list.listId,
      resultCount: list.resultCount
    });
    
    try {
      // Force refetch to get fresh data from server (includes "5 More" companies)
      // type: 'all' ensures refetch happens even without active observers
      await queryClient.refetchQueries({
        queryKey: [`/api/lists/${list.listId}/companies`],
        type: 'all',
        exact: true
      });
      
      // Now get the fresh data from cache
      const companies = await queryClient.fetchQuery({
        queryKey: [`/api/lists/${list.listId}/companies`]
      }) as Company[];
      
      console.log('Fetched companies from database:', {
        listId: list.listId,
        count: companies.length,
        expectedCount: list.resultCount
      });
      
      // Then fetch contacts for each company
      const companiesWithContacts = await Promise.all(
        companies.map(async (company) => {
          try {
            // Refetch to ensure fresh contact data
            await queryClient.refetchQueries({
              queryKey: [`/api/companies/${company.id}/contacts`],
              type: 'all',
              exact: true
            });
            
            const contacts = await queryClient.fetchQuery({
              queryKey: [`/api/companies/${company.id}/contacts`]
            }) as Contact[];
            
            // Add companyName and companyId to each contact
            const contactsWithCompanyInfo: ContactWithCompanyInfo[] = contacts.map(contact => ({
              ...contact,
              companyName: company.name,
              companyId: company.id
            }));
            return { ...company, contacts: contactsWithCompanyInfo };
          } catch (error) {
            console.error(`Failed to load contacts for company ${company.id}:`, error);
            return { ...company, contacts: [] };
          }
        })
      );
      
      // Set all state for loaded search
      setCurrentQuery(list.prompt);
      setLastExecutedQuery(list.prompt); // Update lastExecutedQuery to sync the search input
      setCurrentResults(companiesWithContacts);
      setCurrentListId(list.listId);
      setIsSaved(true);
      
      console.log('Saved search loaded successfully:', {
        query: list.prompt,
        listId: list.listId,
        companiesLoaded: companiesWithContacts.length,
        totalContacts: companiesWithContacts.reduce((sum, c) => sum + (c.contacts?.length || 0), 0)
      });
      
      // Force input change flag to false after a small delay to ensure proper state update
      setTimeout(() => {
        setInputHasChanged(false);
      }, 0);
      
      const totalContacts = companiesWithContacts.reduce((sum, company) => 
        sum + (company.contacts?.length || 0), 0);
      
      // Load persisted search metrics if available
      if (list.totalContacts !== null || list.totalEmails !== null || list.searchDurationSeconds !== null) {
        setMainSearchMetrics({
          query: list.prompt,
          totalCompanies: companiesWithContacts.length,
          totalContacts: list.totalContacts ?? 0,
          totalEmails: list.totalEmails ?? 0,
          searchDuration: list.searchDurationSeconds ? list.searchDurationSeconds * 1000 : 0,
          companies: companiesWithContacts,
          sourceBreakdown: list.sourceBreakdown ?? { Perplexity: 0, Apollo: 0, Hunter: 0 }
        });
        console.log('Loaded persisted search metrics:', {
          totalContacts: list.totalContacts,
          totalEmails: list.totalEmails,
          searchDurationSeconds: list.searchDurationSeconds,
          sourceBreakdown: list.sourceBreakdown
        });
      }
      
    } catch (error) {
      toast({
        title: "Failed to load search",
        description: "Could not load the selected search.",
        variant: "destructive"
      });
    }
  };

  // Handle starting a new search - resets to clean state
  const handleNewSearch = () => {
    // Close email drawer first (updates React state immediately)
    emailDrawer.closeDrawer();
    
    // Clear all search state
    setCurrentQuery("");
    setCurrentResults(null);
    setCurrentListId(null);
    setLastExecutedQuery(null);
    setIsSaved(false);
    setInputHasChanged(false);
    setSelectedContacts(new Set());
    setContactsLoaded(false);
    
    // Expand the search section
    setSearchSectionCollapsed(false);
    
    // Clear localStorage and sessionStorage saved state
    localStorage.removeItem('searchState');
    sessionStorage.removeItem('searchState');
    localStorage.removeItem('emailComposerState');
  };

  //New function added here
  const getEnrichButtonText = (contact: Contact) => {
    if (isContactPending(contact.id)) return "Processing...";
    if (isContactEnriched(contact)) {
      const hasEnrichedData = contact.email || contact.linkedinUrl || contact.phoneNumber || contact.department;
      return hasEnrichedData ? "Enriched" : "No Data Found";
    }
    return "Enrich";
  };

  const getEnrichButtonClass = (contact: Contact) => {
    if (isContactEnriched(contact)) {
      const hasEnrichedData = contact.email || contact.linkedinUrl || contact.phoneNumber || contact.department;
      return hasEnrichedData ? "text-green-500" : "text-muted-foreground opacity-50";
    }
    return "";
  };

  // State for consolidated search report modal
  const [mainSummaryVisible, setMainSummaryVisible] = useState(false);
  const [mainSearchMetrics, setMainSearchMetrics] = useState({
    query: "",
    totalCompanies: 0,
    totalContacts: 0,
    totalEmails: 0,
    searchDuration: 0,
    companies: [] as any[],
    sourceBreakdown: undefined as { Perplexity: number; Apollo: number; Hunter: number } | undefined
  });
  

  // Helper to get a contact by ID from current results
  const getCurrentContact = (contactId: number) => {
    if (!currentResults) return null;
    
    for (const company of currentResults) {
      const contact = company.contacts?.find(c => c.id === contactId);
      if (contact) return contact;
    }
    return null;
  };

  // Helper to get the best contact from a company for email search
  const getBestContact = (company: any) => {
    return emailOrchestration.getTopContacts(company, 1)[0];
  };

  // Helper function to finish search with cache invalidation
  const finishSearch = async () => {
    try {
      // Clear browser cache to force fresh requests
      Object.keys(localStorage).forEach(key => {
        if (key.includes('contact') || key.includes('company') || key.includes('search')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      
      // Fetch fresh contact data with cache-busting timestamp
      const cacheTimestamp = Date.now();
      
      if (currentResults && currentResults.length > 0) {
        // Use unified refresh helper with UI reset for animation effects
        await refreshAndUpdateResults(
          currentResults,
          {
            currentQuery: currentQuery,
            currentListId: currentListId,
            lastExecutedQuery: lastExecutedQuery
          },
          {
            forceUiReset: true,  // Force UI re-render for animations
            forceFresh: true  // Enable cache-busting
          }
        );
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error("Cache refresh failed:", error);
    }
    
    // Reset automated search flag
    isAutomatedSearchRef.current = false;
  };

  // Helper function to finish search without triggering list creation
  const finishSearchWithoutSave = async () => {
    try {
      // All the cache refresh logic from finishSearch() but without save operations
      if (currentResults && currentResults.length > 0) {
        // Use unified refresh helper with UI reset for animation effects
        await refreshAndUpdateResults(
          currentResults,
          {
            currentQuery: currentQuery,
            currentListId: currentListId,
            lastExecutedQuery: lastExecutedQuery
          },
          {
            forceUiReset: true,  // Force UI re-render for animations
            forceFresh: true  // Enable cache-busting
          }
        );
        
        console.log('finishSearchWithoutSave: Updated localStorage with refreshed data');
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error("Cache refresh failed:", error);
    }
    
    // Reset automated search flag
    isAutomatedSearchRef.current = false;
  };

  // Add delay helper for throttling API requests
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Wrapper function for comprehensive email search using the shared hook
  const handleComprehensiveEmailSearch = async (contactId: number) => {
    // Get contact data from current results
    const contact = currentResults?.flatMap(c => c.contacts || []).find(ct => ct.id === contactId);
    if (!contact) return;
    
    // Get company data for search context
    const company = currentResults?.find(c => c.contacts?.some(ct => ct.id === contactId));
    
    // Call the shared hook function
    await comprehensiveSearchHook(contactId, contact, {
      companyName: company?.name,
      companyWebsite: company?.website || undefined,
      companyDescription: company?.description || undefined
    });
  };
  
  // Functions for checkbox selection
  const handleCheckboxChange = (contactId: number) => {
    setSelectedContacts(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(contactId)) {
        newSelected.delete(contactId);
      } else {
        newSelected.add(contactId);
      }
      return newSelected;
    });
  };

  const isContactSelected = (contactId: number) => {
    return selectedContacts.has(contactId);
  };

  // Company selection functions (derived from contact selection)
  const getCompanySelectionState = (company: CompanyWithContacts): 'checked' | 'indeterminate' | 'unchecked' => {
    const contactsWithEmails = company.contacts?.filter(c => c.email) || [];
    if (contactsWithEmails.length === 0) return 'unchecked';
    
    const selectedCount = contactsWithEmails.filter(c => selectedContacts.has(c.id)).length;
    
    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === contactsWithEmails.length) return 'checked';
    return 'indeterminate';
  };
  
  const handleCompanyCheckboxChange = (company: CompanyWithContacts) => {
    const contactsWithEmails = company.contacts?.filter(c => c.email) || [];
    if (contactsWithEmails.length === 0) return;
    
    const currentState = getCompanySelectionState(company);
    
    setSelectedContacts(prev => {
      const newSelected = new Set(prev);
      
      if (currentState === 'checked' || currentState === 'indeterminate') {
        // Deselect all contacts with emails in this company
        contactsWithEmails.forEach(contact => {
          newSelected.delete(contact.id);
        });
      } else {
        // Select all contacts with emails in this company
        contactsWithEmails.forEach(contact => {
          newSelected.add(contact.id);
        });
      }
      
      return newSelected;
    });
  };

  return (
    <>
      {/* Consolidated Search Report Modal - Rendered at root level to avoid overflow clipping */}
      <SearchReportModal
        metrics={{
          query: mainSearchMetrics.query,
          totalCompanies: mainSearchMetrics.totalCompanies,
          totalContacts: mainSearchMetrics.totalContacts,
          totalEmails: mainSearchMetrics.totalEmails,
          searchDuration: mainSearchMetrics.searchDuration,
          companies: mainSearchMetrics.companies,
          sourceBreakdown: mainSearchMetrics.sourceBreakdown
        }}
        isVisible={mainSummaryVisible}
        onClose={() => setMainSummaryVisible(false)}
      />
      
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden relative">
        {/* Backdrop for mobile */}
      {emailDrawer.isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => {
            emailDrawer.closeDrawer();
          }}
        />
      )}
      
      {/* Main Content Container - will be compressed when drawer opens on desktop */}
      <div className={`flex-1 overflow-y-auto main-content-compressed ${emailDrawer.isOpen ? 'compressed-view' : ''}`}>
        <div className="container mx-auto py-6 px-0 md:px-6">
          {/* Intro tour modal has been removed */}

          <div className="grid grid-cols-12 gap-3 md:gap-6">
            {/* Main Content Area - full width */}
            <div className="col-span-12 space-y-2 md:space-y-4 mt-[-10px]">
          {/* Search Progress Bar - Rendered outside collapsible section so it stays visible */}
          {promptEditorProgress.isVisible && (
            <div className="px-3 md:px-6">
              <SearchProgressIndicator 
                phase={promptEditorProgress.phase}
                completed={promptEditorProgress.completed}
                total={promptEditorProgress.total}
                isVisible={promptEditorProgress.isVisible}
              />
            </div>
          )}
          
          {/* Search Section - Collapsible with Focus State */}
          <div className="relative transition-all duration-300 ease-in-out">
            {/* Collapsed Header - Only visible when collapsed */}
            {searchSectionCollapsed && (
              <button
                onClick={() => setSearchSectionCollapsed(false)}
                className="w-full px-3 md:px-6 py-2 bg-background border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center justify-between group mb-2"
                data-testid="button-expand-search"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  {currentQuery && (
                    <span className="text-sm text-muted-foreground truncate max-w-[200px] md:max-w-[400px]">
                      {currentQuery}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}
            
            {/* Expandable Search Content */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                searchSectionCollapsed 
                  ? 'max-h-0 opacity-0 pointer-events-none' 
                  : 'max-h-[500px] opacity-100'
              }`}
            >
              <div className="px-3 md:px-6 py-1"> {/* Reduced mobile padding, matched desktop padding with CardHeader (p-6) */}
                {/* Collapse button when expanded */}
                {!searchSectionCollapsed && (emailDrawer.isOpen || (currentResults && currentResults.length > 0)) && (
                  <button
                    onClick={() => setSearchSectionCollapsed(true)}
                    className="absolute right-3 md:right-6 top-2 z-10 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                    data-testid="button-collapse-search"
                    title="Minimize search"
                  >
                    <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </button>
                )}
                
                {!currentResults && !isAnalyzing && (
                  <div className="flex flex-col-reverse md:flex-row items-center gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <EggAnimation />
                      <h2 className="text-2xl mt-2 md:mt-0">Search for target businesses</h2>
                    </div>
                  </div>
                )}
                <Suspense fallback={<div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"></div>}>
                  <PromptEditor
                    onAnalyze={() => {
                      setIsAnalyzing(true);
                      // Clear list ID and results when starting a NEW search (different query)
                      if (currentQuery && currentQuery !== lastExecutedQuery) {
                        console.log('Starting new search - clearing list ID and results for query:', currentQuery);
                        setCurrentListId(null);
                        setIsSaved(false);
                        setCurrentResults(null);
                        setSelectedContacts(new Set());
                      }
                    }}
                    onComplete={handleAnalysisComplete}
                    onSearchResults={handleSearchResults}
                    onCompaniesReceived={handleCompaniesReceived}
                    isAnalyzing={isAnalyzing}
                    value={currentQuery || ""}
                    onChange={(newValue) => {
                      setCurrentQuery(newValue);
                      setInputHasChanged(newValue !== lastExecutedQuery);
                    }}
                    isFromLandingPage={isFromLandingPage}
                    onDismissLandingHint={() => setIsFromLandingPage(false)}
                    lastExecutedQuery={lastExecutedQuery}
                    onSearchSuccess={() => {
                      const selectedSearchType = localStorage.getItem('searchType') || 'contacts';
                      if (selectedSearchType === 'emails') {
                        // Auto-trigger email search for full flow
                        setTimeout(() => emailOrchestration.runEmailSearch(), 500);
                      }
                    }}
                    hasSearchResults={currentResults ? currentResults.length > 0 : false}
                    onSessionIdChange={setCurrentSessionId}
                    hideRoleButtons={!!(searchSectionCollapsed && currentResults && currentResults.length > 0 && !inputHasChanged)}
                    onSearchMetricsUpdate={async (metrics, showSummary) => {
                      setMainSearchMetrics({
                        ...metrics,
                        sourceBreakdown: metrics.sourceBreakdown
                      });
                      setMainSummaryVisible(showSummary);
                      
                      // Transform companies to reportCompanies format for persistence
                      const reportCompanies = metrics.companies?.map((company: any) => ({
                        id: company.id,
                        name: company.name,
                        contacts: company.contacts?.map((contact: any) => ({
                          id: contact.id,
                          name: contact.name,
                          role: contact.role,
                          email: contact.email,
                          probability: contact.probability
                        }))
                      })) ?? null;
                      
                      // Prepare metrics for persistence
                      const metricsToSave = {
                        totalContacts: metrics.totalContacts ?? null,
                        totalEmails: metrics.totalEmails ?? null,
                        searchDurationSeconds: metrics.searchDuration ?? null,
                        sourceBreakdown: metrics.sourceBreakdown ?? null,
                        reportCompanies
                      };
                      
                      // Persist metrics to database if we have a saved list
                      if (currentListId && metrics) {
                        try {
                          await apiRequest("PATCH", `/api/lists/${currentListId}/metrics`, metricsToSave);
                          console.log(`Persisted search metrics to list ${currentListId}`);
                        } catch (error) {
                          console.error('Failed to persist search metrics:', error);
                        }
                      } else if (metrics) {
                        // Store metrics in ref to persist after list creation
                        pendingMetricsRef.current = metricsToSave;
                        console.log('Stored pending metrics for later persistence');
                      }
                    }}
                    onOpenSearchDrawer={() => searchManagementDrawer.openDrawer()}
                    onProgressUpdate={setPromptEditorProgress}
                  />
                </Suspense>
                
                {/* Search suggestions - shown only when no results and not actively searching */}
                {!currentResults && !isAnalyzing && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Or select one of the suggestions below:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        "Recently exited startups in Miami",
                        "Real-estate lawyers in Salt Lake City",
                        "Stationary suppliers in Scranton",
                        "Health-tech SaaS in Brooklyn"
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setCurrentQuery(suggestion);
                            setInputHasChanged(true);
                          }}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors hover:shadow-sm"
                          data-testid={`button-suggestion-${suggestion.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Waiting message - shown when search is active but no results yet */}
                {!currentResults && isAnalyzing && (
                  <div className="mt-8 text-center">
                    <p className="text-lg text-muted-foreground">
                      ⏳ Your amazing list of companies will show up here.
                    </p>
                  </div>
                )}
                
              </div>
            </div>
          </div>

          {/* Companies Analysis Section - Moved to top */}
          {currentResults && currentResults.length > 0 ? (
            <Card className={`w-full rounded-none md:rounded-lg border-0 transition-all duration-300 bg-background ${emailDrawer.isOpen ? 'shadow-none' : ''}`} data-testid="search-results-card">
              
              {/* Email Search Progress - with reduced padding */}
              {emailOrchestration.isSearching && (
                <div className="px-0 md:px-4 pt-0 pb-3">
                  <SearchProgressIndicator 
                    phase={emailOrchestration.searchProgress.phase}
                    completed={emailOrchestration.searchProgress.completed}
                    total={emailOrchestration.searchProgress.total}
                    isVisible={emailOrchestration.isSearching}
                  />
                </div>
              )}
              
              <CardContent className="p-0">
                <div className="px-0 md:px-4 pb-4">
                  <Suspense fallback={<TableSkeleton />}>
                    <CompanyCards
                      companies={currentResults || []}
                      handleCompanyView={handleCompanyView}
                      handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
                      pendingContactIds={pendingContactIds}
                      pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
                      onContactClick={handleContactClick}
                      onViewModeChange={setCompaniesViewMode}
                      selectedEmailContact={emailDrawer.selectedContact}
                      selectedContacts={selectedContacts}
                      onContactSelectionChange={handleCheckboxChange}
                      getCompanySelectionState={getCompanySelectionState}
                      onCompanySelectionChange={handleCompanyCheckboxChange}
                      topActionsTrailing={selectedContacts.size > 0 ? (
                        <SelectionToolbar
                          selectedCount={selectedContacts.size}
                          onClear={() => setSelectedContacts(new Set())}
                          selectedContactIds={Array.from(selectedContacts)}
                        />
                      ) : undefined}
                      onShowReport={() => setMainSummaryVisible(true)}
                      onFindKeyEmails={emailOrchestration.runEmailSearch}
                      isFindingEmails={emailOrchestration.isSearching}
                      query={currentQuery}
                      onExtendSearch={handleSearchResults}
                      isAuthenticated={!!auth.user}
                      onLoginRequired={() => registrationModal.openModal()}
                  />
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Top Prospects Section - Modular component */}
          <TopProspectsCard
            prospects={topProspects}
            pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
            isVisible={!!(currentResults && currentResults.length > 0 && companiesViewMode !== 'slides')}
            onContactView={handleContactView}
            onContactFeedback={handleContactFeedback}
            handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
          />
            </div>

            {/* API Templates Button moved to settings drawer */}
          </div>

        </div>
      </div>
      
      {/* Email Drawer - New modular component */}
      <EmailDrawer
        open={emailDrawer.isOpen}
        mode={emailDrawer.mode}
        viewState={emailDrawer.viewState}
        selectedContact={emailDrawer.selectedContact}
        selectedCompany={emailDrawer.selectedCompany}
        selectedCompanyContacts={emailDrawer.selectedCompanyContacts}
        width={emailDrawer.drawerWidth}
        isResizing={emailDrawer.isResizing}
        currentListId={currentListId}
        currentQuery={currentQuery}
        emailSubject={emailDrawer.viewState === 'minimized' ? getPersistedEmailSubject() : undefined}
        onClose={emailDrawer.closeDrawer}
        onModeChange={emailDrawer.setMode}
        onContactChange={handleEmailContactChange}
        onResizeStart={emailDrawer.handleMouseDown}
        onMinimize={emailDrawer.minimize}
        onExpand={emailDrawer.expand}
        onRestore={emailDrawer.restore}
      />
      
      {/* Search Management Drawer */}
      <SearchManagementDrawer
        open={searchManagementDrawer.isOpen}
        width={searchManagementDrawer.drawerWidth}
        isResizing={searchManagementDrawer.isResizing}
        onClose={searchManagementDrawer.closeDrawer}
        onResizeStart={searchManagementDrawer.handleMouseDown}
        onTrainAI={() => setShowOnboarding(true)}
        hasSearchResults={onboardingSearchResults && onboardingSearchResults.length > 0}
      />

      {/* Notification System - Outside flex container */}
      <NotificationToast
        notificationState={notificationState}
        onClose={closeNotification}
      />
      
      {/* Mobile Selection Toolbar - Shows at bottom */}
      
      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlowOrchestrator
          searchQuery={onboardingSearchQuery}
          searchResults={onboardingSearchResults}
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('hasCompletedOnboarding', 'true');
            toast({
              title: "Setup complete!",
              description: "Your campaign is now active and ready to start generating leads.",
            });
          }}
          onClose={() => {
            setShowOnboarding(false);
          }}
        />
      )}
      
      {/* Feedback Modal for rating contacts */}
      <FeedbackModal
        isOpen={feedbackModalState.isOpen}
        onClose={handleFeedbackModalClose}
        onSubmit={handleFeedbackSubmit}
        feedbackType={feedbackModalState.feedbackType}
        contactName={feedbackModalState.contactName}
        isPending={feedbackMutation.isPending}
      />
    </div>
    </>
  );
}