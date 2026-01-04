import { useQuery } from "@tanstack/react-query";
import { Coins, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface CreditData {
  balance: number;
  isBlocked: boolean;
  lastTopUp: number;
  totalUsed: number;
  monthlyAllowance: number;
}

export function CreditsDisplay() {
  const { user } = useAuth();
  
  const { data: credits, isLoading } = useQuery<CreditData>({
    queryKey: ['/api/credits'],
    enabled: !!user,
  });

  // Don't render for unauthenticated users
  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground"
        data-credits-target
        data-testid="credits-display"
      >
        <Coins className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!credits || typeof credits.balance !== 'number') {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground"
        data-credits-target
        data-testid="credits-display"
      >
        <Coins className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 text-sm font-medium"
      data-credits-target
      data-testid="credits-display"
    >
      <Coins className={cn(
        "h-4 w-4",
        credits.balance >= 1 ? "text-yellow-500" : "text-red-600"
      )} />
      <span className="text-muted-foreground">
        {credits.balance < 0 ? credits.balance : `${(credits.balance ?? 0).toLocaleString()}`}
      </span>
    </div>
  );
}