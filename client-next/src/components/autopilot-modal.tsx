import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";
import { format, addMinutes, differenceInMinutes, startOfDay } from "date-fns";

interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface AutopilotSettings {
  enabled: boolean;
  days: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  maxEmailsPerDay: number;
  delayBetweenEmails: number; // in minutes
  delayUnit: 'minutes' | 'hours';
  startDate?: Date;
}

interface AutopilotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AutopilotSettings;
  onApply: (settings: AutopilotSettings) => void;
  totalEmails?: number; // Total number of emails in the campaign
}

const DEFAULT_DAY_SCHEDULE: DaySchedule = {
  enabled: true,
  startTime: "09:00",
  endTime: "17:00"
};

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

export function AutopilotModal({
  open,
  onOpenChange,
  settings,
  onApply,
  totalEmails = 100
}: AutopilotModalProps) {
  const [localSettings, setLocalSettings] = useState<AutopilotSettings>(() => ({
    enabled: settings.enabled ?? true,
    days: settings.days ?? {
      monday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      tuesday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      wednesday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      thursday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      friday: { ...DEFAULT_DAY_SCHEDULE, enabled: true },
      saturday: { ...DEFAULT_DAY_SCHEDULE, enabled: false },
      sunday: { ...DEFAULT_DAY_SCHEDULE, enabled: false },
    },
    maxEmailsPerDay: settings.maxEmailsPerDay ?? 300,
    delayBetweenEmails: settings.delayBetweenEmails ?? 3,
    delayUnit: settings.delayUnit ?? 'minutes',
    startDate: settings.startDate
  }));

  const [estimatedTime, setEstimatedTime] = useState<string>("");

  // Calculate estimated time to send all emails
  useEffect(() => {
    const calculateEstimatedTime = () => {
      const enabledDays = Object.values(localSettings.days).filter(d => d.enabled).length;
      
      if (enabledDays === 0) {
        setEstimatedTime("No days selected");
        return;
      }

      const emailsPerDay = Math.min(localSettings.maxEmailsPerDay, Math.ceil(totalEmails / enabledDays));
      const daysNeeded = Math.ceil(totalEmails / emailsPerDay);
      
      // Calculate hours per day based on working hours
      const firstEnabledDay = Object.values(localSettings.days).find(d => d.enabled);
      if (!firstEnabledDay) return;
      
      const startTime = new Date(`2024-01-01 ${firstEnabledDay.startTime}`);
      const endTime = new Date(`2024-01-01 ${firstEnabledDay.endTime}`);
      const workingMinutesPerDay = differenceInMinutes(endTime, startTime);
      
      // Calculate delay impact
      const delayMinutes = localSettings.delayUnit === 'hours' 
        ? localSettings.delayBetweenEmails * 60 
        : localSettings.delayBetweenEmails;
      
      const totalDelayPerDay = (emailsPerDay - 1) * delayMinutes;
      const totalTimePerDay = totalDelayPerDay;
      
      if (totalTimePerDay > workingMinutesPerDay) {
        const actualEmailsPerDay = Math.floor(workingMinutesPerDay / delayMinutes);
        const actualDaysNeeded = Math.ceil(totalEmails / actualEmailsPerDay);
        
        if (actualDaysNeeded === 1) {
          setEstimatedTime(`about ${Math.ceil(totalTimePerDay / 60)} hours`);
        } else if (actualDaysNeeded < 7) {
          setEstimatedTime(`about ${actualDaysNeeded} days`);
        } else {
          const weeks = Math.floor(actualDaysNeeded / 7);
          const days = actualDaysNeeded % 7;
          if (days === 0) {
            setEstimatedTime(`about ${weeks} week${weeks > 1 ? 's' : ''}`);
          } else {
            setEstimatedTime(`about ${weeks} week${weeks > 1 ? 's' : ''} and ${days} day${days > 1 ? 's' : ''}`);
          }
        }
      } else {
        if (daysNeeded === 1) {
          const hours = Math.ceil(totalTimePerDay / 60);
          setEstimatedTime(`about ${hours} hour${hours > 1 ? 's' : ''}`);
        } else if (daysNeeded < 7) {
          setEstimatedTime(`about ${daysNeeded} day${daysNeeded > 1 ? 's' : ''}`);
        } else {
          const weeks = Math.floor(daysNeeded / 7);
          const days = daysNeeded % 7;
          if (days === 0) {
            setEstimatedTime(`about ${weeks} week${weeks > 1 ? 's' : ''}`);
          } else {
            setEstimatedTime(`about ${weeks} week${weeks > 1 ? 's' : ''} and ${days} day${days > 1 ? 's' : ''}`);
          }
        }
      }
    };

    calculateEstimatedTime();
  }, [localSettings, totalEmails]);

  const handleDayToggle = (day: keyof typeof localSettings.days) => {
    setLocalSettings(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          enabled: !prev.days[day].enabled
        }
      }
    }));
  };

  const handleTimeChange = (
    day: keyof typeof localSettings.days, 
    field: 'startTime' | 'endTime', 
    value: string
  ) => {
    setLocalSettings(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          [field]: value
        }
      }
    }));
  };

  const handleApply = () => {
    // Ensure the enabled field is set to true when applying settings
    const settingsToApply = {
      ...localSettings,
      enabled: true  // Always set to true when applying autopilot settings
    };
    onApply(settingsToApply);
    onOpenChange(false);
  };

  // Get the next scheduled start date
  const getNextStartDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Find next enabled day
    for (let i = 0; i < 7; i++) {
      const checkDay = (dayOfWeek + i) % 7;
      const dayName = daysMap[checkDay] as keyof typeof localSettings.days;
      if (localSettings.days[dayName].enabled) {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + i);
        
        // Set time from schedule
        const [hours, minutes] = localSettings.days[dayName].startTime.split(':').map(Number);
        nextDate.setHours(hours, minutes, 0, 0);
        
        // If it's today but time has passed, go to next enabled day
        if (i === 0 && nextDate < new Date()) {
          continue;
        }
        
        return nextDate;
      }
    }
    return null;
  };

  const nextStart = getNextStartDate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Autopilot</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Improve your deliverability with these sending options{" "}
            <a href="#" className="text-blue-600 hover:underline">
              (why it's important)
            </a>
            .
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Days Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Send only on</Label>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <Checkbox
                      id={key}
                      checked={localSettings.days[key].enabled}
                      onCheckedChange={() => handleDayToggle(key)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <Label 
                      htmlFor={key} 
                      className="font-normal cursor-pointer"
                    >
                      {label}
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={localSettings.days[key].startTime}
                      onChange={(e) => handleTimeChange(key, 'startTime', e.target.value)}
                      disabled={!localSettings.days[key].enabled}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={localSettings.days[key].endTime}
                      onChange={(e) => handleTimeChange(key, 'endTime', e.target.value)}
                      disabled={!localSettings.days[key].enabled}
                      className="w-24"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sending Rate */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Sending rate</Label>
            
            {/* Max emails per day */}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={true}
                disabled
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label className="font-normal">Max emails per day:</Label>
              <Input
                type="number"
                value={localSettings.maxEmailsPerDay}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  maxEmailsPerDay: parseInt(e.target.value) || 1
                }))}
                className="w-20"
                min={1}
                max={1000}
              />
            </div>

            {/* Delay between emails */}
            <div className="flex items-center gap-3">
              <Checkbox
                checked={true}
                disabled
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label className="font-normal">Delay between emails:</Label>
              <Input
                type="number"
                value={localSettings.delayBetweenEmails}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  delayBetweenEmails: parseInt(e.target.value) || 1
                }))}
                className="w-16"
                min={1}
                max={60}
              />
              <Select
                value={localSettings.delayUnit}
                onValueChange={(value: 'minutes' | 'hours') => 
                  setLocalSettings(prev => ({ ...prev, delayUnit: value }))
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">minutes</SelectItem>
                  <SelectItem value="hours">hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start Date Info */}
          {nextStart && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Sending will start on</p>
              <p className="text-sm text-muted-foreground">
                {format(nextStart, "EEEE, MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Summary</p>
            <p className="text-sm text-muted-foreground">
              With the current settings, if you send {totalEmails} emails, it will take{" "}
              <span className="font-medium underline">{estimatedTime}</span>.
            </p>
          </div>

          {/* Timezone note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            <span>Based on your timezone</span>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}