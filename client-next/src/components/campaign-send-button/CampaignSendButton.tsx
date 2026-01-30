import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Rocket, FileText, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RecipientSelection } from '@/components/recipient-selection-modal';

interface CampaignSendButtonProps {
  recipients?: RecipientSelection | null;
  listId?: number | null;
  currentQuery?: string | null;
  subject?: string;
  body?: string;
  onSchedule?: () => void;
  onStartNow?: () => void;
  onSaveDraft?: () => void;
  isPending?: boolean;
  isSuccess?: boolean;
  className?: string;
  disabled?: boolean;
}

export function CampaignSendButton({
  recipients,
  listId,
  currentQuery,
  subject,
  body,
  onSchedule,
  onStartNow,
  onSaveDraft,
  isPending = false,
  isSuccess = false,
  className,
  disabled = false
}: CampaignSendButtonProps) {
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const [validationError, setValidationError] = useState(false);

  // Check if we have valid recipients (campaign recipients, list ID, or current query)
  const hasRecipients = !!(recipients || listId || currentQuery);
  const hasContent = !!(body?.trim() && subject?.trim());
  
  // Only disable when explicitly disabled or pending (not just when missing content)
  // This matches EmailSendButton behavior
  const isDisabled = disabled || isPending;

  // Handle main button click (Schedule Campaign)
  const handleMainClick = () => {
    if (!hasContent) {
      // Trigger error state
      setValidationError(true);
      setShowErrorTooltip(true);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setValidationError(false);
        setShowErrorTooltip(false);
      }, 2000);
      
      return;
    }
    
    if (onSchedule) {
      onSchedule();
    }
  };

  // Campaign buttons always render as split button (no auth variations)
  return (
    <>
      <TooltipProvider>
        <Tooltip open={showErrorTooltip}>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex rounded-md shadow-sm", className)}>
              {/* Main Button - Schedule Campaign */}
              <Button
                onClick={handleMainClick}
                disabled={isDisabled}
                variant="outline"
                className={cn(
                  "h-8 px-3 text-xs border transition-all duration-300 ease-out",
                  // Green theme when there's content, subtle when empty
                  hasContent ? 
                    "bg-green-50 text-green-700 border-green-300 hover:bg-green-600 hover:text-white hover:border-green-600" :
                    "bg-white text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600 hover:border-gray-300",
                  isSuccess && "bg-pink-500 hover:bg-pink-600 text-white border-pink-500",
                  "rounded-r-none border-r-0",
                  validationError && "shake-animation",
                  // Match EmailSendButton: add opacity-50 only when explicitly disabled
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : isSuccess ? (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    Campaign Created
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    Schedule Campaign
                  </>
                )}
              </Button>

              {/* Dropdown Button - Shows menu with options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={isDisabled}
                    variant="outline"
                    className={cn(
                      "h-8 px-2 text-xs border transition-all duration-300 ease-out",
                      // Match the main button's green theme
                      hasContent ? 
                        "bg-green-50 text-green-700 border-green-300 hover:bg-green-600 hover:text-white hover:border-green-600" :
                        "bg-white text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600 hover:border-gray-300",
                      isSuccess && "bg-pink-500 hover:bg-pink-600 text-white border-pink-500",
                      "rounded-l-none border-l",
                      // Match EmailSendButton: add opacity-50 only when explicitly disabled
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                    aria-label="More campaign options"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={onStartNow}
                    className="cursor-pointer"
                    disabled={isPending || !hasRecipients || !hasContent}
                  >
                    <Rocket className="mr-2 h-4 w-4 text-green-600" />
                    Start Now
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={onSaveDraft}
                    className="cursor-pointer"
                    disabled={isPending || !hasRecipients || !hasContent}
                  >
                    <FileText className="mr-2 h-4 w-4 text-blue-600" />
                    Save as Draft
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {!hasRecipients 
                ? "Please select campaign recipients" 
                : "Please add content to email body and subject before creating campaign"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}