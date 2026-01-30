import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";

export function CampaignIntegration() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [autoRunEnabled, setAutoRunEnabled] = useState(false);
  const [contactThreshold, setContactThreshold] = useState("50");

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
  });

  return (
    <div className="space-y-4">
      {/* Campaign Selection */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Target Campaign</Label>
        <Select
          value={selectedCampaignId || "none"}
          onValueChange={(value) => setSelectedCampaignId(value === "none" ? null : value)}
        >
          <SelectTrigger className="mobile-input">
            <SelectValue placeholder="Select a campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No campaign (manual)</SelectItem>
            {campaigns.map((campaign: any) => (
              <SelectItem key={campaign.id} value={campaign.id.toString()}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          New search results will automatically be added to this campaign
        </p>
      </div>

      {/* Campaign Status Alert */}
      {selectedCampaignId && selectedCampaignId !== "none" && (
        <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Automatic Processing Enabled</p>
              <p className="text-muted-foreground text-xs">
                Search results will be automatically added to the selected campaign
                and become available for email sequences.
              </p>
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Trigger Settings */}
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-medium">Automation Triggers</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Configure when searches should run automatically
          </p>
        </div>

        {/* Auto-run Setting */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Auto-run when low on contacts</div>
            <div className="text-xs text-muted-foreground">
              Automatically run next search in queue when campaign has fewer unused contacts
            </div>
          </div>
          <Switch
            checked={autoRunEnabled}
            onCheckedChange={setAutoRunEnabled}
          />
        </div>

        {/* Threshold Setting */}
        {autoRunEnabled && (
          <div className="space-y-2 ml-4">
            <Label className="text-xs">Contact threshold</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={contactThreshold}
                onChange={(e) => setContactThreshold(e.target.value)}
                className="w-24 h-8 text-sm"
                min="10"
                max="500"
              />
              <span className="text-xs text-muted-foreground">unused contacts</span>
            </div>
            <p className="text-xs text-muted-foreground">
              When the campaign has fewer than {contactThreshold} unused contacts, 
              the next search in the queue will run automatically
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Schedule Settings */}
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-medium">Schedule Settings</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Control when automated searches can run
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Business hours only</Label>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-xs">Weekdays only</Label>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Daily search limit</Label>
            <Input
              type="number"
              defaultValue="10"
              className="w-24 h-8 text-sm"
              min="1"
              max="50"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of searches to run per day
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}