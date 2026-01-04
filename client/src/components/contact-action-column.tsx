import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

export interface ContactActionColumnProps {
  contact: ContactWithCompanyInfo;
  standalone?: boolean;
  handleContactView?: (contact: { id: number; slug?: string | null; name: string }) => void;
  className?: string;
}

export function ContactActionColumn({
  contact,
  standalone = false,
  handleContactView,
  className = '',
}: ContactActionColumnProps) {
  
  const content = (
    <div className={`flex items-center justify-center ${className}`}>
      {handleContactView && (
        <div onClick={(e) => e.stopPropagation()}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleContactView(contact)}
                  data-testid={`button-view-contact-${contact.id}`}
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Contact</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
  
  return standalone ? content : <TableCell>{content}</TableCell>;
}
