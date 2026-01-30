import { useState } from 'react';
import { ProfileDropdown } from './ProfileDropdown';
import { ProfileModal } from './ProfileModal';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

// Type definitions
export type ContextType = 'sender' | 'customer' | 'product';

export interface ContextItem {
  id: number;
  userId?: number;
  displayName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  companyPosition?: string;
  companyName?: string;
  companyWebsite?: string;
  isDefault?: boolean | null;
  source?: 'registered' | 'gmail' | 'manual';
  gmailAccountEmail?: string;
  // Product-specific fields
  productService?: string | null;
  customerFeedback?: string | null;
  website?: string | null;
  // Allow for additional fields
  [key: string]: any;
}

interface PromptContextBuilderDropdownProps {
  // Core props
  contextType: ContextType;
  items: ContextItem[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  
  // UI customization
  triggerIcon: React.ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
  showTriggerLabel?: boolean; // Whether to show label text next to icon
  
  // Labels and text
  headerTitle?: string;
  headerDescription?: string;
  noneLabel?: string;
  noneDescription?: string;
  addNewLabel?: string;
  
  // Feature flags
  showNoneOption?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  allowAdd?: boolean;
  
  // Custom rendering
  renderItemContent?: (item: ContextItem) => React.ReactNode;
  
  // Additional features
  showSource?: boolean; // Show source indicators (Gmail, Registered, etc.)
  showPosition?: boolean; // Show position/company info
  
  // Callbacks
  onAfterAdd?: () => void;
  onAfterEdit?: () => void;
  onAfterDelete?: () => void;
  
  // Test ID prefix
  testIdPrefix?: string;
}

// Configuration for different context types
const contextConfigs: Record<ContextType, {
  apiEndpoint: string;
  queryKey: string[];
  deleteSuccessMessage: string;
  deleteErrorMessage: string;
}> = {
  sender: {
    apiEndpoint: '/api/sender-profiles',
    queryKey: ['/api/sender-profiles'],
    deleteSuccessMessage: 'Sender profile deleted successfully',
    deleteErrorMessage: 'Failed to delete sender profile'
  },
  customer: {
    apiEndpoint: '/api/customer-profiles',
    queryKey: ['/api/customer-profiles'],
    deleteSuccessMessage: 'Customer profile deleted successfully',
    deleteErrorMessage: 'Failed to delete customer profile'
  },
  product: {
    apiEndpoint: '/api/strategic-profiles',
    queryKey: ['/api/strategic-profiles'],
    deleteSuccessMessage: 'Product deleted successfully',
    deleteErrorMessage: 'Failed to delete product'
  }
};

export function PromptContextBuilderDropdown({
  contextType,
  items,
  selectedId,
  onSelect,
  triggerIcon,
  triggerClassName,
  contentClassName,
  showTriggerLabel = true,
  headerTitle,
  headerDescription,
  noneLabel = "None",
  noneDescription = "No selection",
  addNewLabel = "Add New",
  showNoneOption = true,
  allowEdit = true,
  allowDelete = true,
  allowAdd = true,
  renderItemContent,
  showSource = false,
  showPosition = false,
  onAfterAdd,
  onAfterEdit,
  onAfterDelete,
  testIdPrefix
}: PromptContextBuilderDropdownProps) {
  // State management
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContextItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ContextItem | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const config = contextConfigs[contextType];
  
  // Find the selected item from the list
  const selectedItem = items.find(item => item.id === selectedId);
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) =>
      apiRequest('DELETE', `${config.apiEndpoint}/${itemId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: config.deleteSuccessMessage
      });
      queryClient.invalidateQueries({ queryKey: config.queryKey });
      
      // If the deleted item was selected, clear the selection
      if (selectedId === itemToDelete?.id) {
        onSelect(null);
      }
      
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      onAfterDelete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || config.deleteErrorMessage,
        variant: "destructive"
      });
    }
  });
  
  // Handlers
  const handleAddNew = () => {
    setEditingItem(null);
    setModalOpen(true);
    setDropdownOpen(false);
  };
  
  const handleEdit = (item: ContextItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setModalOpen(true);
    setDropdownOpen(false);
  };
  
  const handleDeleteClick = (item: ContextItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
    setDeleteDialogOpen(true);
    setDropdownOpen(false);
  };
  
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };
  
  const handleModalSuccess = () => {
    setModalOpen(false);
    setEditingItem(null);
    queryClient.invalidateQueries({ queryKey: config.queryKey });
    if (editingItem) {
      onAfterEdit?.();
    } else {
      onAfterAdd?.();
    }
  };
  
  // Default render function for items
  const defaultRenderItem = (item: ContextItem) => {
    if (renderItemContent) {
      return renderItemContent(item);
    }
    
    // Default rendering for sender profiles
    if (contextType === 'sender') {
      return (
        <>
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{item.displayName}</span>
            {showSource && item.source === 'registered' && (
              <span className="text-xs text-muted-foreground">(Registered User)</span>
            )}
            {showSource && item.source === 'gmail' && (
              <span className="text-xs text-muted-foreground">(Gmail API)</span>
            )}
          </div>
          {showPosition && item.companyPosition && (
            <div className="text-muted-foreground truncate mt-0.5">
              {item.companyPosition} {item.companyName && `at ${item.companyName}`}
            </div>
          )}
        </>
      );
    }
    
    // Default rendering for products
    if (contextType === 'product') {
      return (
        <>
          <div className="font-medium truncate">
            {item.title || item.productService || 'Untitled Product'}
          </div>
          {item.productService && item.title !== item.productService && (
            <div className="text-muted-foreground truncate mt-0.5">
              {item.productService}
            </div>
          )}
        </>
      );
    }
    
    // Fallback rendering
    return (
      <div className="font-medium truncate">
        {item.displayName || item.title || item.name || 'Untitled'}
      </div>
    );
  };
  
  // Get trigger label based on selected item
  const getTriggerLabel = () => {
    if (!selectedItem) return undefined;
    
    if (contextType === 'sender') {
      return selectedItem.displayName;
    }
    if (contextType === 'product') {
      return selectedItem.title || selectedItem.productService || 'Product';
    }
    return selectedItem.displayName || selectedItem.title || selectedItem.name;
  };
  
  return (
    <>
      <ProfileDropdown
        items={items.map(item => ({
          ...item,
          isDefault: item.isDefault ?? undefined
        }))}
        selectedId={selectedId}
        onSelect={(item) => {
          onSelect(item ? item.id : null);
        }}
        triggerIcon={triggerIcon}
        triggerLabel={showTriggerLabel ? getTriggerLabel() : undefined}
        triggerClassName={cn(
          triggerClassName,
          selectedId !== null && selectedId !== undefined 
            ? "bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-700" 
            : "text-muted-foreground"
        )}
        contentClassName={contentClassName}
        headerIcon={triggerIcon}
        headerTitle={headerTitle || `Select ${contextType}`}
        headerDescription={headerDescription || `Choose a ${contextType} for context`}
        showNoneOption={showNoneOption}
        noneLabel={noneLabel}
        noneDescription={noneDescription}
        onAddNew={allowAdd ? handleAddNew : undefined}
        addNewLabel={addNewLabel}
        onEdit={allowEdit ? handleEdit : undefined}
        onDelete={allowDelete ? handleDeleteClick : undefined}
        renderItem={defaultRenderItem}
        isOpen={dropdownOpen}
        onOpenChange={setDropdownOpen}
        testIdPrefix={testIdPrefix || contextType}
      />
      
      {/* Profile Modal for Add/Edit */}
      {(allowAdd || allowEdit) && (
        <ProfileModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
          profileType={contextType}
          profile={editingItem}
          onSuccess={handleModalSuccess}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      {allowDelete && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {contextType === 'sender' ? 'Sender Profile' : contextType === 'product' ? 'Product' : 'Profile'}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{itemToDelete?.displayName || itemToDelete?.title || itemToDelete?.name}"? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}