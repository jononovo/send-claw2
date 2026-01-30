import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActivationCardProps {
  isEnabled: boolean;
  daysPerWeek: number;
  hasProduct: boolean;
  hasSenderProfile: boolean;
  hasCustomerProfile: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function ActivationCard({
  isEnabled,
  daysPerWeek,
  hasProduct,
  hasSenderProfile,
  hasCustomerProfile,
  onActivate,
  onDeactivate
}: ActivationCardProps) {
  const { toast } = useToast();
  
  // Validate all required components before activation
  const handleActivate = () => {
    // Check each required component and provide specific feedback
    if (!hasSenderProfile) {
      toast({
        title: "Setup Required",
        description: "Please add your sender identity first (Box 1)",
        variant: "destructive"
      });
      return;
    }
    
    if (!hasProduct) {
      toast({
        title: "Setup Required",
        description: "Please add your product information first (Box 2)",
        variant: "destructive"
      });
      return;
    }
    
    if (!hasCustomerProfile) {
      toast({
        title: "Setup Required",
        description: "Please define your ideal customer first (Box 3)",
        variant: "destructive"
      });
      return;
    }
    
    // All components configured - proceed with activation
    onActivate();
  };

  return (
    <Card className={cn(
      "relative transition-all",
      isEnabled 
        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
        : "hover:shadow-lg"
    )}>
      <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] p-4">
        {/* Progress indicators at the top */}
        <div className="flex gap-2 mb-4">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            hasSenderProfile 
              ? "bg-green-100 dark:bg-green-900/50 border-2 border-green-500" 
              : "bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"
          )}>
            {hasSenderProfile ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <span className="text-xs text-gray-400">1</span>
            )}
          </div>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            hasProduct 
              ? "bg-green-100 dark:bg-green-900/50 border-2 border-green-500" 
              : "bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"
          )}>
            {hasProduct ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <span className="text-xs text-gray-400">2</span>
            )}
          </div>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            hasCustomerProfile 
              ? "bg-green-100 dark:bg-green-900/50 border-2 border-green-500" 
              : "bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"
          )}>
            {hasCustomerProfile ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <span className="text-xs text-gray-400">3</span>
            )}
          </div>
        </div>
        
        {isEnabled ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-3">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Campaign Active
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Sending {daysPerWeek} days/week
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onDeactivate}
            >
              Pause Campaign
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Button
              size="lg"
              className="h-16 w-16 rounded-full p-0 mb-3"
              onClick={handleActivate}
              disabled={!hasProduct || !hasSenderProfile || !hasCustomerProfile}
              title={!hasProduct || !hasSenderProfile || !hasCustomerProfile ? "Complete all setup steps first" : "Start your campaign"}
            >
              <Play className="h-8 w-8 ml-1" />
            </Button>
            <p className="text-sm font-medium">
              Start Campaign
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Launch daily outreach
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}