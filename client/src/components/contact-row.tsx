import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Star, ThumbsDown, Linkedin } from "lucide-react";
import { ContactActionColumn } from "@/components/contact-action-column";
import { ComprehensiveSearchButton } from "@/components/comprehensive-email-search";
import { cn } from "@/lib/utils";
import type { Contact } from "@shared/schema";
import { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

export interface ContactRowProps {
  contact: ContactWithCompanyInfo;
  isSelected?: boolean;
  onToggleSelection?: (contactId: number) => void;
  onClick?: () => void;
  onHover?: (contactId: number) => void;
  onLeave?: () => void;
  showCheckbox?: boolean;
  showCompanyName?: boolean;
  showFeedback?: boolean;
  isHighlighted?: boolean;
  hasEmail?: boolean;
  handleContactView?: (contact: { id: number; slug?: string | null; name: string }) => void;
  handleComprehensiveEmailSearch?: (contactId: number) => void;
  onContactFeedback?: (contactId: number, feedbackType: "excellent" | "terrible") => void;
  pendingComprehensiveSearchIds?: Set<number>;
}

export function ContactRow({
  contact,
  isSelected = false,
  onToggleSelection,
  onClick,
  onHover,
  onLeave,
  showCheckbox = true,
  showCompanyName = false,
  showFeedback = false,
  isHighlighted = false,
  handleContactView,
  handleComprehensiveEmailSearch,
  onContactFeedback,
  pendingComprehensiveSearchIds,
}: ContactRowProps) {
  return (
    <div
      className={cn(
        "group flex items-center p-2 rounded-md cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        isHighlighted
          ? contact.email
            ? "border-l-4 border-dashed border-yellow-400/40 border-4 border-yellow-400/20 border-dashed shadow-md"
            : "border-l-4 border-dotted border-gray-400 border-4 border-gray-300/50 border-dotted shadow-md"
          : "",
        isSelected && "bg-blue-50/30 dark:bg-blue-950/10"
      )}
      onClick={onClick}
      onMouseEnter={() => onHover?.(contact.id)}
      onMouseLeave={() => onLeave?.()}
      data-testid={`contact-row-${contact.id}`}
    >
      {showCheckbox && onToggleSelection && (
        <div className="w-6 mr-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(contact.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${contact.name}`}
            className="mt-0.5"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="font-medium text-sm">{contact.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {contact.role || "No role specified"}
            </div>
            {showCompanyName && contact.companyName && (
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                {contact.companyName}
              </div>
            )}
            <div className="text-xs mt-1 flex items-center gap-1.5">
              {contact.email ? (
                <>
                  <span className="text-gray-600">{contact.email}</span>
                  {contact.linkedinUrl && (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      data-testid={`linkedin-link-${contact.id}`}
                    >
                      <Linkedin className="h-3 w-3" />
                    </a>
                  )}
                </>
              ) : (
                handleComprehensiveEmailSearch && (
                  <ComprehensiveSearchButton
                    contact={contact}
                    onSearch={handleComprehensiveEmailSearch}
                    isPending={pendingComprehensiveSearchIds?.has(contact.id)}
                    displayMode="text"
                  />
                )
              )}
              {contact.alternativeEmails && contact.alternativeEmails.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {contact.alternativeEmails.map((altEmail, index) => (
                    <div key={index} className="text-xs text-muted-foreground/70 italic">
                      {altEmail}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {contact.probability && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Badge variant="secondary" className="text-xs cursor-help">
                        {contact.probability}%
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Score reflects the contact's affinity to the target role/designation searched.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <ContactActionColumn
              contact={contact}
              handleContactView={handleContactView}
              standalone={true}
            />

            {showFeedback && onContactFeedback && (
              <TooltipProvider delayDuration={500}>
                <Tooltip>
                  <DropdownMenu>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 ml-1"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-feedback-${contact.id}`}
                        >
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onContactFeedback(contact.id, "excellent")}>
                        <Star className="h-4 w-4 mr-2 text-yellow-500" />
                        Excellent Match
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onContactFeedback(contact.id, "terrible")}>
                        <ThumbsDown className="h-4 w-4 mr-2 text-red-500" />
                        Not a Match
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <TooltipContent>
                    <p>Rate this contact</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
