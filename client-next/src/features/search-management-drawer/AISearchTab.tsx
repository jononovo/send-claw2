import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AISearchTabProps {
  onTrainAI: () => void;
  hasSearchResults: boolean;
}

export function AISearchTab({ onTrainAI, hasSearchResults }: AISearchTabProps) {
  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          Train the AI to better understand your ideal customer profile based on your search results.
        </p>
        {!hasSearchResults && (
          <p className="text-xs text-muted-foreground/70">
            Run a search first to enable AI training on your results.
          </p>
        )}
      </div>
      
      {/* Main Button */}
      <Button
        onClick={onTrainAI}
        disabled={!hasSearchResults}
        className="w-full flex items-center gap-2"
        variant="default"
        data-testid="button-train-ai"
      >
        <Brain className="h-4 w-4" />
        Train AI on Results
      </Button>
      
      {/* Info Section */}
      <div className="mt-6 p-3 bg-muted/50 rounded-lg">
        <h3 className="text-xs font-medium mb-1">How it works:</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Review your search results</li>
          <li>• Confirm which companies match your target market</li>
          <li>• AI learns from your feedback to improve future searches</li>
        </ul>
      </div>
    </div>
  );
}