import { X, Mail, ChevronLeft, ChevronRight, Megaphone, Minus, Maximize2, Minimize2 } from "lucide-react";
import { EmailComposer } from "@/components/email-composer";
import type { EmailDrawerProps } from "./types";

export function EmailDrawer({
  open,
  mode,
  viewState,
  selectedContact,
  selectedCompany,
  selectedCompanyContacts,
  width,
  isResizing,
  currentListId,
  currentQuery,
  emailSubject,
  onClose,
  onModeChange,
  onContactChange,
  onResizeStart,
  onMinimize,
  onExpand,
  onRestore,
}: EmailDrawerProps) {
  if (!open) return null;

  const handlePrevContact = () => {
    const currentIndex = selectedCompanyContacts.findIndex(c => c.id === selectedContact?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : selectedCompanyContacts.length - 1;
    onContactChange(selectedCompanyContacts[prevIndex]);
  };

  const handleNextContact = () => {
    const currentIndex = selectedCompanyContacts.findIndex(c => c.id === selectedContact?.id);
    const nextIndex = currentIndex < selectedCompanyContacts.length - 1 ? currentIndex + 1 : 0;
    onContactChange(selectedCompanyContacts[nextIndex]);
  };

  const getCurrentContactIndex = () => {
    return selectedCompanyContacts.findIndex(c => c.id === selectedContact?.id) + 1;
  };

  const renderWindowControls = () => (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onMinimize}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Minimize"
        data-testid="button-minimize-drawer"
      >
        <Minus className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
      </button>
      <button
        onClick={viewState === 'expanded' ? onRestore : onExpand}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={viewState === 'expanded' ? "Restore" : "Expand"}
        data-testid="button-expand-drawer"
      >
        {viewState === 'expanded' ? (
          <Minimize2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      <button
        onClick={onClose}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Close email panel"
        data-testid="button-close-drawer"
      >
        <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );

  const renderHeader = () => (
    <div className="sticky top-0 bg-panel-background px-4 py-1.5 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onModeChange('compose')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors group ${
              mode === 'compose'
                ? 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
            }`}
            data-testid="button-compose-tab"
          >
            <Mail className={`h-3.5 w-3.5 transition-colors ${
              mode === 'compose' 
                ? 'text-muted-foreground group-hover:text-primary' 
                : ''
            }`} />
            Compose
          </button>
          <button
            onClick={() => onModeChange('campaign')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors group ${
              mode === 'campaign'
                ? 'bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted'
            }`}
            data-testid="button-campaign-tab"
          >
            <Megaphone className={`h-3.5 w-3.5 transition-colors ${
              mode === 'campaign' 
                ? 'text-muted-foreground group-hover:text-primary' 
                : ''
            }`} />
            Campaign
          </button>
        </div>
        {renderWindowControls()}
      </div>
      
      {mode === 'compose' && selectedContact && (
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-sm truncate flex-1 min-w-0" data-testid="text-contact-info">
            <span className="font-medium">{selectedContact.name}</span>
            <span className="text-xs text-muted-foreground"> • {selectedCompany?.name}</span>
          </p>
          
          {selectedCompanyContacts.length > 1 && (
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button
                onClick={handlePrevContact}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="button-prev-contact"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground" data-testid="text-contact-count">
                {getCurrentContactIndex()} / {selectedCompanyContacts.length}
              </span>
              <button
                onClick={handleNextContact}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="button-next-contact"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const getMinimizedLabel = () => {
    if (mode === 'campaign') return 'New Campaign';
    if (emailSubject && emailSubject.trim()) {
      return emailSubject.length > 30 ? emailSubject.substring(0, 30) + '...' : emailSubject;
    }
    return 'New Message';
  };

  const renderMinimizedBar = () => (
    <div 
      className="fixed bottom-0 right-16 z-50 bg-panel-background border border-b-0 rounded-t-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
      onClick={onRestore}
      data-testid="minimized-drawer-bar"
    >
      <div className="flex items-center justify-between min-w-[280px] px-3 py-1.5">
        <span className="text-sm font-medium truncate max-w-[200px] text-foreground">
          {getMinimizedLabel()}
        </span>
        <div className="flex items-center gap-0.5 ml-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Restore"
            data-testid="button-restore-minimized"
          >
            <Maximize2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
            data-testid="button-close-minimized"
          >
            <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderExpandedView = () => (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onRestore}
        data-testid="expanded-drawer-backdrop"
      />
      <div 
        className="fixed top-[5%] left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl h-[90vh] bg-panel-background border rounded-lg shadow-2xl overflow-hidden"
        data-testid="expanded-drawer"
      >
        <div className="h-full overflow-y-auto pb-2">
          {renderHeader()}
          <div className="px-4 pt-4 pb-2">
            <EmailComposer
              selectedContact={selectedContact}
              selectedCompany={selectedCompany}
              onContactChange={onContactChange}
              drawerMode={mode}
              currentListId={currentListId}
              currentQuery={currentQuery}
              isExpanded={true}
            />
          </div>
        </div>
      </div>
    </>
  );

  if (viewState === 'minimized') {
    return renderMinimizedBar();
  }

  if (viewState === 'expanded') {
    return renderExpandedView();
  }

  return (
    <>
      <div 
        className={`duplicate-full-height-drawer-to-keep-column-aligned ${
          open ? 'hidden md:block md:relative md:h-full' : 'hidden md:block md:relative w-0'
        }`} 
        style={{ ...(open && typeof window !== 'undefined' && window.innerWidth >= 768 ? { width: `${width}px` } : {}) }}
      >
        <div 
          className={`${!isResizing ? 'email-drawer-transition' : ''} ${
            open 
              ? 'fixed md:absolute top-[2.5rem] md:top-0 right-0 bottom-auto max-h-[calc(100vh-2.5rem)] md:max-h-screen w-[90%] sm:w-[400px] z-50' 
              : 'fixed md:absolute w-0 right-0 top-0'
          } overflow-hidden border-l border-t border-b rounded-tl-lg rounded-bl-lg bg-panel-background shadow-xl`} 
          style={{ 
            ...(open && typeof window !== 'undefined' && window.innerWidth >= 768 ? { width: `${width}px` } : {}),
            ...(isResizing ? { transition: 'none' } : {})
          }}
          data-testid="drawer-email"
        >
          {open && (
            <div
              onMouseDown={onResizeStart}
              className="hidden md:block absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 group"
              data-testid="handle-resize"
            >
              <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-12 bg-muted-foreground/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
          
          <div className="overflow-y-auto max-h-[calc(100vh-2.5rem)] md:max-h-screen pb-2" style={{ minWidth: open ? '320px' : '0' }}>
            {renderHeader()}
            
            <div className="px-4 pt-4 pb-2">
              <EmailComposer
                selectedContact={selectedContact}
                selectedCompany={selectedCompany}
                onContactChange={onContactChange}
                drawerMode={mode}
                currentListId={currentListId}
                currentQuery={currentQuery}
              />
            </div>
          </div>
        </div>
      </div>

      <div 
        className={`md:hidden email-drawer-transition ${
          open 
            ? 'fixed bottom-0 right-0 h-[98vh] w-full z-50' 
            : 'fixed w-0 right-0 bottom-0'
        } overflow-hidden border-t rounded-t-lg bg-background shadow-xl flex flex-col`}
      >
        {open && (
          <>
            <div className="flex-none">
              {renderHeader()}
            </div>
            
            <div className="flex-1 min-h-0 overflow-hidden px-2 py-3">
              <EmailComposer
                selectedContact={selectedContact}
                selectedCompany={selectedCompany}
                onContactChange={onContactChange}
                drawerMode={mode}
                currentListId={currentListId}
                currentQuery={currentQuery}
                isMobile={true}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
