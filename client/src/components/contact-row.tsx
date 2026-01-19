import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, Star, ThumbsDown, Linkedin, Phone, Loader2 } from "lucide-react";
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
  handleFindMobilePhone?: (contactId: number) => void;
  onContactFeedback?: (contactId: number, feedbackType: "excellent" | "terrible") => void;
  pendingComprehensiveSearchIds?: Set<number>;
  pendingPhoneRevealIds?: Set<number>;
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
  handleFindMobilePhone,
  onContactFeedback,
  pendingComprehensiveSearchIds,
  pendingPhoneRevealIds,
}: ContactRowProps) {
  return (
    <div
      className={cn(
        "group flex items-center p-2 rounded-md cursor-pointer bg-card hover:bg-card-hover hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
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
              {(contact.city || contact.country) && (
                <span className="text-muted-foreground/70">
                  {" • "}
                  {[contact.city, contact.country].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
            {showCompanyName && contact.companyName && (
              <div className="text-xs text-muted-foreground/70 mt-0.5">
                {contact.companyName}
              </div>
            )}
            <div className="text-xs mt-0.5 flex items-baseline gap-1">
              {contact.email ? (
                <span className="text-muted-foreground">{contact.email}</span>
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
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground/60 hover:text-blue-500 transition-colors"
                  data-testid={`linkedin-link-${contact.id}`}
                >
                  <Linkedin className="h-3 w-3" />
                </a>
              )}
              {contact.phoneNumber ? (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span 
                        className="text-muted-foreground/60 hover:text-green-500 transition-colors cursor-help"
                        data-testid={`phone-${contact.id}`}
                      >
                        <Phone className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>{contact.phoneNumber}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (contact as any).mobilePhoneStatus === 'pending' ? (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-yellow-500 flex items-center gap-0.5 cursor-help">
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>Finding phone...</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (contact as any).mobilePhoneStatus === 'not_found' ? (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground/60 cursor-help">
                        <Phone className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>No mobile found</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : handleFindMobilePhone && !(contact as any).mobilePhoneStatus ? (
                <Button
                  variant="small-search-action"
                  className="group/phone"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFindMobilePhone(contact.id);
                  }}
                  disabled={pendingPhoneRevealIds?.has(contact.id)}
                  title="Find mobile phone"
                >
                  {pendingPhoneRevealIds?.has(contact.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Phone className="h-3 w-3" />
                      <span className="hidden group-hover/phone:inline text-xs ml-0.5">Find Phone</span>
                    </>
                  )}
                </Button>
              ) : null}
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
