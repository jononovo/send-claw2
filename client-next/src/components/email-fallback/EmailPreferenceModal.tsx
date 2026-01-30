import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Zap, 
  Mail, 
  Globe, 
  Inbox, 
  HelpCircle,
  Smartphone,
  Monitor,
  CheckCircle
} from 'lucide-react';
import { EmailPreference } from '@/services/email-fallback/preference-manager';
import { environmentDetector } from '@/services/email-fallback/environment-detector';

interface EmailPreferenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSavePreference: (preference: EmailPreference) => void;
  currentPreference?: EmailPreference;
}

export function EmailPreferenceModal({
  open,
  onOpenChange,
  onSavePreference,
  currentPreference = 'smart-default'
}: EmailPreferenceModalProps) {
  const [selectedPreference, setSelectedPreference] = useState<EmailPreference>(currentPreference);
  const env = environmentDetector.detect();
  
  const handleSave = () => {
    onSavePreference(selectedPreference);
    onOpenChange(false);
  };

  const getRecommendation = () => {
    if (env.isMobile || env.isTablet) {
      return 'default-app'; // Mobile users likely have email apps
    }
    return 'gmail'; // Desktop users often use webmail
  };

  const getDeviceIcon = () => {
    if (env.isMobile || env.isTablet) {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const options = [
    {
      value: 'smart-default',
      label: 'Smart Default',
      description: 'Automatically choose the best method based on your device',
      icon: <Zap className="h-5 w-5 text-yellow-600" />,
      recommended: true
    },
    {
      value: 'gmail',
      label: 'Always Use Gmail',
      description: 'Open Gmail in a new tab for consistent experience',
      icon: <Mail className="h-5 w-5 text-red-600" />,
      recommended: !env.isMobile && getRecommendation() === 'gmail'
    },
    {
      value: 'outlook',
      label: 'Always Use Outlook',
      description: 'Open Outlook.com in a new tab',
      icon: <Globe className="h-5 w-5 text-blue-600" />,
      recommended: false
    },
    {
      value: 'default-app',
      label: 'Always Use Default Email App',
      description: 'Open your device\'s default email application',
      icon: <Inbox className="h-5 w-5 text-green-600" />,
      recommended: env.isMobile && getRecommendation() === 'default-app'
    },
    {
      value: 'ask-always',
      label: 'Ask Every Time',
      description: 'Choose your preferred method each time you send',
      icon: <HelpCircle className="h-5 w-5 text-purple-600" />,
      recommended: false
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDeviceIcon()}
            <span>Email Sending Preferences</span>
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to send emails from 5Ducks
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup 
            value={selectedPreference} 
            onValueChange={(value) => setSelectedPreference(value as EmailPreference)}
          >
            <div className="space-y-3">
              {options.map((option) => (
                <Card 
                  key={option.value}
                  className={`cursor-pointer transition-all ${
                    selectedPreference === option.value 
                      ? 'ring-2 ring-primary' 
                      : 'hover:bg-accent-hover'
                  }`}
                  onClick={() => setSelectedPreference(option.value as EmailPreference)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem 
                        value={option.value} 
                        id={option.value}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <Label 
                          htmlFor={option.value} 
                          className="flex items-center gap-2 font-medium cursor-pointer"
                        >
                          {option.icon}
                          <span>{option.label}</span>
                          {option.recommended && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Recommended
                            </span>
                          )}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RadioGroup>

          {/* Platform-specific note */}
          {env.os === 'ios' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  iOS may ask for permission to open your email app. 
                  This is a security feature and only needs to be approved once.
                </span>
              </p>
            </div>
          )}

          {env.os === 'android' && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-800 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Android will let you choose your preferred email app 
                  when using the default email option.
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Preference
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}