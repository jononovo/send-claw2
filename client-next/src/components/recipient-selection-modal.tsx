import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, FolderOpen, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { SearchList, ContactList } from "@shared/schema";
import { cn } from "@/lib/utils";

interface RecipientSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentListId: number | null;
  currentQuery: string | null;
  onSelect: (selection: RecipientSelection) => void;
}

export type RecipientSelection = 
  | { type: 'current'; listId: number; query: string }
  | { type: 'multiple'; searchListIds: number[]; targetAudienceQuery?: string }
  | { type: 'existing'; contactListId: number; contactListName: string };

export function RecipientSelectionModal({
  open,
  onOpenChange,
  currentListId,
  currentQuery,
  onSelect,
}: RecipientSelectionModalProps) {
  const [selectionType, setSelectionType] = useState<'current' | 'multiple' | 'existing'>('current');
  const [selectedSearchLists, setSelectedSearchLists] = useState<Set<number>>(new Set());
  const [selectedContactList, setSelectedContactList] = useState<string>("");

  // Fetch search lists
  const { data: searchLists = [] } = useQuery<SearchList[]>({
    queryKey: ['/api/lists'],
    enabled: open && selectionType === 'multiple',
  });

  // Fetch contact lists
  const { data: contactLists = [] } = useQuery<ContactList[]>({
    queryKey: ['/api/contact-lists'],
    enabled: open && selectionType === 'existing',
  });

  const handleSelectSearchList = (listId: number) => {
    const newSet = new Set(selectedSearchLists);
    if (newSet.has(listId)) {
      newSet.delete(listId);
    } else {
      newSet.add(listId);
    }
    setSelectedSearchLists(newSet);
  };

  const handleConfirm = () => {
    if (selectionType === 'current' && currentListId && currentQuery) {
      onSelect({ type: 'current', listId: currentListId, query: currentQuery });
    } else if (selectionType === 'multiple' && selectedSearchLists.size > 0) {
      const selectedIds = Array.from(selectedSearchLists);
      const firstList = searchLists.find(l => l.listId === selectedIds[0]);
      onSelect({ 
        type: 'multiple', 
        searchListIds: selectedIds,
        targetAudienceQuery: firstList?.prompt
      });
    } else if (selectionType === 'existing' && selectedContactList) {
      const selected = contactLists.find(cl => cl.id.toString() === selectedContactList);
      if (selected) {
        onSelect({ 
          type: 'existing', 
          contactListId: selected.id, 
          contactListName: selected.name 
        });
      }
    }
    onOpenChange(false);
  };

  const isConfirmDisabled = 
    (selectionType === 'current' && (!currentListId || !currentQuery)) ||
    (selectionType === 'multiple' && selectedSearchLists.size === 0) ||
    (selectionType === 'existing' && !selectedContactList);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Campaign Recipients</DialogTitle>
          <DialogDescription>
            Choose how you want to select recipients for this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Option 1: Current Search Results */}
          <button
            onClick={() => setSelectionType('current')}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-all",
              selectionType === 'current'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            )}
            disabled={!currentListId || !currentQuery}
          >
            <div className="flex items-start gap-3">
              <Search className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Current Search Results</div>
                {currentQuery ? (
                  <div className="text-sm text-muted-foreground mt-1">
                    "{currentQuery}"
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-1">
                    No active search available
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  This will create a new contact list from your current search
                </div>
              </div>
            </div>
          </button>

          {/* Option 2: Multiple Search Lists */}
          <button
            onClick={() => setSelectionType('multiple')}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-all",
              selectionType === 'multiple'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            )}
          >
            <div className="flex items-start gap-3">
              <FolderOpen className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Include Multiple Search Lists</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Combine contacts from multiple saved searches
                </div>
              </div>
            </div>
            
            {selectionType === 'multiple' && searchLists.length > 0 && (
              <div onClick={(e) => e.stopPropagation()}>
                <ScrollArea className="h-48 mt-3 border rounded-md p-2">
                  {searchLists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                    >
                      <Checkbox
                        id={`list-${list.id}`}
                        checked={selectedSearchLists.has(list.listId)}
                        onCheckedChange={() => handleSelectSearchList(list.listId)}
                      />
                      <label
                        htmlFor={`list-${list.id}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <div className="font-medium">{list.prompt}</div>
                        <div className="text-xs text-muted-foreground">
                          {list.resultCount} companies • ID: {list.listId}
                        </div>
                      </label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </button>

          {/* Option 3: Existing Contact List */}
          <button
            onClick={() => setSelectionType('existing')}
            className={cn(
              "w-full text-left p-4 rounded-lg border-2 transition-all",
              selectionType === 'existing'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            )}
          >
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Use Existing Contact List</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Select from your saved contact lists
                </div>
              </div>
            </div>
            
            {selectionType === 'existing' && (
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={selectedContactList}
                  onValueChange={setSelectedContactList}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a contact list" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactLists.map((list) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{list.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {list.contactCount} contacts
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isConfirmDisabled}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}