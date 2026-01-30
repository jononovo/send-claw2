import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Clock, Mail, Calendar, Globe, Send, AlertCircle } from 'lucide-react';

const DAYS = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' }
];

const TIMES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney'
];

interface OutreachPreferences {
  enabled: boolean;
  scheduleDays: string[];
  scheduleTime: string;
  timezone: string;
  minContactsRequired: number;
  lastNudgeSent?: string;
}

export function DailyOutreachSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch preferences
  const { data: preferences, isLoading } = useQuery<OutreachPreferences>({
    queryKey: ['/api/daily-outreach/preferences']
  });
  
  const [enabled, setEnabled] = useState(preferences?.enabled || false);
  const [scheduleDays, setScheduleDays] = useState(preferences?.scheduleDays || ['mon', 'tue', 'wed']);
  const [scheduleTime, setScheduleTime] = useState(preferences?.scheduleTime || '09:00');
  const [timezone, setTimezone] = useState(preferences?.timezone || 'America/New_York');
  
  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (data: Partial<OutreachPreferences>) => {
      const res = await apiRequest('PUT', '/api/daily-outreach/preferences', {
        ...data,
        minContactsRequired: 5
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-outreach/preferences'] });
      toast({
        title: 'Settings saved',
        description: 'Your daily outreach preferences have been updated'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    }
  });
  
  // Manual trigger mutation
  const triggerOutreach = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/daily-outreach/trigger');
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: 'Email sent!',
          description: data.message || 'Daily nudge email has been sent to your inbox'
        });
      } else {
        toast({
          title: 'No contacts available',
          description: data.message || 'Please add more contacts first',
          variant: 'destructive'
        });
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send test email',
        variant: 'destructive'
      });
    }
  });
  
  const handleSave = () => {
    updatePreferences.mutate({
      enabled,
      scheduleDays,
      scheduleTime,
      timezone
    });
  };
  
  const toggleDay = (day: string) => {
    setScheduleDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Nudge</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Daily Sales Nudge
        </CardTitle>
        <CardDescription>
          Get daily emails with 5 pre-selected prospects and personalized outreach messages
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enabled">Enable Daily Emails</Label>
            <p className="text-sm text-muted-foreground">
              Receive automated daily outreach reminders
            </p>
          </div>
          <Switch
            id="enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
        
        {enabled && (
          <>
            {/* Schedule Days */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Send on these days
              </Label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map(day => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.value}
                      checked={scheduleDays.includes(day.value)}
                      onCheckedChange={() => toggleDay(day.value)}
                    />
                    <Label
                      htmlFor={day.value}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {day.label.slice(0, 3)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Schedule Time */}
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Send time
              </Label>
              <Select value={scheduleTime} onValueChange={setScheduleTime}>
                <SelectTrigger id="time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMES.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        
        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 p-4 text-sm">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="space-y-1 text-blue-900">
              <p className="font-medium">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>We'll select 5 prospects from your contacts daily</li>
                <li>AI generates personalized outreach emails for each</li>
                <li>You receive a secure link to review and send</li>
                <li>Links expire after 24 hours for security</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Last Sent Info */}
        {preferences?.lastNudgeSent && (
          <p className="text-sm text-muted-foreground">
            Last email sent: {new Date(preferences.lastNudgeSent).toLocaleString()}
          </p>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updatePreferences.isPending}
          >
            Save Settings
          </Button>
          
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outline"
              onClick={() => triggerOutreach.mutate()}
              disabled={triggerOutreach.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Test Email
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}