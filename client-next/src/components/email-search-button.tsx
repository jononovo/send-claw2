import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailSearchButtonProps {
  companies: any[];
  onSearchStart: () => void;
  onSearchComplete: (results: any) => void;
  isSearching: boolean;
}

export function EmailSearchButton({
  companies,
  onSearchStart,
  onSearchComplete,
  isSearching
}: EmailSearchButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="secondary"
          disabled={isSearching || !companies || companies.length === 0}
          onClick={onSearchStart}
          className="flex items-center gap-2"
        >
          <Mail className={isSearching ? "animate-spin" : ""} />
          {isSearching ? "Searching..." : "Search Emails"}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>Run core search to acquire at least five emails from different companies</p>
      </TooltipContent>
    </Tooltip>
  );
}