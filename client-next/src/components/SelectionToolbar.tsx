import { Button } from "@/components/ui/button";
import { CheckSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContactList, Campaign, Contact } from "@shared/schema";

// Import extracted components
import { BulkAddDropdown } from "./selection-toolbar/BulkAddDropdown";
import { ListSelector } from "./selection-toolbar/ListSelector";
import { CampaignSelector } from "./selection-toolbar/CampaignSelector";

interface SelectionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  selectedContactIds: number[];
}

export function SelectionToolbar({ selectedCount, onClear, selectedContactIds }: SelectionToolbarProps) {
  const [showListSelector, setShowListSelector] = useState(false);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [listSelectorOpen, setListSelectorOpen] = useState(false);
  const [campaignSelectorOpen, setCampaignSelectorOpen] = useState(false);
  const [selectedContactList, setSelectedContactList] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const { toast } = useToast();
  
  // Confirmation dialog state
  const [confirmListDialogOpen, setConfirmListDialogOpen] = useState(false);
  const [confirmCampaignDialogOpen, setConfirmCampaignDialogOpen] = useState(false);
  const [pendingListId, setPendingListId] = useState<number | null>(null);
  const [pendingCampaignId, setPendingCampaignId] = useState<number | null>(null);
  const [invalidContactsCount, setInvalidContactsCount] = useState(0);
  
  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportData, setReportData] = useState<{
    totalSubmitted: number;
    noEmailError: number;
    duplicationError: number;
    otherListDuplicateError: number;
    successfullyAdded: number;
    operationType: 'list' | 'campaign';
  } | null>(null);
  
  // Log initial state for debugging
  useEffect(() => {
    console.log('[SelectionToolbar] Component mounted/updated:', {
      selectedCount,
      selectedContactIds,
      contactIdCount: selectedContactIds.length
    });
  }, [selectedCount, selectedContactIds]);


  // Fetch contact lists
  const { data: contactLists = [] } = useQuery<ContactList[]>({
    queryKey: ['/api/contact-lists'],
  });

  // Fetch active campaigns
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });
  
  // Filter to only show active campaigns
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  
  // Fetch contact details for selected IDs to check for emails
  const { data: selectedContacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts/bulk', selectedContactIds],
    queryFn: async () => {
      if (selectedContactIds.length === 0) return [];
      const response = await fetch('/api/contacts/bulk?' + new URLSearchParams({
        ids: selectedContactIds.join(',')
      }));
      if (!response.ok) {
        throw new Error('Failed to fetch contact details');
      }
      return response.json();
    },
    enabled: selectedContactIds.length > 0,
  });

  const addContactsMutation = useMutation({
    mutationFn: async ({ contactListId, contactIds }: { contactListId: number; contactIds: number[] }) => {
      console.log('[SelectionToolbar] Making API request to add contacts:', {
        contactListId,
        contactIds,
        endpoint: `/api/contact-lists/${contactListId}/contacts`
      });
      
      const response = await apiRequest(
        'POST',
        `/api/contact-lists/${contactListId}/contacts`,
        { contactIds }
      );
      const data = await response.json();
      console.log('[SelectionToolbar] API response:', data);
      return data;
    },
    onSuccess: (data, { contactListId }) => {
      console.log('[SelectionToolbar] Mutation succeeded:', { data, contactListId });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/contact-lists'] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${contactListId}/contacts`] });
      
      // Show report dialog with results
      setReportData({
        totalSubmitted: selectedContactIds.length,
        noEmailError: data.noEmailCount || 0,
        duplicationError: data.duplicateCount || 0,
        otherListDuplicateError: data.otherListDuplicateCount || 0,
        successfullyAdded: data.addedCount || 0,
        operationType: 'list'
      });
      setReportDialogOpen(true);
      
      // DON'T clear selections here - wait for report dialog to close
      // This keeps SelectionToolbar mounted so the dialog can be shown
      setShowListSelector(false);
      setSelectedContactList("");
      setPendingListId(null);
      setConfirmListDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('[SelectionToolbar] Mutation failed:', error);
      toast({
        title: "Error adding contacts",
        description: error.message || "Failed to add contacts to the list",
        variant: "destructive",
      });
    }
  });

  const addContactsToCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, contactIds }: { campaignId: number; contactIds: number[] }) => {
      console.log('[SelectionToolbar] Making API request to add contacts to campaign:', {
        campaignId,
        contactIds,
        endpoint: `/api/campaigns/${campaignId}/add-contacts`
      });
      
      const response = await apiRequest(
        'POST',
        `/api/campaigns/${campaignId}/add-contacts`,
        { contactIds }
      );
      const data = await response.json();
      console.log('[SelectionToolbar] Campaign API response:', data);
      return data;
    },
    onSuccess: (data, { campaignId }) => {
      console.log('[SelectionToolbar] Campaign mutation succeeded:', { data, campaignId });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}`] });
      
      // Show report dialog with results
      setReportData({
        totalSubmitted: selectedContactIds.length,
        noEmailError: data.noEmailCount || 0,
        duplicationError: data.duplicateCount || 0,
        otherListDuplicateError: 0, // Not applicable for campaigns
        successfullyAdded: data.addedCount || 0,
        operationType: 'campaign'
      });
      setReportDialogOpen(true);
      
      // DON'T clear selections here - wait for report dialog to close
      // This keeps SelectionToolbar mounted so the dialog can be shown
      setShowCampaignSelector(false);
      setSelectedCampaign("");
      setPendingCampaignId(null);
      setConfirmCampaignDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('[SelectionToolbar] Campaign mutation failed:', error);
      toast({
        title: "Error adding contacts to campaign",
        description: error.message || "Failed to add contacts to the campaign",
        variant: "destructive",
      });
    }
  });

  // Handle list selection - Show confirmation dialog
  useEffect(() => {
    if (selectedContactList && selectedContactList !== "") {
      const listId = parseInt(selectedContactList);
      console.log('[SelectionToolbar] Contact list selected:', {
        selectedContactList,
        listId,
        selectedContactIds,
        contactCount: selectedContactIds.length
      });
      
      if (!isNaN(listId) && selectedContactIds.length > 0) {
        // Calculate invalid contacts
        const invalidCount = selectedContacts.filter(c => !c.email).length;
        setInvalidContactsCount(invalidCount);
        setPendingListId(listId);
        setConfirmListDialogOpen(true);
        setShowListSelector(false); // Hide selector immediately
      } else if (selectedContactIds.length === 0) {
        console.warn('[SelectionToolbar] No contacts selected to add');
        toast({
          title: "No contacts selected",
          description: "Please select contacts before adding them to a list.",
          variant: "destructive",
        });
        setSelectedContactList("");
        setShowListSelector(false);
      }
    }
  }, [selectedContactList, selectedContactIds, selectedContacts, toast]);

  // Handle campaign selection - Show confirmation dialog
  useEffect(() => {
    if (selectedCampaign && selectedCampaign !== "") {
      const campaignId = parseInt(selectedCampaign);
      console.log('[SelectionToolbar] Campaign selected:', {
        selectedCampaign,
        campaignId,
        selectedContactIds,
        contactCount: selectedContactIds.length
      });
      
      if (!isNaN(campaignId) && selectedContactIds.length > 0) {
        // Calculate invalid contacts
        const invalidCount = selectedContacts.filter(c => !c.email).length;
        setInvalidContactsCount(invalidCount);
        setPendingCampaignId(campaignId);
        setConfirmCampaignDialogOpen(true);
        setShowCampaignSelector(false); // Hide selector immediately
      } else if (selectedContactIds.length === 0) {
        console.warn('[SelectionToolbar] No contacts selected to add to campaign');
        toast({
          title: "No contacts selected",
          description: "Please select contacts before adding them to a campaign.",
          variant: "destructive",
        });
        setSelectedCampaign("");
        setShowCampaignSelector(false);
      }
    }
  }, [selectedCampaign, selectedContactIds, selectedContacts, toast]);
  
  // Handlers for confirmation dialogs
  const handleConfirmAddToList = () => {
    if (pendingListId) {
      console.log('[SelectionToolbar] Confirmed adding to list');
      addContactsMutation.mutate({
        contactListId: pendingListId,
        contactIds: selectedContactIds,
      });
    }
    setConfirmListDialogOpen(false);
    setPendingListId(null);
    setSelectedContactList("");
  };
  
  const handleCancelAddToList = () => {
    setConfirmListDialogOpen(false);
    setPendingListId(null);
    setSelectedContactList("");
  };
  
  const handleConfirmAddToCampaign = () => {
    if (pendingCampaignId) {
      console.log('[SelectionToolbar] Confirmed adding to campaign');
      addContactsToCampaignMutation.mutate({
        campaignId: pendingCampaignId,
        contactIds: selectedContactIds,
      });
    }
    setConfirmCampaignDialogOpen(false);
    setPendingCampaignId(null);
    setSelectedCampaign("");
  };
  
  const handleCancelAddToCampaign = () => {
    setConfirmCampaignDialogOpen(false);
    setPendingCampaignId(null);
    setSelectedCampaign("");
  };

  // Get the Pipeline (default list) for quick add
  const pipelineList = contactLists.find(l => l.isDefault);
  
  // Handler for adding directly to Pipeline
  const handleAddToPipeline = () => {
    if (!pipelineList) {
      toast({
        title: "Pipeline not found",
        description: "Could not find your Pipeline. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedContactIds.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select contacts before adding them to Pipeline.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('[SelectionToolbar] Adding directly to Pipeline:', {
      pipelineId: pipelineList.id,
      contactIds: selectedContactIds
    });
    
    addContactsMutation.mutate({
      contactListId: pipelineList.id,
      contactIds: selectedContactIds,
    });
  };

  // Mobile: Fixed bottom toolbar
  // Desktop: Inline with top buttons
  const isMobile = window.innerWidth < 768;

  const toolbar = (
    <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-between px-4 py-2 bg-background border-t' : ''}`}>
      {showListSelector ? (
        <ListSelector
          value={selectedContactList}
          open={listSelectorOpen}
          contactLists={contactLists}
          onValueChange={(value) => {
            setSelectedContactList(value);
            setListSelectorOpen(false);
            setShowListSelector(false); // Hide selector after selection
          }}
          onOpenChange={(open) => {
            setListSelectorOpen(open);
            if (!open && !selectedContactList) {
              setShowListSelector(false); // Hide selector if closed without selection
            }
          }}
        />
      ) : showCampaignSelector ? (
        <CampaignSelector
          value={selectedCampaign}
          open={campaignSelectorOpen}
          campaigns={activeCampaigns}
          onValueChange={(value) => {
            setSelectedCampaign(value);
            setCampaignSelectorOpen(false);
            setShowCampaignSelector(false); // Hide selector after selection
          }}
          onOpenChange={(open) => {
            setCampaignSelectorOpen(open);
            if (!open && !selectedCampaign) {
              setShowCampaignSelector(false); // Hide selector if closed without selection
            }
          }}
        />
      ) : (
        <div className="flex items-center gap-1.5">
          {/* Selected count */}
          <span className="text-primary text-[11px] font-medium">{selectedCount}</span>
          
          <BulkAddDropdown 
            onAddToPipeline={handleAddToPipeline}
            onSelectList={() => {
              setShowListSelector(true);
              setListSelectorOpen(true); // Automatically open the Select
            }}
            onSelectCampaign={() => {
              setShowCampaignSelector(true);
              setCampaignSelectorOpen(true); // Automatically open the Select
            }}
            isPipelineLoading={addContactsMutation.isPending}
          />
        </div>
      )}
    </div>
  );

  if (isMobile) {
    // Mobile: Fixed bottom position
    return (
      <>
        <div className="fixed bottom-0 left-0 right-0 z-40 shadow-lg border-t">
          {toolbar}
        </div>
        
        {/* Contact List Confirmation Dialog */}
        <Dialog open={confirmListDialogOpen} onOpenChange={setConfirmListDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Adding Contacts</DialogTitle>
              <DialogDescription>
                Adding {selectedCount} contact{selectedCount !== 1 ? 's' : ''} to "{contactLists.find(l => l.id === pendingListId)?.name}".
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleCancelAddToList}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmAddToList}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Campaign Confirmation Dialog */}
        <Dialog open={confirmCampaignDialogOpen} onOpenChange={setConfirmCampaignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Adding Contacts</DialogTitle>
              <DialogDescription>
                Adding {selectedCount} contact{selectedCount !== 1 ? 's' : ''} to campaign "{activeCampaigns.find(c => c.id === pendingCampaignId)?.name}".
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleCancelAddToCampaign}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmAddToCampaign}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Report Dialog - Shows after operation completes */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Operation Report</DialogTitle>
              <DialogDescription>
                Results of adding contacts to {reportData?.operationType === 'list' ? 'contact list' : 'campaign'}:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total contacts submitted:</span>
                <span className="text-sm font-medium">{reportData?.totalSubmitted || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">No email error:</span>
                <span className="text-sm font-medium text-amber-600">{reportData?.noEmailError || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Duplication error:</span>
                <span className="text-sm font-medium text-amber-600">{reportData?.duplicationError || 0}</span>
              </div>
              {reportData?.otherListDuplicateError ? (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email in other lists:</span>
                  <span className="text-sm font-medium text-amber-600">{reportData.otherListDuplicateError}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Successfully added:</span>
                <span className="text-sm font-medium text-green-600">{reportData?.successfullyAdded || 0}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                setReportDialogOpen(false);
                onClear(); // Clear selections now that user has seen the report
              }}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Return inline toolbar for parent to place
  return (
    <>
      {toolbar}
      
      {/* Contact List Confirmation Dialog */}
      <Dialog open={confirmListDialogOpen} onOpenChange={setConfirmListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Adding Contacts</DialogTitle>
            <DialogDescription>
              Adding {selectedCount} contact{selectedCount !== 1 ? 's' : ''} to "{contactLists.find(l => l.id === pendingListId)?.name}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelAddToList}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAddToList}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Campaign Confirmation Dialog */}
      <Dialog open={confirmCampaignDialogOpen} onOpenChange={setConfirmCampaignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Adding Contacts</DialogTitle>
            <DialogDescription>
              Adding {selectedCount} contact{selectedCount !== 1 ? 's' : ''} to campaign "{activeCampaigns.find(c => c.id === pendingCampaignId)?.name}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelAddToCampaign}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAddToCampaign}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Report Dialog - Shows after operation completes */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Operation Report</DialogTitle>
            <DialogDescription>
              Results of adding contacts to {reportData?.operationType === 'list' ? 'contact list' : 'campaign'}:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total contacts submitted:</span>
              <span className="text-sm font-medium">{reportData?.totalSubmitted || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">No email error:</span>
              <span className="text-sm font-medium text-amber-600">{reportData?.noEmailError || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Duplication error:</span>
              <span className="text-sm font-medium text-amber-600">{reportData?.duplicationError || 0}</span>
            </div>
            {reportData?.otherListDuplicateError ? (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email in other lists:</span>
                <span className="text-sm font-medium text-amber-600">{reportData.otherListDuplicateError}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Successfully added:</span>
              <span className="text-sm font-medium text-green-600">{reportData?.successfullyAdded || 0}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setReportDialogOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}