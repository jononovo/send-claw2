import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Campaign } from "@shared/schema";

interface CampaignSelectorProps {
  value: string;
  open: boolean;
  campaigns: Campaign[];
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function CampaignSelector({ 
  value, 
  open,
  campaigns, 
  onValueChange, 
  onOpenChange 
}: CampaignSelectorProps) {
  return (
    <Select
      value={value}
      open={open}
      onValueChange={(value) => {
        console.log('[SelectionToolbar] Campaign value changed:', value);
        onValueChange(value);
      }}
      onOpenChange={(open) => {
        console.log('[SelectionToolbar] Campaign select open state changed:', open);
        onOpenChange(open);
      }}
    >
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder={
          campaigns.length === 0 
            ? "No active campaigns available" 
            : "Choose an active campaign"
        } />
      </SelectTrigger>
      <SelectContent className="z-[100]">
        {campaigns.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">
            No active campaigns found. Please create and activate a campaign first.
          </div>
        ) : (
          campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id.toString()}>
              <div className="flex flex-col">
                <span>{campaign.name}</span>
                <span className="text-xs text-muted-foreground">
                  {campaign.subject ? campaign.subject.substring(0, 50) + '...' : 'No subject'}
                </span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}