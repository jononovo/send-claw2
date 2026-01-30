import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Type, Mail, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailSendButton } from "@/components/email-fallback/EmailSendButton";
import { CampaignSendButton } from "@/components/campaign-send-button/CampaignSendButton";
import type { EmailFormProps } from "./types";

export default function EmailForm({
  drawerMode,
  toEmail,
  emailSubject,
  originalEmailSubject,
  emailContent,
  originalEmailContent,
  onSubjectChange,
  onContentChange,
  gmailStatus,
  gmailUserInfo,
  isGmailButtonHovered,
  onGmailButtonHover,
  onGmailConnect,
  sendEmailMutation,
  isSent,
  selectedContact,
  selectedCompany,
  onSendEmail,
  onManualSend,
  campaignRecipients,
  currentListId,
  currentQuery,
  onCreateCampaign,
  generationType,
  creatingCampaign,
  isMergeViewMode,
  getDisplayValue,
  isExpanded,
  isMobile
}: EmailFormProps) {
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailContentRef = useRef<HTMLTextAreaElement>(null);

  const handleTextareaResize = () => {
    if (emailContentRef.current) {
      if (isMobile) {
        return;
      }
      emailContentRef.current.style.height = 'auto';
      const scrollHeight = emailContentRef.current.scrollHeight;
      emailContentRef.current.style.height = Math.min(scrollHeight, 400) + 'px';
    }
  };

  useEffect(() => {
    handleTextareaResize();
  }, [emailContent]);

  return (
    <div className={isMobile ? "flex flex-col h-full" : ""}>
      {/* Email Subject Field */}
      <div className="relative border-b md:border-b-0 md:mb-6 flex-none" style={{ marginTop: '-1px' }}>
        <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={emailSubjectRef}
          placeholder="Email Subject"
          value={getDisplayValue(emailSubject, originalEmailSubject)}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="mobile-input mobile-input-text-fix pl-10 border-0 rounded-none md:border md:rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
          data-testid="input-email-subject"
        />
      </div>

      {/* Email Content Field */}
      <div className={`relative ${isMobile ? 'flex-1 min-h-0 flex flex-col' : ''}`} style={{ marginTop: '-1px' }}>
        <Textarea
          ref={emailContentRef}
          placeholder="Enter or edit the generated email content..."
          value={getDisplayValue(emailContent, originalEmailContent)}
          onChange={(e) => {
            onContentChange(e.target.value);
            handleTextareaResize();
          }}
          className={`mobile-input mobile-input-text-fix resize-none transition-all duration-200 border-0 rounded-none md:border md:rounded-b-md px-3 md:px-3 pb-12 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 ${isMobile ? 'flex-1 min-h-0' : ''}`}
          style={isMobile 
            ? { minHeight: '150px' }
            : { minHeight: isExpanded ? '400px' : '160px', maxHeight: isExpanded ? '600px' : '400px' }
          }
          data-testid="textarea-email-content"
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {/* Gmail Connection Button/Status */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {gmailStatus?.authorized ? (
                  <Button
                    onClick={onGmailConnect}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400 transition-all duration-300 group overflow-hidden"
                    style={{ 
                      width: 'auto',
                      minWidth: '32px',
                      maxWidth: '32px',
                      padding: '0 8px',
                      transition: 'max-width 0.3s ease-out, padding 0.3s ease-out'
                    }}
                    onMouseEnter={(e) => {
                      const button = e.currentTarget;
                      button.style.maxWidth = '200px';
                      button.style.padding = '0 12px';
                    }}
                    onMouseLeave={(e) => {
                      const button = e.currentTarget;
                      button.style.maxWidth = '32px';
                      button.style.padding = '0 8px';
                    }}
                    data-testid="button-gmail-connected"
                  >
                    <Mail className="w-3 h-3 shrink-0" />
                    <span 
                      className="ml-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ transitionDelay: '0.1s' }}
                    >
                      {gmailUserInfo?.email 
                        ? (gmailUserInfo as any).email.length > 20 
                          ? `${(gmailUserInfo as any).email.substring(0, 20)}...`
                          : (gmailUserInfo as any).email
                        : 'Gmail Connected'
                      }
                    </span>
                  </Button>
                ) : (
                  <Button
                    onClick={onGmailConnect}
                    onMouseEnter={() => onGmailButtonHover(true)}
                    onMouseLeave={() => onGmailButtonHover(false)}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs transition-all duration-300 ease-out overflow-hidden",
                      isGmailButtonHovered 
                        ? "px-3 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100" 
                        : "px-2 w-8 bg-muted text-muted-foreground border-border hover:bg-muted-hover"
                    )}
                    data-testid="button-gmail-connect"
                  >
                    <Lock className="w-3 h-3 shrink-0" />
                    {isGmailButtonHovered && (
                      <span className="ml-1 whitespace-nowrap">Gmail API BETA</span>
                    )}
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent>
                {gmailStatus?.authorized 
                  ? <p>Gmail connected. Click to reconnect or change account.</p>
                  : <p>Connect via Gmail API so that your emails send automatically when you click send here.</p>
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Send Email Button / Schedule Campaign Button */}
          {drawerMode === 'compose' ? (
            <EmailSendButton
              to={toEmail}
              subject={emailSubject}
              body={emailContent}
              contact={selectedContact ?? undefined}
              company={selectedCompany ?? undefined}
              isGmailAuthenticated={(gmailStatus as any)?.authorized}
              onSendViaGmail={onSendEmail}
              onManualSend={onManualSend}
              isPending={sendEmailMutation.isPending}
              isSuccess={isSent}
              className="h-8 px-3 text-xs"
            />
          ) : (
            <CampaignSendButton
              recipients={campaignRecipients}
              listId={currentListId}
              currentQuery={currentQuery}
              subject={emailSubject}
              body={emailContent}
              onSchedule={() => onCreateCampaign('scheduled')}
              onStartNow={() => onCreateCampaign('immediate')}
              onSaveDraft={() => onCreateCampaign('draft')}
              isPending={creatingCampaign}
              isSuccess={false}
              className="h-8 px-3 text-xs"
            />
          )}
        </div>
      </div>
    </div>
  );
}