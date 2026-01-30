import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar,
  Wand2,
  Info,
  MailCheck,
  Link,
  Settings,
  ChevronUp,
  ChevronDown,
  UserCheck,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleSendModal } from "@/components/schedule-send-modal";
import { AutopilotModal, type AutopilotSettings } from "@/components/autopilot-modal";
import { format } from "date-fns";
import { Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface GmailAuthStatus {
  authorized: boolean;
  hasValidToken: boolean;
}

interface SenderProfile {
  id: number;
  userId: number;
  displayName: string;
  email: string;
  companyName?: string;
  companyWebsite?: string;
  title?: string;
  isDefault: boolean;
}

export interface CampaignSettingsData {
  scheduleSend: boolean;
  scheduleDate?: Date;
  scheduleTime?: string;
  autopilot: boolean;
  autopilotSettings?: AutopilotSettings;
  requiresHumanReview: boolean;
  emailTemplateId?: number;
  trackEmails: boolean;
  unsubscribeLink: boolean;
  senderProfileId?: number;
}

interface CampaignSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CampaignSettingsData;
  onSettingsChange: (settings: CampaignSettingsData) => void;
  className?: string;
  totalRecipients?: number;
}

export function CampaignSettings({ 
  open, 
  onOpenChange,
  settings,
  onSettingsChange,
  className,
  totalRecipients = 100
}: CampaignSettingsProps) {
  const { user, authReady } = useAuth();
  const [localSettings, setLocalSettings] = useState<CampaignSettingsData>(settings);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [autopilotModalOpen, setAutopilotModalOpen] = useState(false);

  // Sync local settings when parent props change (e.g., after restoring from localStorage)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Check Gmail connection status - wait for auth to be ready
  const { data: gmailStatus } = useQuery<GmailAuthStatus>({
    queryKey: ['/api/gmail/auth-status'],
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: authReady && !!user,
  });

  // Fetch sender profiles - wait for auth to be ready
  const { data: senderProfiles } = useQuery<SenderProfile[]>({
    queryKey: ['/api/sender-profiles'],
    enabled: authReady && !!user,
  });

  // Set default sender profile when profiles are loaded
  useEffect(() => {
    if (senderProfiles && senderProfiles.length > 0 && !localSettings.senderProfileId) {
      const defaultProfile = senderProfiles.find(p => p.isDefault) || senderProfiles[0];
      const updated = { ...localSettings, senderProfileId: defaultProfile.id };
      setLocalSettings(updated);
      onSettingsChange(updated);
    }
  }, [senderProfiles]);

  const handleToggle = (key: keyof CampaignSettingsData, value: boolean) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  const handleSenderProfileChange = (profileId: string) => {
    const updated = { ...localSettings, senderProfileId: parseInt(profileId) };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  const handleScheduleApply = (date: Date, time: string) => {
    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    const updated = { 
      ...localSettings, 
      scheduleSend: true,
      scheduleDate: scheduledDate,
      scheduleTime: time 
    };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  const handleAutopilotApply = (autopilotSettings: AutopilotSettings) => {
    const updated = {
      ...localSettings,
      autopilot: true,
      autopilotSettings: autopilotSettings
    };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  return (
    <>
    <div className={cn("space-y-1 pt-1 pb-4", className)}>
          {/* Sending Method Status */}
          <div className="w-full px-2 py-2 bg-muted/30 rounded-lg mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Sending Method
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {gmailStatus?.authorized ? 'Gmail' : 'Manual'}
                </span>
                {gmailStatus?.authorized ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Gmail connected - emails will be sent automatically</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Gmail not connected - you'll need to send emails manually after approval</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            {!gmailStatus?.authorized && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs py-1 h-7"
                  onClick={() => window.open(`/api/gmail/auth?userId=${(window as any).userId || 1}`, '_blank')}
                >
                  Connect Gmail to enable automatic sending
                </Button>
              </div>
            )}
          </div>

          {/* Sender Profile Selector */}
          {senderProfiles && senderProfiles.length > 0 && (
            <div className="w-full px-2 py-2 bg-muted/30 rounded-lg mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Sender profile
                  </span>
                </div>
                <Select
                  value={localSettings.senderProfileId?.toString() || ''}
                  onValueChange={handleSenderProfileChange}
                >
                  <SelectTrigger className="w-48 h-7 text-xs">
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {senderProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id.toString()}>
                        <div className="flex items-center gap-1">
                          <span>{profile.displayName}</span>
                          {profile.isDefault && (
                            <span className="text-xs text-muted-foreground">(default)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!senderProfiles || senderProfiles.length === 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Connect Gmail to create a sender profile
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Schedule Send Button */}
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-1.5 px-2 hover:bg-muted/50"
            onClick={() => setScheduleModalOpen(true)}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-normal text-muted-foreground">
                Schedule send
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {localSettings.scheduleSend && localSettings.scheduleDate 
                ? format(localSettings.scheduleDate, "MMM d, h:mm a")
                : ''}
            </div>
          </Button>

          {/* Autopilot Button */}
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-1.5 px-2 hover:bg-muted/50"
            onClick={() => setAutopilotModalOpen(true)}
          >
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-normal text-muted-foreground">
                  Autopilot
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info 
                        className="h-3 w-3 text-muted-foreground cursor-help" 
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Automatically send emails at optimal times throughout the day</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {localSettings.autopilot && localSettings.autopilotSettings?.maxEmailsPerDay 
                ? `${localSettings.autopilotSettings.maxEmailsPerDay} per day`
                : ''}
            </div>
          </Button>

          {/* Human Review Button */}
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-1.5 px-2 hover:bg-muted/50"
            onClick={() => handleToggle('requiresHumanReview', !localSettings.requiresHumanReview)}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-normal text-muted-foreground">
                  Human review
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info 
                        className="h-3 w-3 text-muted-foreground cursor-help"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>When enabled, emails require your review before sending. When disabled, template-based emails are sent automatically.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Switch
              checked={localSettings.requiresHumanReview}
              onCheckedChange={(checked) => handleToggle('requiresHumanReview', checked)}
              className="data-[state=checked]:bg-blue-600 scale-90"
              onClick={(e) => e.stopPropagation()}
            />
          </Button>

          {/* Track Emails Button */}
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-1.5 px-2 hover:bg-muted/50"
            onClick={() => handleToggle('trackEmails', !localSettings.trackEmails)}
          >
            <div className="flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-normal text-muted-foreground">
                  Track emails
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info 
                        className="h-3 w-3 text-muted-foreground cursor-help"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Track when recipients open and click links in your emails</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Switch
              checked={localSettings.trackEmails}
              onCheckedChange={(checked) => handleToggle('trackEmails', checked)}
              className="data-[state=checked]:bg-blue-600 scale-90"
              onClick={(e) => e.stopPropagation()}
            />
          </Button>

          {/* Unsubscribe Link Button */}
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-1.5 px-2 hover:bg-muted/50"
            onClick={() => handleToggle('unsubscribeLink', !localSettings.unsubscribeLink)}
          >
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-normal text-muted-foreground">
                  Unsubscribe link
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info 
                        className="h-3 w-3 text-muted-foreground cursor-help"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Add an unsubscribe link to comply with email regulations</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Switch
              checked={localSettings.unsubscribeLink}
              onCheckedChange={(checked) => handleToggle('unsubscribeLink', checked)}
              className="data-[state=checked]:bg-blue-600 scale-90"
              onClick={(e) => e.stopPropagation()}
            />
          </Button>
    </div>

    {/* Schedule Send Modal */}
    <ScheduleSendModal
      open={scheduleModalOpen}
      onOpenChange={setScheduleModalOpen}
      selectedDate={localSettings.scheduleDate}
      selectedTime={localSettings.scheduleTime || "09:00"}
      onApply={handleScheduleApply}
    />

    {/* Autopilot Modal */}
    <AutopilotModal
      open={autopilotModalOpen}
      onOpenChange={setAutopilotModalOpen}
      settings={localSettings.autopilotSettings || {
        enabled: false,
        days: {
          monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
          sunday: { enabled: false, startTime: "09:00", endTime: "17:00" }
        },
        maxEmailsPerDay: 300,
        delayBetweenEmails: 3,
        delayUnit: 'minutes'
      }}
      onApply={handleAutopilotApply}
      totalEmails={totalRecipients}
    />
    </>
  );
}