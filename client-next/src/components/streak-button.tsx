import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useDeferredQuery } from "@/hooks/use-deferred-query";

interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
  availableCompanies: number;
  availableContacts: number;
  emailsSentToday: number;
  emailsSentThisWeek: number;
  emailsSentThisMonth: number;
  emailsSentAllTime: number;
  companiesContactedThisWeek: number;
  companiesContactedThisMonth: number;
  companiesContactedAllTime: number;
  todaysBatch?: {
    id: number;
    token: string;
    createdAt: string;
    itemCount: number;
  };
}

export function StreakButton() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useDeferredQuery<StreakStats>({
    queryKey: ['/api/daily-outreach/streak-stats'],
    refetchInterval: 30000,
    retry: false,
    enabled: !!user,
  });

  // Don't render for unauthenticated users
  if (!user) {
    return null;
  }

  const streakCount = stats?.currentStreak || 0;
  
  // Get flame color based on streak length
  const getFlameColor = () => {
    if (streakCount >= 30) return "text-orange-600";
    if (streakCount >= 14) return "text-orange-500";
    if (streakCount >= 7) return "text-yellow-500";
    if (streakCount >= 3) return "text-yellow-400";
    return "text-gray-400";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/streak">
            <Button
              variant="ghost"
              className="group relative flex items-center text-sm font-medium h-auto p-2 hover:bg-accent-hover hover:text-accent-foreground transition-all overflow-hidden"
              data-testid="button-streak"
            >
              <Flame className={cn(
                "h-4 w-4 transition-all",
                isLoading ? "animate-pulse text-gray-400" : getFlameColor()
              )} />
              <div className="flex items-center max-w-0 opacity-0 group-hover:max-w-[60px] group-hover:opacity-100 transition-all duration-200 ease-in-out overflow-hidden">
                <span className={cn(
                  "text-sm font-medium ml-2",
                  streakCount === 0 ? "text-muted-foreground" : "text-foreground"
                )}>
                  {isLoading ? "..." : streakCount}
                </span>
              </div>
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Streak: Number of consecutive days you were active on scheduled days.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}