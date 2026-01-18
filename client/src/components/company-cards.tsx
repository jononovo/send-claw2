import React, { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ExternalLink, 
  Gem,
  Target,
  Rocket,
  Star,
  ThumbsUp,
  ThumbsDown,
  Menu,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Globe,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Layers,
  Check,
  Linkedin
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Company, Contact } from "@shared/schema";
import { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";
import { ContactActionColumn } from "@/components/contact-action-column";
import { ComprehensiveSearchButton } from "@/components/comprehensive-email-search";
import { FindKeyEmailsButton } from "@/features/search-email";
import { ExtendSearchButton } from "@/features/search-extension";
import { ContactRow } from "@/components/contact-row";
import { cn } from "@/lib/utils";
import { useRef } from "react";

interface CompanyCardsProps {
  companies: Array<Company & { contacts?: ContactWithCompanyInfo[] }>;
  handleCompanyView: (company: { id: number; slug?: string | null; name: string }) => void;
  handleComprehensiveEmailSearch?: (contactId: number) => void;
  pendingContactIds?: Set<number>;
  pendingComprehensiveSearchIds?: Set<number>;
  onContactClick?: (contact: ContactWithCompanyInfo, company: Company) => void;
  onViewModeChange?: (viewMode: 'scroll' | 'slides') => void;
  selectedEmailContact?: Contact | null;
  selectedContacts?: Set<number>;
  onContactSelectionChange?: (contactId: number) => void;
  getCompanySelectionState?: (company: Company & { contacts?: ContactWithCompanyInfo[] }) => 'checked' | 'indeterminate' | 'unchecked';
  onCompanySelectionChange?: (company: Company & { contacts?: ContactWithCompanyInfo[] }) => void;
  topActionsTrailing?: React.ReactNode;
  onShowReport?: () => void;
  onFindKeyEmails?: () => void;
  isFindingEmails?: boolean;
  query?: string;
  onExtendSearch?: (query: string, results: any[]) => void;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
}

// Unified CompanyCard component
interface CompanyCardProps {
  company: Company & { contacts?: ContactWithCompanyInfo[] };
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSelected: boolean;
  onToggleSelection: (e: React.MouseEvent, companyId: number) => void;
  selectedContacts: Set<number>;
  onToggleContactSelection: (e: React.MouseEvent | null, contactId: number) => void;
  companySelectionState?: 'checked' | 'indeterminate' | 'unchecked';
  onCompanyCheckboxChange?: () => void;
  shouldShowCompanyCheckbox?: boolean;
  handleCompanyView: (company: { id: number; slug?: string | null; name: string }) => void;
  handleComprehensiveEmailSearch?: (contactId: number) => void;
  pendingContactIds?: Set<number>;
  pendingComprehensiveSearchIds?: Set<number>;
  onContactClick?: (contact: ContactWithCompanyInfo, company: Company) => void;
  onContactHover?: (contactId: number) => void;
  onContactLeave?: () => void;
  shouldShowCheckbox?: (contactId: number) => boolean;
  setLocation: (path: string) => void;
  sortedContacts: ContactWithCompanyInfo[];
  viewMode: 'scroll' | 'slides';
  selectedEmailContact?: Contact | null;
  showAllContacts: boolean;
  onToggleShowAllContacts: () => void;
  showDescription: boolean;
  onToggleDescription: () => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  isExpanded,
  onToggleExpand,
  isSelected,
  onToggleSelection,
  selectedContacts,
  onToggleContactSelection,
  companySelectionState,
  onCompanyCheckboxChange,
  shouldShowCompanyCheckbox,
  handleCompanyView,
  handleComprehensiveEmailSearch,
  pendingContactIds,
  pendingComprehensiveSearchIds,
  onContactClick,
  onContactHover,
  onContactLeave,
  shouldShowCheckbox,
  setLocation,
  sortedContacts,
  viewMode,
  selectedEmailContact,
  showAllContacts,
  onToggleShowAllContacts,
  showDescription,
  onToggleDescription
}) => {
  const checkboxRef = useRef<HTMLButtonElement>(null);
  
  // Handle indeterminate state for company checkbox
  useEffect(() => {
    if (checkboxRef.current && companySelectionState === 'indeterminate') {
      const input = checkboxRef.current.querySelector('input');
      if (input) {
        input.indeterminate = true;
      }
    }
  }, [companySelectionState]);
  return (
    <Card
      className={cn(
        "rounded-none md:rounded-lg transition-all duration-200 cursor-pointer",
        "bg-card hover:bg-card-hover hover:shadow-md hover:border-border",
        isSelected && "border-blue-400 dark:border-blue-600",
        !isSelected && "border-border"
      )}
    >
      {/* Company Header - Unified design based on slides view */}
      <div 
        onClick={onToggleExpand}
        className="p-3"
      >
        <div className="flex items-center">
          {/* Company checkbox with sliding animation */}
          <div className={cn("transition-all duration-300 ease-out overflow-hidden", shouldShowCompanyCheckbox ? "w-6 mr-1" : "w-0 mr-0")}>
            <Checkbox 
              ref={checkboxRef}
              checked={companySelectionState === 'checked' || companySelectionState === 'indeterminate'}
              onCheckedChange={onCompanyCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${company.name}`}
              className="mt-0.5"
            />
          </div>
          
          {/* Company Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-base leading-tight flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {company.name}
                  {company.description && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDescription();
                      }}
                      className={cn(
                        "p-0.5 rounded transition-all border relative",
                        "before:absolute before:inset-[-8px] before:content-['']",
                        showDescription 
                          ? "text-yellow-700 dark:text-yellow-500 bg-yellow-400/20 border-yellow-400/50" 
                          : "text-muted-foreground border-transparent hover:text-yellow-700 dark:hover:text-yellow-500 hover:bg-yellow-400/10 hover:border-yellow-400/30"
                      )}
                      aria-label="Show company description"
                      data-testid={`button-info-company-${company.id}`}
                    >
                      <ChevronDown className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        showDescription && "rotate-180"
                      )} />
                    </button>
                  )}
                </h3>
                
                {showDescription && company.description && (
                  <div 
                    className="mt-1.5 p-2 bg-muted/50 rounded-md text-sm text-muted-foreground leading-relaxed"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`text-description-company-${company.id}`}
                  >
                    {company.description}
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-1">
                  {company.website && (
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">{company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    </a>
                  )}
                  {company.contacts && company.contacts.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{company.contacts.length} contacts</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Expansion indicator and actions - unified design */}
              <div className="flex items-center gap-2">
                {company.contacts && company.contacts.length > 0 && viewMode === 'scroll' && (
                  <Badge 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-accent-hover"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Badge>
                )}
                
                {/* Company action menu - unified design */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCompanyView(company)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contacts Section - Only visible when expanded */}
      {isExpanded && sortedContacts.length > 0 && (
        <CardContent className="pt-0 px-3 pb-3">
          <div className="border-t pt-2">
            <div className={cn(
              "space-y-1.5",
              showAllContacts && sortedContacts.length > 10 && 
              "max-h-[400px] overflow-y-auto pr-2"
            )}>
              {sortedContacts.map((contact, index) => (
                <div
                  key={`${company.id}-contact-${contact.id}`}
                  className={cn(
                    index > 2 && !showAllContacts && "hidden"
                  )}
                >
                  <ContactRow
                    contact={contact}
                    isSelected={selectedContacts.has(contact.id)}
                    onToggleSelection={(id) => onToggleContactSelection(null, id)}
                    onClick={() => onContactClick?.(contact, company)}
                    onHover={onContactHover}
                    onLeave={onContactLeave}
                    showCheckbox={shouldShowCheckbox?.(contact.id) ?? false}
                    isHighlighted={selectedEmailContact?.id === contact.id}
                    handleContactView={(contact) => {
                      const slug = contact.slug || contact.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
                      setLocation(`/p/${slug}/${contact.id}`);
                    }}
                    handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
                    pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
                  />
                </div>
              ))}
              
              {sortedContacts.length > 3 && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card toggle
                      onToggleShowAllContacts();
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-accent-hover transition-all py-2 rounded-md"
                  >
                    {showAllContacts 
                      ? "Show fewer contacts" 
                      : `+${sortedContacts.length - 3} more contacts available`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
      
      {/* No contacts message */}
      {isExpanded && sortedContacts.length === 0 && (
        <CardContent className="pt-0 px-4 pb-4">
          <div className="border-t pt-3">
            <div className="text-center py-4 text-sm text-muted-foreground">
              No contacts found for this company
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default function CompanyCards({ 
  companies, 
  handleCompanyView,
  handleComprehensiveEmailSearch,
  pendingContactIds,
  pendingComprehensiveSearchIds,
  onContactClick,
  onViewModeChange,
  selectedEmailContact,
  selectedContacts = new Set<number>(),
  onContactSelectionChange,
  getCompanySelectionState,
  onCompanySelectionChange,
  topActionsTrailing,
  onShowReport,
  onFindKeyEmails,
  isFindingEmails,
  query,
  onExtendSearch,
  isAuthenticated,
  onLoginRequired
}: CompanyCardsProps) {
  const [, setLocation] = useLocation();
  
  // State for view mode and current slide
  const [viewMode, setViewMode] = useState<'scroll' | 'slides'>('scroll');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  // State to track which company cards are expanded
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  // State to track which companies show all contacts (vs just top 3)
  const [expandedContactLists, setExpandedContactLists] = useState<Set<number>>(new Set());
  
  // State to track which companies have their description visible
  const [visibleDescriptions, setVisibleDescriptions] = useState<Set<number>>(new Set());
  
  // State to highlight navigation buttons
  const [highlightNavButtons, setHighlightNavButtons] = useState(false);
  
  // Checkbox visibility state for contacts
  const [hoveredContactId, setHoveredContactId] = useState<number | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [globalCheckboxMode, setGlobalCheckboxMode] = useState(false);
  
  // Checkbox visibility state for companies
  const [hoveredCompanyId, setHoveredCompanyId] = useState<number | null>(null);
  const [companyHoverTimer, setCompanyHoverTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Toggle expansion state for a company card
  const toggleCardExpansion = (companyId: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };
  
  // Toggle showing all contacts vs top 3 for a company
  const toggleContactListExpansion = (companyId: number) => {
    setExpandedContactLists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };
  
  // Toggle company description visibility
  const toggleDescriptionVisibility = (companyId: number) => {
    setVisibleDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };
  
  // Check if a company card is expanded
  const isCardExpanded = (companyId: number) => {
    // In slides view, always show companies expanded
    if (viewMode === 'slides') return true;
    // In scroll view, use the normal expansion state
    return expandedCards.has(companyId);
  };
  
  // Navigation functions for slides view (with infinite loop)
  const handlePrevSlide = () => {
    setCurrentSlideIndex(prev => prev > 0 ? prev - 1 : companies.length - 1);
  };
  
  const handleNextSlide = () => {
    setCurrentSlideIndex(prev => prev < companies.length - 1 ? prev + 1 : 0);
  };
  
  // Reset slide index when switching to slides view or when companies change
  useEffect(() => {
    if (viewMode === 'slides' && currentSlideIndex >= companies.length) {
      setCurrentSlideIndex(Math.max(0, companies.length - 1));
    }
  }, [companies.length, viewMode, currentSlideIndex]);
  
  // Wrapper for contact selection to stop propagation
  const toggleContactSelection = (e: React.MouseEvent | null, contactId: number) => {
    if (e) {
      e.stopPropagation();
    }
    if (onContactSelectionChange) {
      onContactSelectionChange(contactId);
      // Activate global checkbox mode after 0.5s when any contact is selected
      if (!globalCheckboxMode && !selectedContacts.has(contactId)) {
        setTimeout(() => setGlobalCheckboxMode(true), 500);
      }
    }
  };
  
  // Handle contact card hover
  const handleContactHover = (contactId: number) => {
    // Clear existing timer
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }
    
    // Set new timer for 1.5s
    const timer = setTimeout(() => {
      setHoveredContactId(contactId);
    }, 1500);
    
    setHoverTimer(timer);
  };
  
  // Handle contact card mouse leave
  const handleContactLeave = () => {
    // Clear timer
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    // Clear hovered contact
    setHoveredContactId(null);
  };
  
  // Handle contact card click - ONLY for email composer, NOT selection
  const handleContactCardClick = (contact: ContactWithCompanyInfo, company: Company) => {
    // Only trigger the email composer/drawer - no selection
    if (onContactClick) {
      onContactClick(contact, company);
    }
  };
  
  // Handle checkbox click for contact selection
  const handleContactCheckboxClick = (contactId: number) => {
    if (onContactSelectionChange) {
      onContactSelectionChange(contactId);
      // Activate global checkbox mode after 0.5s when selecting
      if (!globalCheckboxMode && !selectedContacts.has(contactId)) {
        setTimeout(() => setGlobalCheckboxMode(true), 500);
      }
    }
  };
  
  // Check if checkbox should be visible for a contact
  const shouldShowCheckbox = (contactId: number) => {
    // Always show on mobile/touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return true;
    
    // Show if: hovered OR selected OR global mode active
    return hoveredContactId === contactId || 
           selectedContacts.has(contactId) || 
           globalCheckboxMode;
  };
  
  // Set global checkbox mode based on whether any contacts are selected
  useEffect(() => {
    setGlobalCheckboxMode(selectedContacts.size > 0);
  }, [selectedContacts.size]);
  
  // Handle company card hover
  const handleCompanyHover = (companyId: number) => {
    // Clear existing timer
    if (companyHoverTimer) {
      clearTimeout(companyHoverTimer);
    }
    
    // Set new timer for 1.5s (same as contacts)
    const timer = setTimeout(() => {
      setHoveredCompanyId(companyId);
    }, 1500);
    
    setCompanyHoverTimer(timer);
  };
  
  // Handle company card mouse leave
  const handleCompanyLeave = () => {
    // Clear timer
    if (companyHoverTimer) {
      clearTimeout(companyHoverTimer);
      setCompanyHoverTimer(null);
    }
    // Clear hovered company
    setHoveredCompanyId(null);
  };
  
  // Check if company checkbox should be visible
  const shouldShowCompanyCheckbox = (companyId: number) => {
    // Always show on mobile/touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return true;
    
    // Show if: hovered OR has selected contacts OR global mode active
    const company = companies.find(c => c.id === companyId);
    if (!company) return false;
    
    const selectionState = getCompanySelectionState?.(company);
    return hoveredCompanyId === companyId || 
           selectionState !== 'unchecked' || 
           globalCheckboxMode;
  };
  
  // Memoized map of sorted contacts for each company - sort once, use everywhere
  const sortedContactsMap = useMemo(() => {
    const map = new Map<number, ContactWithCompanyInfo[]>();
    companies.forEach(company => {
      if (company.contacts && company.contacts.length > 0) {
        const sorted = [...company.contacts]
          .sort((a, b) => (b.probability || 0) - (a.probability || 0));
        map.set(company.id, sorted);
      }
    });
    return map;
  }, [companies]);
  
  // Auto-expand first company when new search results arrive
  useEffect(() => {
    if (companies.length > 0 && expandedCards.size === 0) {
      const firstCompany = companies[0];
      const sortedContacts = sortedContactsMap.get(firstCompany.id);
      
      if (sortedContacts && sortedContacts.length > 0) {
        console.log('Auto-expanding first company to show contacts:', firstCompany.name);
        setExpandedCards(new Set([firstCompany.id]));
      }
    }
  }, [companies, sortedContactsMap]);

  return (
    <div className="w-full space-y-1 bg-background">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between -mt-1 mb-2">
        <div className="flex items-center gap-2">
          {/* Master Checkbox - Always Visible with Three States */}
          {(() => {
            // Calculate total contacts
            const totalContacts = companies.reduce((acc, company) => 
              acc + (company.contacts?.length || 0), 0
            );
            const selectedCount = selectedContacts.size;
            
            // Determine checkbox state
            const isFullySelected = totalContacts > 0 && selectedCount === totalContacts;
            const isPartiallySelected = selectedCount > 0 && selectedCount < totalContacts;
            const isEmpty = selectedCount === 0;
            
            return (
              <button
                onClick={() => {
                  if (isFullySelected || isPartiallySelected) {
                    // Deselect all
                    const contactsToDeselect = Array.from(selectedContacts);
                    contactsToDeselect.forEach(id => {
                      onContactSelectionChange?.(id);
                    });
                  } else {
                    // Select all
                    companies.forEach(company => {
                      company.contacts?.forEach(contact => {
                        if (!selectedContacts.has(contact.id)) {
                          onContactSelectionChange?.(contact.id);
                        }
                      });
                    });
                  }
                }}
                className={cn(
                  "h-4 w-4 rounded-sm border ring-offset-background transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "ml-2 mr-2 flex items-center justify-center",
                  isFullySelected && "bg-primary border-primary",
                  isPartiallySelected && "border-primary bg-card",
                  isEmpty && "border-input bg-card hover:border-primary/50"
                )}
                aria-label={
                  isFullySelected ? "Deselect all contacts" :
                  isPartiallySelected ? `${selectedCount} of ${totalContacts} selected` :
                  "Select all contacts"
                }
                data-testid="checkbox-master-select-all"
              >
                {isFullySelected && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
                {isPartiallySelected && (
                  <Check className="h-2.5 w-2.5 text-primary" />
                )}
              </button>
            );
          })()}
          
          {/* Desktop: Selection Toolbar (positioned first) */}
          {topActionsTrailing && (
            <div className="hidden md:flex">
              {topActionsTrailing}
            </div>
          )}
          
          <div className="flex items-center gap-0.5 bg-muted/20 rounded-md p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewMode('scroll');
                onViewModeChange?.('scroll');
              }}
              className={cn(
                "px-2 h-6 text-[11px] font-medium transition-all",
                viewMode === 'scroll' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "hover:bg-muted-hover text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              <ScrollText className="h-3 w-3 mr-0.5" />
              Scroll
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewMode('slides');
                onViewModeChange?.('slides');
                // Highlight navigation buttons for 1 second
                setHighlightNavButtons(true);
                setTimeout(() => setHighlightNavButtons(false), 1000);
              }}
              className={cn(
                "px-2 h-6 text-[11px] font-medium transition-all",
                viewMode === 'slides' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "hover:bg-muted-hover text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              <Layers className="h-3 w-3 mr-0.5" />
              Slides
            </Button>
          </div>
          
          {onFindKeyEmails && (
            <FindKeyEmailsButton
              onSearch={onFindKeyEmails}
              isSearching={isFindingEmails}
            />
          )}
          
          {query && onExtendSearch && onLoginRequired && (
            <ExtendSearchButton
              query={query}
              currentResults={companies}
              onResultsExtended={onExtendSearch}
              isAuthenticated={isAuthenticated ?? false}
              onLoginRequired={onLoginRequired}
            />
          )}
          
          {onShowReport && (
            <button
              onClick={onShowReport}
              className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground hover:underline ml-2 transition-colors"
              data-testid="link-show-report"
            >
              Report
            </button>
          )}
        </div>
        
        {/* Slide Counter and Navigation for Slides View */}
        {viewMode === 'slides' && companies.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevSlide}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                highlightNavButtons ? "bg-primary/20 border-primary" : "border-muted-foreground/20"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-1">
              {currentSlideIndex + 1} of {companies.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextSlide}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                highlightNavButtons ? "bg-primary/20 border-primary" : "border-muted-foreground/20"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Companies Display */}
      {viewMode === 'scroll' ? (
        // Scroll View - Show all companies
        companies.map((company) => (
          <div
            key={`company-${company.id}`}
            onMouseEnter={() => handleCompanyHover(company.id)}
            onMouseLeave={() => handleCompanyLeave()}
          >
            <CompanyCard
              company={company}
              isExpanded={isCardExpanded(company.id)}
              onToggleExpand={() => toggleCardExpansion(company.id)}
              isSelected={false}
              onToggleSelection={() => {}}
              selectedContacts={selectedContacts}
              onToggleContactSelection={toggleContactSelection}
              companySelectionState={getCompanySelectionState?.(company)}
              onCompanyCheckboxChange={() => onCompanySelectionChange?.(company)}
              shouldShowCompanyCheckbox={shouldShowCompanyCheckbox(company.id)}
              handleCompanyView={handleCompanyView}
              handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
              pendingContactIds={pendingContactIds}
              pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
              onContactClick={handleContactCardClick}
              onContactHover={handleContactHover}
              onContactLeave={handleContactLeave}
              shouldShowCheckbox={shouldShowCheckbox}
              setLocation={setLocation}
              sortedContacts={sortedContactsMap.get(company.id) || []}
              viewMode={viewMode}
              selectedEmailContact={selectedEmailContact}
              showAllContacts={expandedContactLists.has(company.id)}
              onToggleShowAllContacts={() => toggleContactListExpansion(company.id)}
              showDescription={visibleDescriptions.has(company.id)}
              onToggleDescription={() => toggleDescriptionVisibility(company.id)}
            />
          </div>
        ))
      ) : (
        // Slides View - Show one company at a time
        companies.length > 0 && (
          <div
            onMouseEnter={() => handleCompanyHover(companies[currentSlideIndex].id)}
            onMouseLeave={() => handleCompanyLeave()}
          >
            <CompanyCard
              key={`company-${companies[currentSlideIndex].id}`}
              company={companies[currentSlideIndex]}
              isExpanded={isCardExpanded(companies[currentSlideIndex].id)}
              onToggleExpand={() => toggleCardExpansion(companies[currentSlideIndex].id)}
              isSelected={false}
              onToggleSelection={() => {}}
              selectedContacts={selectedContacts}
              onToggleContactSelection={toggleContactSelection}
              companySelectionState={getCompanySelectionState?.(companies[currentSlideIndex])}
              onCompanyCheckboxChange={() => onCompanySelectionChange?.(companies[currentSlideIndex])}
              shouldShowCompanyCheckbox={shouldShowCompanyCheckbox(companies[currentSlideIndex].id)}
              handleCompanyView={handleCompanyView}
              handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
              pendingContactIds={pendingContactIds}
              pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
              onContactClick={handleContactCardClick}
              onContactHover={handleContactHover}
              onContactLeave={handleContactLeave}
              shouldShowCheckbox={shouldShowCheckbox}
              setLocation={setLocation}
              sortedContacts={sortedContactsMap.get(companies[currentSlideIndex].id) || []}
              viewMode={viewMode}
              selectedEmailContact={selectedEmailContact}
              showAllContacts={expandedContactLists.has(companies[currentSlideIndex].id)}
              onToggleShowAllContacts={() => toggleContactListExpansion(companies[currentSlideIndex].id)}
              showDescription={visibleDescriptions.has(companies[currentSlideIndex].id)}
              onToggleDescription={() => toggleDescriptionVisibility(companies[currentSlideIndex].id)}
            />
          </div>
        )
      )}
    </div>
  );
}