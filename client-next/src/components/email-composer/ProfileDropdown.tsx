import { ReactNode, useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Star, Edit2, Trash2, Plus } from "lucide-react";

export interface ProfileDropdownItem {
  id: number;
  isDefault?: boolean;
  [key: string]: any;
}

interface ProfileDropdownProps<T extends ProfileDropdownItem> {
  // Core props
  items: T[];
  selectedId: number | null;
  onSelect: (item: T | null) => void;
  
  // UI props
  triggerIcon: ReactNode;
  triggerLabel?: string;
  headerIcon: ReactNode;
  headerTitle: string;
  headerDescription: string;
  
  // None option
  showNoneOption?: boolean;
  noneLabel?: string;
  noneDescription?: string;
  
  // Add new button
  onAddNew?: () => void;
  addNewLabel?: string;
  
  // Item actions
  onEdit?: (item: T, e: React.MouseEvent) => void;
  onDelete?: (item: T, e: React.MouseEvent) => void;
  
  // Custom rendering
  renderItem: (item: T) => ReactNode;
  
  // State management
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // Styling
  triggerClassName?: string;
  contentClassName?: string;
  testIdPrefix?: string;
}

export function ProfileDropdown<T extends ProfileDropdownItem>({
  items,
  selectedId,
  onSelect,
  triggerIcon,
  triggerLabel,
  headerIcon,
  headerTitle,
  headerDescription,
  showNoneOption = true,
  noneLabel = "None",
  noneDescription = "No selection",
  onAddNew,
  addNewLabel = "Add New",
  onEdit,
  onDelete,
  renderItem,
  isOpen: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  triggerClassName,
  contentClassName,
  testIdPrefix = "profile",
}: ProfileDropdownProps<T>) {
  const [localOpen, setLocalOpen] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  
  // Use controlled or local state
  const isOpen = controlledOpen !== undefined ? controlledOpen : localOpen;
  const setIsOpen = controlledOnOpenChange || setLocalOpen;
  
  // Reset hover state when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setHoveredItemId(null);
    }
  }, [isOpen]);
  
  const handleSelectItem = (item: T | null) => {
    onSelect(item);
    setIsOpen(false);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded hover:bg-yellow-400/20 transition-colors text-xs",
            triggerClassName || "text-muted-foreground"
          )}
          title={`Select ${headerTitle.toLowerCase()}`}
          data-testid={`button-${testIdPrefix}-selector`}
        >
          {triggerIcon}
          {triggerLabel && (
            <span className="max-w-20 truncate">{triggerLabel}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-72 p-0", contentClassName)} align="start">
        <div className="px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            {headerIcon}
            <h4 className="font-semibold text-sm">{headerTitle}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{headerDescription}</p>
        </div>
        <div className="p-2 space-y-1">
          {/* None Option */}
          {showNoneOption && (
            <button
              className={cn(
                "w-full text-left p-3 rounded-md hover:bg-accent-hover transition-colors",
                selectedId === null && "bg-accent-active"
              )}
              onClick={() => handleSelectItem(null)}
              data-testid={`button-${testIdPrefix}-none`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-medium">{noneLabel}</span>
                  <span className="text-muted-foreground"> - {noneDescription}</span>
                </div>
                {selectedId === null && (
                  <Check className="w-3 h-3 text-primary" />
                )}
              </div>
            </button>
          )}
          
          {/* Items */}
          {items.map((item) => (
            <button
              key={item.id}
              className={cn(
                "w-full text-left p-3 rounded-md hover:bg-accent-hover transition-colors group relative",
                selectedId === item.id && "bg-accent-active"
              )}
              onClick={() => handleSelectItem(item)}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              data-testid={`button-${testIdPrefix}-${item.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs flex-1 min-w-0">
                  {renderItem(item)}
                </div>
                <div className="flex items-center gap-1">
                  {/* Show check/star when not hovering THIS specific item */}
                  {hoveredItemId !== item.id && (
                    <>
                      {selectedId === item.id && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                      {item.isDefault && (
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </>
                  )}
                  {/* Show edit/delete when hovering THIS specific item */}
                  {hoveredItemId === item.id && (onEdit || onDelete) && (
                    <>
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item, e);
                          }}
                          className="p-1 rounded hover:bg-accent-foreground/10"
                          title={`Edit ${headerTitle.toLowerCase()}`}
                          data-testid={`button-edit-${testIdPrefix}-${item.id}`}
                        >
                          <Edit2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item, e);
                          }}
                          className="p-1 rounded hover:bg-accent-foreground/10 hover:text-destructive"
                          title={`Delete ${headerTitle.toLowerCase()}`}
                          data-testid={`button-delete-${testIdPrefix}-${item.id}`}
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
          
          {/* Add New button */}
          {onAddNew && (
            <button
              className="w-full text-left p-3 rounded-md hover:bg-accent-hover transition-colors border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40"
              onClick={() => {
                onAddNew();
                setIsOpen(false);
              }}
              data-testid={`button-add-new-${testIdPrefix}`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Plus className="w-3 h-3" />
                <span>{addNewLabel}</span>
              </div>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}