import React, { useState } from "react";
import { Building2, Users, Mail, ChevronDown, UserSearch, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SearchType = "companies" | "contacts" | "emails" | "individual_search" | "super_search_fast" | "super_search_deep";

export interface SearchTypeConfig {
  type: SearchType;
  label: string;
  icons: React.ReactNode[];
  estimatedTime: string;
  creditCost: number;
}

interface SearchTypeSelectorProps {
  selectedType: SearchType;
  onTypeChange: (type: SearchType) => void;
  disabled?: boolean;
}

const searchTypeConfigs: SearchTypeConfig[] = [
  {
    type: "companies",
    label: "Only Companies",
    icons: [<Building2 key="company" className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px]" />],
    estimatedTime: "7 seconds",
    creditCost: 10
  },
  {
    type: "contacts",
    label: "+ Contacts",
    icons: [
      <Building2 key="company" className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px]" />,
      <Users key="contacts" className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px]" />
    ],
    estimatedTime: "12 seconds",
    creditCost: 70
  },
  {
    type: "emails",
    label: "+ Emails",
    icons: [
      <Building2 key="company" className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px]" />,
      <Users key="contacts" className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px]" />,
      <Mail key="emails" className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px]" />
    ],
    estimatedTime: "22 seconds",
    creditCost: 160
  },
  {
    type: "individual_search",
    label: "Find Individual",
    icons: [<UserSearch key="individual-search" className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px]" />],
    estimatedTime: "18 seconds",
    creditCost: 100
  },
  {
    type: "super_search_fast",
    label: "Super Search (Fast)",
    icons: [<Sparkles key="super-search-fast" className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px]" />],
    estimatedTime: "30 seconds",
    creditCost: 250
  },
  {
    type: "super_search_deep",
    label: "Super Search (Deep)",
    icons: [<Sparkles key="super-search-deep" className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px]" />],
    estimatedTime: "90 seconds",
    creditCost: 250
  }
];

export function SearchTypeSelector({ selectedType, onTypeChange, disabled = false }: SearchTypeSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedConfig = searchTypeConfigs.find(config => config.type === selectedType) || searchTypeConfigs[2];

  const handleTypeSelect = (type: SearchType) => {
    onTypeChange(type);
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Search Type Icons in Input Field */}
      <div 
        data-testid="search-options-button"
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted-hover rounded transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => !disabled && setIsModalOpen(true)}
      >
        {selectedConfig.icons.map((icon, index) => (
          <div key={index} className="text-muted-foreground">
            {icon}
          </div>
        ))}
        <ChevronDown className="h-3 w-3 md:h-[14px] md:w-[14px] lg:h-[18px] lg:w-[18px] text-muted-foreground" />
      </div>

      {/* Search Type Selection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Select Your Search Type</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {searchTypeConfigs.map((config) => (
              <div
                key={config.type}
                data-testid={`search-type-option-${config.type}`}
                className={`flex items-center justify-between py-2 px-3 rounded-lg border cursor-pointer transition-all ${
                  selectedType === config.type 
                    ? 'border-accent/30 bg-accent-hover hover:bg-accent-active' 
                    : 'border-border bg-muted hover:bg-muted-hover'
                }`}
                onClick={() => handleTypeSelect(config.type)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {config.icons.map((icon, index) => (
                      <div key={index} className={`${
                        selectedType === config.type ? 'text-accent' : 'text-muted-foreground'
                      }`}>
                        {icon}
                      </div>
                    ))}
                  </div>
                  <span className={`text-base font-medium ${
                    selectedType === config.type ? 'text-accent' : 'text-foreground'
                  }`}>
                    {config.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground font-mono">
                    ~{config.estimatedTime}
                  </span>
                  <div className="text-[10px] text-muted-foreground/70">
                    {config.creditCost} credits
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SearchTypeSelector;