import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target } from "lucide-react";
import type { ContactList } from "@shared/schema";

interface ListSelectorProps {
  value: string;
  open: boolean;
  contactLists: ContactList[];
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function ListSelector({ 
  value, 
  open,
  contactLists, 
  onValueChange, 
  onOpenChange 
}: ListSelectorProps) {
  return (
    <Select
      value={value}
      open={open}
      onValueChange={(value) => {
        console.log('[SelectionToolbar] List value changed:', value);
        onValueChange(value);
      }}
      onOpenChange={(open) => {
        console.log('[SelectionToolbar] Select open state changed:', open);
        onOpenChange(open);
      }}
    >
      <SelectTrigger className="w-[200px]" data-testid="select-contact-list">
        <SelectValue placeholder="Choose a contact list" />
      </SelectTrigger>
      <SelectContent className="z-[100]">
        {contactLists.map((list) => (
          <SelectItem 
            key={list.id} 
            value={list.id.toString()}
            data-testid={`select-item-list-${list.id}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5">
                {list.isDefault && <Target className="h-3.5 w-3.5 text-primary" />}
                {list.name}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {list.contactCount} contacts
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
