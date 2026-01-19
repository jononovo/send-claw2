import React from 'react';
import { Mail, Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ComprehensiveSearchButtonProps, SearchState } from './types';

export function ComprehensiveSearchButton({
  contact,
  onSearch,
  isPending = false,
  displayMode = 'icon',
  size = 'sm',
  className
}: ComprehensiveSearchButtonProps) {
  // Don't show if email exists
  if (contact.email) return null;

  const hasFailed = contact.completedSearches?.includes('comprehensive_search') && !contact.email;
  const state: SearchState = isPending ? 'pending' : hasFailed ? 'failed' : 'default';

  const tooltipMessage = {
    default: "Click to search all sources for email",
    pending: "Searching for email...",
    failed: "Search complete. No results found. Click to search again.",
    success: ""
  }[state];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSearch(contact.id);
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  const renderIcon = () => {
    if (state === 'pending') {
      return <Loader2 className={cn(iconSize, "animate-spin")} />;
    }
    if (state === 'failed') {
      return (
        <div className="flex items-center gap-0.5">
          <Mail className={iconSize} />
          <Ban style={{ width: '10px', height: '10px' }} />
        </div>
      );
    }
    return <Mail className={iconSize} />;
  };

  if (displayMode === 'text') {
    // Outreach page style - text link
    const buttonText = state === 'failed' ? 'No email found' : state === 'pending' ? 'Searching...' : 'Find email';
    
    return (
      <Button
        variant="small-search-action"
        className={cn(
          "flex items-center gap-0 leading-none",
          state === 'failed' && "opacity-75",
          className
        )}
        onClick={handleClick}
        disabled={isPending}
        title={tooltipMessage}
      >
        {renderIcon()}
        <span className="text-xs ml-0.5">{buttonText}</span>
      </Button>
    );
  }

  // Icon-only mode with tooltip (Search page style)
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <Button
              variant="small-search-action"
              className={cn("h-4 w-4", className)}
              onClick={handleClick}
              disabled={isPending}
            >
              {renderIcon()}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}