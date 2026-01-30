/**
 * Email Fallback Hook
 * Main integration hook that orchestrates the email fallback system
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { environmentDetector, EnvironmentInfo } from '@/services/email-fallback/environment-detector';
import { EmailLinkGenerator, EmailOptions } from '@/services/email-fallback/email-link-generator';
import { ProtocolDetector } from '@/services/email-fallback/protocol-detector';
import { preferenceManager, EmailPreference } from '@/services/email-fallback/preference-manager';

export interface EmailFallbackOptions {
  userId?: number;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
}

export interface EmailSendResult {
  success: boolean;
  method: string;
  error?: Error;
}

export function useEmailFallback(options: EmailFallbackOptions = {}) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [showPlatformNotification, setShowPlatformNotification] = useState(false);

  // Initialize environment detection
  useEffect(() => {
    const env = environmentDetector.detect();
    setEnvironment(env);
  }, []);

  // Initialize preference manager with user ID
  useEffect(() => {
    if (options.userId) {
      preferenceManager.setUserId(options.userId);
      loadPreferences();
    }
  }, [options.userId]);

  // Load user preferences
  const loadPreferences = async () => {
    try {
      const prefs = await preferenceManager.getPreferences();
      setPreferences(prefs);
      
      // Check if we should show first-time modal
      if (!prefs.hasSeenFirstTimeModal) {
        setShowFirstTimeModal(true);
      }
    } catch (error) {
      console.error('Failed to load email preferences:', error);
    }
  };

  // Save user preference
  const savePreference = async (preference: EmailPreference) => {
    try {
      await preferenceManager.savePreferences({ preferredMethod: preference });
      await preferenceManager.markNotificationSeen('firstTime');
      setShowFirstTimeModal(false);
      await loadPreferences();
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  };

  // Send email with intelligent fallback
  const sendEmail = useCallback(async (emailOptions: EmailOptions): Promise<EmailSendResult> => {
    setIsProcessing(true);

    try {
      // Get user's preferred method or smart default
      const method = await preferenceManager.getEmailMethod();
      
      // Check if we should show platform notification
      if (environment) {
        const notification = environmentDetector.getPlatformNotification();
        if (notification && await preferenceManager.shouldShowNotification(
          environment.os === 'ios' ? 'ios' : environment.os === 'android' ? 'android' : 'firstTime'
        )) {
          setShowPlatformNotification(true);
          
          // Mark notification as seen
          await preferenceManager.markNotificationSeen(
            environment.os === 'ios' ? 'ios' : 'android'
          );
          
          // Add delay for user to read notification
          await new Promise(resolve => setTimeout(resolve, notification.delay));
        }
      }

      // Execute the email send based on method
      let result: EmailSendResult;
      
      switch (method) {
        case 'mailto': {
          // Generate and attempt to open mailto link
          const mailtoUrl = EmailLinkGenerator.generateMailtoLink(emailOptions);
          const detection = await ProtocolDetector.detectMailtoSuccess(mailtoUrl);
          
          if (detection.success) {
            result = { success: true, method: 'mailto' };
            toast({
              title: "Email Client Opened",
              description: "Your email client should have opened with the message",
            });
          } else {
            // Fallback to Gmail if mailto failed
            EmailLinkGenerator.openEmailLink('gmail', emailOptions);
            result = { success: true, method: 'gmail' };
            toast({
              title: "Opening Gmail",
              description: "Opening Gmail in a new tab as fallback",
            });
          }
          break;
        }
        
        case 'gmail':
        case 'outlook':
        case 'yahoo': {
          // Open web-based email
          EmailLinkGenerator.openEmailLink(method, emailOptions);
          result = { success: true, method };
          toast({
            title: `Opening ${method.charAt(0).toUpperCase() + method.slice(1)}`,
            description: "Email compose window opening in a new tab",
          });
          break;
        }
        
        case 'copy': {
          // Copy to clipboard
          const success = await EmailLinkGenerator.copyToClipboard(emailOptions);
          result = { success, method: 'copy' };
          
          if (success) {
            toast({
              title: "Email Details Copied",
              description: "Email details have been copied to your clipboard",
            });
          } else {
            throw new Error('Failed to copy to clipboard');
          }
          break;
        }
        
        default:
          throw new Error(`Unknown email method: ${method}`);
      }

      // Track success
      await preferenceManager.trackEmailSend(method, result.success);
      
      // Call success callback
      if (result.success && options.onSuccess) {
        options.onSuccess();
      }
      
      return result;
      
    } catch (error) {
      console.error('Email send failed:', error);
      
      // Track failure
      if (preferences) {
        const method = await preferenceManager.getEmailMethod();
        await preferenceManager.trackEmailSend(method, false);
      }
      
      // Show error toast
      toast({
        title: "Email Send Failed",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive"
      });
      
      // Call failure callback
      if (options.onFailure) {
        options.onFailure(error instanceof Error ? error : new Error('Unknown error'));
      }
      
      return {
        success: false,
        method: 'unknown',
        error: error instanceof Error ? error : new Error('Unknown error')
      };
      
    } finally {
      setIsProcessing(false);
      setShowPlatformNotification(false);
    }
  }, [environment, preferences, options, toast]);

  // Open specific email method directly
  const openEmailMethod = useCallback((
    method: 'mailto' | 'gmail' | 'outlook' | 'yahoo' | 'copy',
    emailOptions: EmailOptions
  ) => {
    if (method === 'copy') {
      EmailLinkGenerator.copyToClipboard(emailOptions).then(success => {
        if (success) {
          toast({
            title: "Copied!",
            description: "Email details copied to clipboard",
          });
        }
      });
    } else {
      EmailLinkGenerator.openEmailLink(method, emailOptions);
    }
  }, [toast]);

  // Get platform-specific button text
  const getButtonText = useCallback((): string => {
    if (!environment) return 'Send Email';
    
    if (environment.os === 'ios') {
      return 'Send Email';
    }
    if (environment.os === 'android') {
      return 'Send Email';
    }
    return 'Send Email';
  }, [environment]);

  // Get platform-specific tooltip
  const getTooltip = useCallback((): string => {
    if (!environment) return 'Send email';
    
    if (environment.os === 'ios') {
      return 'iOS will ask for permission to open your email app';
    }
    if (environment.os === 'android') {
      return 'You may need to select your email app';
    }
    if (!environment.hasEmailClient) {
      return 'Opens Gmail or your preferred web email';
    }
    return 'Opens your default email client';
  }, [environment]);

  return {
    // State
    isProcessing,
    environment,
    preferences,
    showFirstTimeModal,
    showPlatformNotification,
    
    // Actions
    sendEmail,
    openEmailMethod,
    savePreference,
    loadPreferences,
    
    // Helpers
    getButtonText,
    getTooltip,
    
    // Setters for modal control
    setShowFirstTimeModal,
    setShowPlatformNotification
  };
}