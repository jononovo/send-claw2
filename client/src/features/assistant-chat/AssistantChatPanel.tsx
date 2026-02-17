import { useState, useRef, useEffect } from "react";
import { 
  X, 
  Send, 
  Sparkles, 
  Search, 
  MapPin, 
  Mail, 
  User, 
  Filter, 
  Building2, 
  Briefcase,
  Loader2,
  ChevronRight,
  Bot,
  StopCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import type { AssistantMessage, SearchContext, AssistantAction } from "./types";

const QUICK_ACTIONS = [
  { id: "expand", icon: Search, label: "Find more results", message: "Find more companies and contacts similar to these results" },
  { id: "location", icon: MapPin, label: "Expand location", message: "Expand the search to include nearby regions" },
  { id: "emails", icon: Mail, label: "Find emails", message: "Find email addresses for contacts that don't have them" },
  { id: "seniority", icon: User, label: "Senior roles only", message: "Filter to show only senior-level contacts (Directors, VPs, C-level)" },
  { id: "narrow", icon: Filter, label: "Narrow results", message: "Help me narrow down these results to the most relevant contacts" },
];

interface MessageBubbleProps {
  message: AssistantMessage;
  onActionClick?: (action: AssistantAction) => void;
}

function MessageBubble({ message, onActionClick }: MessageBubbleProps) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? "order-2" : "order-1"}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <Bot className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Assistant</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-foreground"
          }`}
        >
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.toolCalls.map((toolCall, index) => (
              <button
                key={index}
                onClick={() => {
                  if (onActionClick) {
                    onActionClick({ type: toolCall.toolName, ...toolCall.args } as AssistantAction);
                  }
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-accent transition-colors text-left"
              >
                <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{formatToolName(toolCall.toolName)}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {formatToolArgs(toolCall.args)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatToolName(name: string): string {
  const names: Record<string, string> = {
    expandSearch: "Expand Search",
    narrowSearch: "Narrow Results",
    findEmails: "Find Emails",
    modifyQuery: "New Search",
    filterByRole: "Filter by Role",
    analyzeResults: "Analyze Results",
  };
  return names[name] || name;
}

function formatToolArgs(args: Record<string, any>): string {
  if (args.strategy) return `Strategy: ${args.strategy.replace(/_/g, " ")}`;
  if (args.filterType) return `Filter: ${args.filterType}`;
  if (args.scope) return `Scope: ${args.scope}`;
  if (args.newQuery) return args.newQuery;
  if (args.roles) return args.roles.join(", ");
  if (args.analysisType) return args.analysisType;
  return JSON.stringify(args);
}

export interface AssistantChatPanelProps {
  open: boolean;
  messages: AssistantMessage[];
  isLoading: boolean;
  searchContext: SearchContext | null;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  onStopGeneration: () => void;
  onActionExecute?: (action: AssistantAction) => void;
}

export function AssistantChatPanel({
  open,
  messages,
  isLoading,
  searchContext,
  onClose,
  onSendMessage,
  onStopGeneration,
  onActionExecute,
}: AssistantChatPanelProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleQuickAction = (message: string) => {
    onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed left-0 top-[52px] bottom-0 w-80 bg-background border-r shadow-xl z-40 flex flex-col animate-in slide-in-from-left duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Search Assistant</h3>
            <p className="text-xs text-muted-foreground">Powered by Claude</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close assistant"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {searchContext && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{searchContext.resultCount}</span> contacts from{" "}
            <span className="font-medium text-foreground">{searchContext.companies.length}</span> companies
            {searchContext.emailCount > 0 && (
              <> • <span className="font-medium text-foreground">{searchContext.emailCount}</span> emails</>
            )}
          </p>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <Bot className="h-6 w-6 text-amber-500" />
              </div>
              <h4 className="font-medium text-sm mb-1">How can I help?</h4>
              <p className="text-xs text-muted-foreground">
                {searchContext 
                  ? "Ask me anything about your search results"
                  : "Run a search to get started"}
              </p>
            </div>
            
            {searchContext && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium px-1">Quick actions</p>
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.message)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-accent transition-colors text-left group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm">{action.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map(message => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                onActionClick={onActionExecute}
              />
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="w-full resize-none rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[42px] max-h-[120px]"
              rows={1}
              disabled={isLoading}
            />
          </div>
          {isLoading ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={onStopGeneration}
              className="h-[42px] w-[42px] rounded-xl"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="h-[42px] w-[42px] rounded-xl bg-amber-500 hover:bg-amber-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
