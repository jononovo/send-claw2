import { useState } from "react";
import { X, Settings, Target, Search, Brain } from "lucide-react";
import { SearchQueueManager } from "./SearchQueueManager";
import { CampaignIntegration } from "./CampaignIntegration";
import { SearchSettings } from "./SearchSettings";
import { AISearchTab } from "./AISearchTab";

export type SearchDrawerTab = 'queue' | 'campaign' | 'settings' | 'ai-search';

export interface SearchManagementDrawerProps {
  open: boolean;
  width: number;
  isResizing: boolean;
  onClose: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onTrainAI?: () => void;
  hasSearchResults?: boolean;
}

export function SearchManagementDrawer({
  open,
  width,
  isResizing,
  onClose,
  onResizeStart,
  onTrainAI = () => {},
  hasSearchResults = false,
}: SearchManagementDrawerProps) {
  const [activeTab, setActiveTab] = useState<SearchDrawerTab>('queue');

  if (!open) return null;

  const renderHeader = () => (
    <div className="sticky top-0 bg-panel-background px-4 py-1.5 z-10">
      {/* Top row - Tabs and close */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Queue Tab */}
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors group ${
              activeTab === 'queue'
                ? 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
            }`}
            data-testid="button-queue-tab"
          >
            <Search className={`h-3.5 w-3.5 transition-colors ${
              activeTab === 'queue' 
                ? 'text-muted-foreground group-hover:text-primary' 
                : ''
            }`} />
            Queue
            <span className="ml-1 px-1 py-0.5 text-[10px] bg-muted rounded">
              2
            </span>
          </button>
          
          {/* Campaign Tab */}
          <button
            onClick={() => setActiveTab('campaign')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors group ${
              activeTab === 'campaign'
                ? 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
            }`}
            data-testid="button-campaign-tab"
          >
            <Target className={`h-3.5 w-3.5 transition-colors ${
              activeTab === 'campaign' 
                ? 'text-muted-foreground group-hover:text-primary' 
                : ''
            }`} />
            Campaign
          </button>
          
          {/* Settings Tab */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors group ${
              activeTab === 'settings'
                ? 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
            }`}
            data-testid="button-settings-tab"
          >
            <Settings className={`h-3.5 w-3.5 transition-colors ${
              activeTab === 'settings' 
                ? 'text-muted-foreground group-hover:text-primary' 
                : ''
            }`} />
            Settings
          </button>
          
          {/* AI Search Tab */}
          <button
            onClick={() => setActiveTab('ai-search')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors group ${
              activeTab === 'ai-search'
                ? 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
            }`}
            data-testid="button-ai-search-tab"
          >
            <Brain className={`h-3.5 w-3.5 transition-colors ${
              activeTab === 'ai-search' 
                ? 'text-muted-foreground group-hover:text-primary' 
                : ''
            }`} />
            AI Search
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close search management"
          data-testid="button-close-drawer"
        >
          <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
      
      {/* Header subtitle based on active tab */}
      <div className="mt-0.5">
        <p className="text-xs text-muted-foreground">
          {activeTab === 'queue' && 'Manage your search queue and priorities'}
          {activeTab === 'campaign' && 'Link searches to campaigns for automation'}
          {activeTab === 'settings' && 'Configure search management preferences'}
          {activeTab === 'ai-search' && 'Train AI on your search results to improve targeting'}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet: Fixed positioned drawer without wrapper (overlay behavior) */}
      <div 
        className={`hidden md:block ${!isResizing ? 'search-drawer-transition' : ''} ${
          open 
            ? 'fixed top-[2.5rem] right-0 bottom-auto max-h-[calc(100vh-2.5rem)] w-[90%] sm:w-[400px] z-40' 
            : 'fixed w-0 right-0 top-[2.5rem]'
        } overflow-hidden border-l border-t border-b rounded-tl-lg rounded-bl-lg bg-panel-background shadow-xl`} 
        style={{ 
          ...(open && typeof window !== 'undefined' && window.innerWidth >= 768 ? { width: `${width}px` } : {}),
          ...(isResizing ? { transition: 'none' } : {})
        }}
        data-testid="drawer-search-management"
      >
        {/* Resize Handle - Only show on desktop */}
        {open && (
          <div
            onMouseDown={onResizeStart}
            className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 group"
            data-testid="handle-resize"
          >
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-12 bg-muted-foreground/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        
        {open && (
          <div className="overflow-y-auto max-h-[calc(100vh-2.5rem)] pb-4" style={{ minWidth: '400px' }}>
            {renderHeader()}
            
            {/* Tab Content */}
            <div className="p-4">
              {activeTab === 'queue' && <SearchQueueManager />}
              {activeTab === 'campaign' && <CampaignIntegration />}
              {activeTab === 'settings' && <SearchSettings />}
              {activeTab === 'ai-search' && (
                <AISearchTab 
                  onTrainAI={onTrainAI} 
                  hasSearchResults={hasSearchResults}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Separate drawer instance without wrapper since it's fixed positioned */}
      <div 
        className={`md:hidden search-drawer-transition ${
          open 
            ? 'fixed top-[2.5rem] right-0 bottom-auto max-h-[calc(100vh-2.5rem)] w-[90%] sm:w-[400px] z-40' 
            : 'fixed w-0 right-0 top-[2.5rem]'
        } overflow-hidden border-l border-t border-b rounded-tl-lg rounded-bl-lg bg-panel-background shadow-xl`}
      >
        {open && (
          <div className="overflow-y-auto max-h-[calc(100vh-2.5rem)]" style={{ minWidth: '400px' }}>
            <div className="flex flex-col min-h-full pb-24">
              {renderHeader()}
              
              {/* Tab Content for mobile */}
              <div className="p-4">
                {activeTab === 'queue' && <SearchQueueManager />}
                {activeTab === 'campaign' && <CampaignIntegration />}
                {activeTab === 'settings' && <SearchSettings />}
                {activeTab === 'ai-search' && (
                  <AISearchTab 
                    onTrainAI={onTrainAI} 
                    hasSearchResults={hasSearchResults}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}