import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Mail, Copy, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { environmentDetector } from '@/services/email-fallback/environment-detector';
import { EmailLinkGenerator } from '@/services/email-fallback/email-link-generator';
import { EmailOptions } from '@/services/email-fallback/email-link-generator';
// Modal components are not yet implemented
// import { PlatformNotificationModal } from './PlatformNotificationModal';
// import { EmailFallbackModal } from './EmailFallbackModal';
import { cn } from '@/lib/utils';
import { resolveAllMergeFields } from '@/lib/merge-field-resolver';
import type { Contact, Company } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

interface EmailSendButtonProps {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  contact?: Contact;
  company?: Company;
  isGmailAuthenticated?: boolean;
  onSendViaGmail?: () => void;
  onManualSend?: () => void;
  isPending?: boolean;
  isSuccess?: boolean;
  className?: string;
  disabled?: boolean;
}

export function EmailSendButton({
  to,
  subject,
  body,
  cc,
  bcc,
  contact,
  company,
  isGmailAuthenticated = false,
  onSendViaGmail,
  onManualSend,
  isPending = false,
  isSuccess = false,
  className,
  disabled = false
}: EmailSendButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showPlatformNotification, setShowPlatformNotification] = useState(false);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [platformNotification, setPlatformNotification] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);

  // Resolve merge fields if contact and company are provided
  const resolvedSubject = contact && company ? resolveAllMergeFields(subject, {
    contact: {
      name: contact.name,
      role: contact.role || undefined,
      email: contact.email || undefined
    },
    company: {
      name: company.name
    },
    sender: { name: user?.username || user?.email || 'Sender' }
  }) : subject;

  const resolvedBody = contact && company ? resolveAllMergeFields(body, {
    contact: {
      name: contact.name,
      role: contact.role || undefined,
      email: contact.email || undefined
    },
    company: {
      name: company.name
    },
    sender: { name: user?.username || user?.email || 'Sender' }
  }) : body;

  const emailOptions: EmailOptions = { to, subject: resolvedSubject, body: resolvedBody, cc, bcc };
  const env = environmentDetector.detect();

  useEffect(() => {
    // Get platform notification if needed
    const notification = environmentDetector.getPlatformNotification();
    if (notification) {
      setPlatformNotification(notification);
    }
  }, []);

  // Validate email fields
  const validateFields = () => {
    // Check both subject and body have content
    const hasContent = resolvedBody?.trim() && resolvedSubject?.trim();
    
    if (!hasContent) {
      // Trigger error state
      setValidationError(true);
      setShowErrorTooltip(true);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setValidationError(false);
        setShowErrorTooltip(false);
      }, 2000);
      
      return false;
    }
    return true;
  };

  // Handle send via authenticated Gmail
  const handleGmailSend = () => {
    // Validate before sending
    if (!validateFields()) {
      return;
    }
    
    if (onSendViaGmail) {
      onSendViaGmail();
    }
  };

  // Handle fallback email methods
  const handleFallbackSend = async (method: 'mailto' | 'gmail' | 'outlook' | 'yahoo' | 'copy') => {
    // Validate before processing
    if (!validateFields()) {
      return;
    }
    
    setIsProcessing(true);

    try {
      if (method === 'copy') {
        const success = await EmailLinkGenerator.copyToClipboard(emailOptions);
        if (success) {
          toast({
            title: "Email Details Copied",
            description: "Email details have been copied to your clipboard",
          });
        } else {
          toast({
            title: "Copy Failed",
            description: "Failed to copy email details. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        // Show platform notification if needed
        if (method === 'mailto' && platformNotification && !env.isMobile) {
          setShowPlatformNotification(true);
          // Delay opening mailto to let user read notification
          setTimeout(() => {
            EmailLinkGenerator.openEmailLink(method, emailOptions);
          }, platformNotification.delay || 1000);
        } else {
          EmailLinkGenerator.openEmailLink(method, emailOptions);
        }
        
        toast({
          title: "Opening Email Client",
          description: method === 'mailto' 
            ? "Your default email client should open shortly"
            : `Opening ${method.charAt(0).toUpperCase() + method.slice(1)} in a new tab`,
        });
        
        // Trigger the manual send callback for confirmation modal
        if (onManualSend) {
          // Small delay to allow email client to open first
          setTimeout(() => {
            onManualSend();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      toast({
        title: "Email Send Failed",
        description: "Please try a different method or copy the email details",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setShowFallbackModal(false);
    }
  };

  // Determine button text based on state and environment
  const getButtonText = () => {
    if (isPending || isProcessing) return '';
    if (isSuccess) return 'Sent Email';
    if (isGmailAuthenticated) return 'Send Email';
    
    // Platform-specific text when not authenticated
    if (env.os === 'ios') return 'Send Email';
    if (env.os === 'android') return 'Send Email';
    return 'Send Email';
  };

  // If Gmail is authenticated, show simple button
  if (isGmailAuthenticated) {
    return (
      <TooltipProvider>
        <Tooltip open={showErrorTooltip}>
          <TooltipTrigger asChild>
            <Button
              onClick={handleGmailSend}
              disabled={disabled || isPending}
              variant="outline"
              className={cn(
                "h-8 px-3 text-xs border transition-all duration-300 ease-out",
                // Better visibility: green theme when there's content, subtle when empty
                body?.trim() ? 
                  "bg-green-50 text-green-700 border-green-300 hover:bg-green-600 hover:text-white hover:border-green-600 hover:scale-105" :
                  "bg-white text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600 hover:border-gray-300",
                isSuccess && "bg-pink-500 hover:bg-pink-600 text-white border-pink-500",
                validationError && "shake-animation",
                disabled && "opacity-50 cursor-not-allowed",
                className
              )}
            >
              {isPending ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : isSuccess ? (
                <>
                  <Mail className="w-3 h-3 mr-1" />
                  Sent Email
                </>
              ) : (
                <>
                  <Send className="w-3 h-3 mr-1" />
                  Send Email
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Please add content to email body and subject before sending</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // If Gmail not authenticated, show single button that opens default email client
  return (
    <>
      <TooltipProvider>
        <Tooltip open={showErrorTooltip}>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex rounded-md shadow-sm", className)}>
              {/* Main Button - Default email client as primary action */}
              <Button
                onClick={() => handleFallbackSend('mailto')}
                disabled={disabled || isProcessing}
                variant="outline"
                className={cn(
                  "h-8 px-3 text-xs border transition-all duration-300 ease-out",
                  // Better visibility: green theme when there's content, subtle when empty
                  body?.trim() ? 
                    "bg-green-50 text-green-700 border-green-300 hover:bg-green-600 hover:text-white hover:border-green-600" :
                    "bg-white text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600 hover:border-gray-300",
                  isSuccess && "bg-pink-500 hover:bg-pink-600 text-white border-pink-500",
                  "rounded-r-none border-r-0",
                  validationError && "shake-animation",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : isSuccess ? (
                  <>
                    <Mail className="w-3 h-3 mr-1" />
                    Sent Email
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    Send Email
                  </>
                )}
              </Button>

        {/* Dropdown Button - Shows menu with all options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={disabled || isProcessing}
              variant="outline"
              className={cn(
                "h-8 px-2 text-xs border transition-all duration-300 ease-out",
                // Match the main button's green theme
                body?.trim() ? 
                  "bg-green-50 text-green-700 border-green-300 hover:bg-green-600 hover:text-white hover:border-green-600" :
                  "bg-white text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600 hover:border-gray-300",
                isSuccess && "bg-pink-500 hover:bg-pink-600 text-white border-pink-500",
                "rounded-l-none border-l",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-label="More email options"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem 
            onClick={() => handleFallbackSend('mailto')}
            className="cursor-pointer"
          >
            <Mail className="mr-2 h-4 w-4" />
            Open Default Email App
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleFallbackSend('gmail')}
            className="cursor-pointer"
          >
            <Mail className="mr-2 h-4 w-4 text-red-500" />
            Open in Gmail
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleFallbackSend('outlook')}
            className="cursor-pointer"
          >
            <Mail className="mr-2 h-4 w-4 text-blue-500" />
            Open in Outlook
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => handleFallbackSend('copy')}
            className="cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Email Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowFallbackModal(true)}
            className="cursor-pointer text-muted-foreground"
          >
            More Options...
          </DropdownMenuItem>
        </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Please add content to email body and subject before sending</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Modal components not yet implemented */}
      {/* {platformNotification && (
        <PlatformNotificationModal
          open={showPlatformNotification}
          onOpenChange={setShowPlatformNotification}
          notification={platformNotification}
        />
      )} */}

      {/* <EmailFallbackModal
        open={showFallbackModal}
        onOpenChange={setShowFallbackModal}
        emailOptions={emailOptions}
        onSelectMethod={handleFallbackSend}
      /> */}
    </>
  );
}