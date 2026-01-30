import { Progress } from "@/components/ui/progress";
import type { SearchProgressState } from "./types";

export function SearchProgressIndicator({ 
  phase, 
  completed, 
  total,
  isVisible
}: SearchProgressState) {
  if (!isVisible) return null;
  
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isInProgress = percentComplete < 100 && percentComplete > 0;
  
  return (
    <div className="mt-3 mb-1 w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium">
          {phase}
        </span>
        <span className="text-xs text-muted-foreground">{percentComplete}%</span>
      </div>
      <Progress value={percentComplete} className="h-1.5" showShimmer={isInProgress} />
    </div>
  );
}
