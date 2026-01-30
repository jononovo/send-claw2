import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface BulkAddDropdownProps {
  onAddToPipeline: () => void;
  onSelectList: () => void;
  onSelectCampaign: () => void;
  isPipelineLoading?: boolean;
}

export function BulkAddDropdown({ 
  onAddToPipeline,
  onSelectList, 
  onSelectCampaign,
  isPipelineLoading = false
}: BulkAddDropdownProps) {
  return (
    <div className="flex items-center">
      <Button 
        variant="outline" 
        size="sm" 
        className="h-6 px-2 text-[11px] font-medium text-gray-600 rounded-r-none border-r-0 hover:bg-gray-50 hover:text-gray-700"
        onClick={onAddToPipeline}
        disabled={isPipelineLoading}
        title="Add selected to Pipeline"
        data-testid="button-add-to-pipeline"
      >
        {isPipelineLoading ? "Adding..." : "Add to Pipeline"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 px-1.5 text-[11px] font-medium text-gray-600 rounded-l-none"
            title="More add options"
            data-testid="dropdown-add-options"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem 
            onClick={() => {
              console.log('[SelectionToolbar] "Contact List" clicked, showing selector');
              onSelectList();
            }}
            data-testid="menu-item-contact-list"
          >
            Contact List
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              console.log('[SelectionToolbar] "Campaign" clicked, showing selector');
              onSelectCampaign();
            }}
            data-testid="menu-item-campaign"
          >
            Campaign
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
