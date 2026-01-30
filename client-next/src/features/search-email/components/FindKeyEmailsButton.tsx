import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FindKeyEmailsButtonProps {
  onSearch: () => void;
  isSearching?: boolean;
  className?: string;
}

export function FindKeyEmailsButton({
  onSearch,
  isSearching = false,
  className
}: FindKeyEmailsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onSearch}
      disabled={isSearching}
      className={cn(
        "px-2 h-6 text-[11px] font-medium transition-all",
        "hover:bg-muted/50 text-gray-400/60 hover:text-gray-500",
        className
      )}
      data-testid="find-emails-button"
    >
      <Mail className={cn("h-3 w-3 mr-0.5", isSearching && "animate-spin")} />
      {isSearching ? "Searching..." : "Find Emails"}
    </Button>
  );
}
