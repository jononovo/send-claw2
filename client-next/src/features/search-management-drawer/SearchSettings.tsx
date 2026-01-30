import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function SearchSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    defaultPriority: "medium",
    maxConcurrent: "3",
    retryAttempts: "2",
    timeout: "30",
    saveToList: true,
    deduplication: true,
    notifications: true
  });

  const handleSave = () => {
    // Save settings logic would go here
    toast({
      title: "Settings saved",
      description: "Your search management preferences have been updated."
    });
  };

  return (
    <div className="space-y-4">
      {/* Queue Defaults */}
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-medium">Queue Defaults</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Default settings for new search queue items
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Default Priority</Label>
            <Select
              value={settings.defaultPriority}
              onValueChange={(value) => setSettings({ ...settings, defaultPriority: value })}
            >
              <SelectTrigger className="mobile-input h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Max Concurrent Searches</Label>
            <Input
              type="number"
              value={settings.maxConcurrent}
              onChange={(e) => setSettings({ ...settings, maxConcurrent: e.target.value })}
              className="mobile-input h-9"
              min="1"
              max="10"
            />
            <p className="text-xs text-muted-foreground">
              Number of searches that can run simultaneously
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Retry Attempts</Label>
            <Input
              type="number"
              value={settings.retryAttempts}
              onChange={(e) => setSettings({ ...settings, retryAttempts: e.target.value })}
              className="mobile-input h-9"
              min="0"
              max="5"
            />
            <p className="text-xs text-muted-foreground">
              Number of times to retry failed searches
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Search Timeout (seconds)</Label>
            <Input
              type="number"
              value={settings.timeout}
              onChange={(e) => setSettings({ ...settings, timeout: e.target.value })}
              className="mobile-input h-9"
              min="10"
              max="120"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Data Management */}
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-medium">Data Management</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Control how search results are handled
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Auto-save to list</div>
              <div className="text-xs text-muted-foreground">
                Automatically create search lists for results
              </div>
            </div>
            <Switch
              checked={settings.saveToList}
              onCheckedChange={(checked) => setSettings({ ...settings, saveToList: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Deduplication</div>
              <div className="text-xs text-muted-foreground">
                Remove duplicate contacts across searches
              </div>
            </div>
            <Switch
              checked={settings.deduplication}
              onCheckedChange={(checked) => setSettings({ ...settings, deduplication: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Notifications */}
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-medium">Notifications</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Get notified about queue activity
          </p>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Queue notifications</div>
            <div className="text-xs text-muted-foreground">
              Receive alerts when searches complete or fail
            </div>
          </div>
          <Switch
            checked={settings.notifications}
            onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
          />
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} size="sm" className="w-full">
          <Save className="h-3 w-3 mr-1" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}