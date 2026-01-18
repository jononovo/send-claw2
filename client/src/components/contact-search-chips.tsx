import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Settings2, Target, Users, Building, Crown, Check, Plus, X, Save, Edit2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ContactSearchConfig {
  enableCoreLeadership: boolean;
  enableDepartmentHeads: boolean;
  enableMiddleManagement: boolean;
  enableCustomSearch: boolean;
  customSearchTarget: string;
  enableCustomSearch2: boolean;
  customSearchTarget2: string;
}

interface ContactSearchChipsProps {
  config?: ContactSearchConfig;
  onConfigChange: (config: ContactSearchConfig) => void;
  disabled?: boolean;
  isSearching?: boolean;
  hasSearchResults?: boolean;
  inputHasChanged?: boolean;
}

function ContactSearchChips({ 
  config: propConfig,
  onConfigChange, 
  disabled = false,
  isSearching = false,
  hasSearchResults = false,
  inputHasChanged = false
}: ContactSearchChipsProps) {
  const [isCustomInputExpanded, setIsCustomInputExpanded] = useState(false);
  const [isCustomInput2Expanded, setIsCustomInput2Expanded] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const [customInput2Value, setCustomInput2Value] = useState("");
  const [originalCustomTarget, setOriginalCustomTarget] = useState("");
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const mobileExpandTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize from prop or localStorage
  const [config, setConfig] = useState<ContactSearchConfig>(() => {
    if (propConfig) {
      return propConfig;
    }
    const savedConfig = localStorage.getItem('contactSearchConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        return {
          enableCoreLeadership: true,
          enableDepartmentHeads: false,
          enableMiddleManagement: false,
          enableCustomSearch: false,
          customSearchTarget: "",
          enableCustomSearch2: false,
          customSearchTarget2: "",
          ...parsed
        };
      } catch (error) {
        console.error('Error loading saved contact search config:', error);
      }
    }
    return {
      enableCoreLeadership: true,
      enableDepartmentHeads: false,
      enableMiddleManagement: false,
      enableCustomSearch: false,
      customSearchTarget: "",
      enableCustomSearch2: false,
      customSearchTarget2: ""
    };
  });

  // Sync with prop config when it changes
  useEffect(() => {
    if (propConfig) {
      setConfig(propConfig);
      setCustomInputValue(propConfig.customSearchTarget || "");
      setCustomInput2Value(propConfig.customSearchTarget2 || "");
    }
  }, [propConfig]);

  // Save config to localStorage (parent notification happens in updateConfig)
  useEffect(() => {
    localStorage.setItem('contactSearchConfig', JSON.stringify(config));
  }, [config]);

  // Cleanup mobile timer on unmount
  useEffect(() => {
    return () => {
      if (mobileExpandTimerRef.current) {
        clearTimeout(mobileExpandTimerRef.current);
      }
    };
  }, []);

  const updateConfig = (updates: Partial<ContactSearchConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      // Notify parent of config change (triggers auto-hide timer)
      onConfigChange(newConfig);
      return newConfig;
    });
  };

  // Mobile click handler for expanded/compressed behavior
  const handleMobileChipClick = (normalClickHandler: () => void) => {
    const isMobile = window.innerWidth < 768; // md breakpoint
    
    if (!isMobile) {
      normalClickHandler();
      return;
    }
    
    if (!isMobileExpanded) {
      // First tap - expand all chips
      setIsMobileExpanded(true);
      
      // Auto-collapse after 5 seconds
      if (mobileExpandTimerRef.current) clearTimeout(mobileExpandTimerRef.current);
      mobileExpandTimerRef.current = setTimeout(() => {
        setIsMobileExpanded(false);
      }, 5000);
    } else {
      // Already expanded - normal behavior
      normalClickHandler();
    }
  };

  const handleCustomInputSave = () => {
    const trimmedValue = customInputValue.trim();
    updateConfig({ 
      customSearchTarget: trimmedValue,
      enableCustomSearch: trimmedValue ? config.enableCustomSearch : false
    });
    // Always close the input after saving, whether empty or not
    setIsCustomInputExpanded(false);
    // If empty, reset the input value
    if (!trimmedValue) {
      setCustomInputValue("");
    }
  };

  const handleCustomInputExpand = () => {
    setIsCustomInputExpanded(true);
    setCustomInputValue(config.customSearchTarget);
  };

  const toggleCustomSearch = () => {
    if (config.customSearchTarget.trim()) {
      if (config.enableCustomSearch) {
        // Disable current custom search
        updateConfig({ enableCustomSearch: false });
      } else {
        // Enable this custom search, disable all others
        updateConfig({ 
          enableCoreLeadership: false,
          enableDepartmentHeads: false,
          enableMiddleManagement: false,
          enableCustomSearch: true,
          enableCustomSearch2: false
        });
      }
    } else {
      setIsCustomInputExpanded(true);
    }
  };

  const handleCustomInput2Save = () => {
    const trimmedValue = customInput2Value.trim();
    updateConfig({ 
      customSearchTarget2: trimmedValue,
      enableCustomSearch2: trimmedValue ? config.enableCustomSearch2 : false
    });
    // Always close the input after saving, whether empty or not
    setIsCustomInput2Expanded(false);
    // If empty, reset the input value
    if (!trimmedValue) {
      setCustomInput2Value("");
    }
  };

  const handleCustomInput2Expand = () => {
    // First, save and close the first input if it's expanded
    if (isCustomInputExpanded) {
      handleCustomInputSave();
    }
    setIsCustomInput2Expanded(true);
    setCustomInput2Value(config.customSearchTarget2);
  };

  const toggleCustomSearch2 = () => {
    if (config.customSearchTarget2.trim()) {
      if (config.enableCustomSearch2) {
        // Disable current custom search
        updateConfig({ enableCustomSearch2: false });
      } else {
        // Enable this custom search, disable all others
        updateConfig({ 
          enableCoreLeadership: false,
          enableDepartmentHeads: false,
          enableMiddleManagement: false,
          enableCustomSearch: false,
          enableCustomSearch2: true
        });
      }
    } else {
      setIsCustomInput2Expanded(true);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {/* Core Leadership Chip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleMobileChipClick(() => updateConfig({ 
                enableCoreLeadership: !config.enableCoreLeadership,
                enableDepartmentHeads: false,
                enableMiddleManagement: false,
                enableCustomSearch: false,
                enableCustomSearch2: false
              }))}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                md:gap-2 gap-1 md:px-3 px-2
                ${!isMobileExpanded ? 
                  `max-md:justify-center ${
                    config.enableCoreLeadership 
                      ? 'max-md:min-w-16 max-md:px-2'  // Oblong for selected (checkmark + icon)
                      : 'max-md:w-10 max-md:h-10 max-md:px-0'  // Circle for unselected (icon only)
                  }` 
                  : ''
                }
                ${config.enableCoreLeadership 
                  ? (hasSearchResults && !inputHasChanged)
                    ? 'bg-muted text-muted-foreground hover:bg-muted-hover'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {config.enableCoreLeadership && <Check className="h-3 w-3" />}
              <Crown className="h-3 w-3" />
              <span className={`text-sm font-medium ${!isMobileExpanded ? 'max-md:hidden' : ''}`}>Leadership</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>CEO, CTO, Founders, C-level executives</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Department Heads Chip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleMobileChipClick(() => updateConfig({ 
                enableCoreLeadership: false,
                enableDepartmentHeads: !config.enableDepartmentHeads,
                enableMiddleManagement: false,
                enableCustomSearch: false,
                enableCustomSearch2: false
              }))}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                md:gap-2 gap-1 md:px-3 px-2
                ${!isMobileExpanded ? 
                  `max-md:justify-center ${
                    config.enableDepartmentHeads 
                      ? 'max-md:min-w-16 max-md:px-2'  // Oblong for selected (checkmark + icon)
                      : 'max-md:w-10 max-md:h-10 max-md:px-0'  // Circle for unselected (icon only)
                  }` 
                  : ''
                }
                ${config.enableDepartmentHeads 
                  ? (hasSearchResults && !inputHasChanged)
                    ? 'bg-muted text-muted-foreground hover:bg-muted-hover'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {config.enableDepartmentHeads && <Check className="h-3 w-3" />}
              <Building className="h-3 w-3" />
              <span className={`text-sm font-medium ${!isMobileExpanded ? 'max-md:hidden' : ''}`}>Marketing</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>CMO, VP Marketing, Marketing Directors, Growth Leaders</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Middle Management Chip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleMobileChipClick(() => updateConfig({ 
                enableCoreLeadership: false,
                enableDepartmentHeads: false,
                enableMiddleManagement: !config.enableMiddleManagement,
                enableCustomSearch: false,
                enableCustomSearch2: false
              }))}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                md:gap-2 gap-1 md:px-3 px-2
                ${!isMobileExpanded ? 
                  `max-md:justify-center ${
                    config.enableMiddleManagement 
                      ? 'max-md:min-w-16 max-md:px-2'  // Oblong for selected (checkmark + icon)
                      : 'max-md:w-10 max-md:h-10 max-md:px-0'  // Circle for unselected (icon only)
                  }` 
                  : ''
                }
                ${config.enableMiddleManagement 
                  ? (hasSearchResults && !inputHasChanged)
                    ? 'bg-muted text-muted-foreground hover:bg-muted-hover'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {config.enableMiddleManagement && <Check className="h-3 w-3" />}
              <Users className="h-3 w-3" />
              <span className={`text-sm font-medium ${!isMobileExpanded ? 'max-md:hidden' : ''}`}>CTO</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Chief Technology Officer, VP Engineering, Technical Leaders</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Custom Search Chip */}
      {!isCustomInputExpanded && !config.customSearchTarget.trim() && (
        <button
          onClick={() => handleMobileChipClick(handleCustomInputExpand)}
          disabled={disabled}
          className={`
            flex items-center justify-center px-3 py-2 rounded-full border border-dashed border-border 
            text-muted-foreground hover:bg-muted-hover transition-all duration-200 min-w-[40px]
            max-md:w-10 max-md:h-10 max-md:px-0
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      {/* Custom Input Expanded */}
      {isCustomInputExpanded && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-purple-300 bg-purple-50">
          <Target className="h-3 w-3 text-purple-600" />
          <Input
            value={customInputValue}
            onChange={(e) => setCustomInputValue(e.target.value.slice(0, 22))}
            placeholder="e.g., Marketing Manager"
            disabled={disabled}
            maxLength={22}
            className="h-6 text-sm border-none bg-transparent p-0 focus:ring-0 focus:outline-none min-w-[200px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomInputSave();
              }
              if (e.key === 'Escape') {
                setIsCustomInputExpanded(false);
                setCustomInputValue(config.customSearchTarget);
              }
            }}
            onBlur={() => {
              // If input is empty, close the edit mode and revert to previous state
              if (!customInputValue.trim()) {
                setIsCustomInputExpanded(false);
                setCustomInputValue(config.customSearchTarget);
              }
            }}
            autoFocus
          />
          <button
            onClick={handleCustomInputSave}
            disabled={disabled}
            className="text-purple-600 hover:text-purple-700"
          >
            <Save className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              updateConfig({ 
                customSearchTarget: "",
                enableCustomSearch: false
              });
              setIsCustomInputExpanded(false);
              setCustomInputValue("");
            }}
            disabled={disabled}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Saved Custom Search Chip */}
      {config.customSearchTarget.trim() && !isCustomInputExpanded && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleMobileChipClick(toggleCustomSearch)}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                  md:gap-2 gap-1 md:px-3 px-2
                  ${!isMobileExpanded ? 
                    `max-md:justify-center ${
                      // Custom chips are oblong when they have content (text to display)
                      config.customSearchTarget.trim() 
                        ? 'max-md:min-w-16 max-md:px-2'  // Oblong for chips with content
                        : 'max-md:w-10 max-md:h-10 max-md:px-0'  // Circle for empty state
                    }` 
                    : ''
                  }
                  ${config.enableCustomSearch 
                    ? (hasSearchResults && !inputHasChanged)
                      ? 'bg-muted text-muted-foreground hover:bg-muted-hover'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {config.enableCustomSearch && <Check className="h-3 w-3" />}
                <Target className="h-3 w-3" />
                <span className={`text-sm font-medium ${!isMobileExpanded ? 'max-md:hidden' : ''}`}>{config.customSearchTarget}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCustomInputExpand();
                  }}
                  className="ml-1 text-muted-foreground/60 hover:text-muted-foreground cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCustomInputExpand();
                    }
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Boost scores for {config.customSearchTarget} roles</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Second Custom Search Chip - Empty State */}
      {!isCustomInput2Expanded && !config.customSearchTarget2.trim() && config.customSearchTarget.trim() && (
        <button
          onClick={() => handleMobileChipClick(handleCustomInput2Expand)}
          disabled={disabled}
          className={`
            flex items-center justify-center px-3 py-2 rounded-full border border-dashed border-border 
            text-muted-foreground hover:bg-muted-hover transition-all duration-200 min-w-[40px]
            max-md:w-10 max-md:h-10 max-md:px-0
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      {/* Second Custom Input Expanded */}
      {isCustomInput2Expanded && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-purple-300 bg-purple-50">
          <input
            type="text"
            value={customInput2Value}
            onChange={(e) => setCustomInput2Value(e.target.value.slice(0, 22))}
            placeholder="e.g., Sales Director"
            disabled={disabled}
            maxLength={22}
            className="h-6 text-sm border-none bg-transparent p-0 focus:ring-0 focus:outline-none min-w-[200px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomInput2Save();
              }
              if (e.key === 'Escape') {
                setIsCustomInput2Expanded(false);
                setCustomInput2Value(config.customSearchTarget2);
              }
            }}
            onBlur={() => {
              // If input is empty, close the edit mode and revert to previous state
              if (!customInput2Value.trim()) {
                setIsCustomInput2Expanded(false);
                setCustomInput2Value(config.customSearchTarget2);
              }
            }}
            autoFocus
          />
          <button
            onClick={handleCustomInput2Save}
            disabled={disabled}
            className="text-purple-600 hover:text-purple-700"
          >
            <Save className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              updateConfig({ 
                customSearchTarget2: "",
                enableCustomSearch2: false
              });
              setIsCustomInput2Expanded(false);
              setCustomInput2Value("");
            }}
            disabled={disabled}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Saved Second Custom Search Chip */}
      {config.customSearchTarget2.trim() && !isCustomInput2Expanded && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleMobileChipClick(toggleCustomSearch2)}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                  md:gap-2 gap-1 md:px-3 px-2
                  ${!isMobileExpanded ? 
                    `max-md:justify-center ${
                      // Custom chips are oblong when they have content (text to display)
                      config.customSearchTarget2.trim() 
                        ? 'max-md:min-w-16 max-md:px-2'  // Oblong for chips with content
                        : 'max-md:w-10 max-md:h-10 max-md:px-0'  // Circle for empty state
                    }` 
                    : ''
                  }
                  ${config.enableCustomSearch2 
                    ? (hasSearchResults && !inputHasChanged)
                      ? 'bg-muted text-muted-foreground hover:bg-muted-hover'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {config.enableCustomSearch2 && <Check className="h-3 w-3" />}
                <Target className="h-3 w-3" />
                <span className={`text-sm font-medium ${!isMobileExpanded ? 'max-md:hidden' : ''}`}>{config.customSearchTarget2}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCustomInput2Expand();
                  }}
                  className="ml-1 text-muted-foreground/60 hover:text-muted-foreground cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCustomInput2Expand();
                    }
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Boost scores for {config.customSearchTarget2} roles</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default React.memo(ContactSearchChips);