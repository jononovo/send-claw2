import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

export function BlurredEmailTeaser() {
  const { openModal } = useRegistrationModal();

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openModal();
            }}
            className="flex items-center gap-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <span className="blur-[3px] select-none">email@company.com</span>
            <Lock className="h-3 w-3 flex-shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-2">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-xs">Sign in to see email</p>
            <Button 
              size="sm" 
              className="h-6 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                openModal();
              }}
            >
              Sign up free
            </Button>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
