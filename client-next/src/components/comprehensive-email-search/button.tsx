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
      return <Loader2 className={cn(iconSize, "animate-spin text-blue-500")} />;
    }
    if (state === 'failed') {
      return (
        <div className="flex items-center gap-0.5">
          <Mail className={cn(iconSize, "text-gray-400 group-hover:text-yellow-500 hover:text-blue-500 transition-colors")} />
          <Ban className="text-gray-400" style={{ width: '10px', height: '10px' }} />
        </div>
      );
    }
    return <Mail className={cn(iconSize, "text-gray-400 group-hover:text-green-600/70 hover:text-blue-500 transition-colors")} />;
  };

  if (displayMode === 'text') {
    // Outreach page style - text link
    const buttonText = state === 'failed' ? 'No email found' : state === 'pending' ? 'Searching...' : 'Find email';
    
    return (
      <button
        className={cn(
          "flex items-center gap-1.5 text-muted-foreground hover:text-blue-600 transition-colors",
          state === 'failed' && "opacity-75",
          className
        )}
        onClick={handleClick}
        disabled={isPending}
        title={tooltipMessage}
      >
        {renderIcon()}
        <span className="text-xs">{buttonText}</span>
      </button>
    );
  }

  // Icon-only mode with tooltip (Search page style)
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-4 w-4 p-0", className)}
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