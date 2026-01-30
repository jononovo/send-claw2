import { useState } from "react";
import { X, Search, MapPin, Mail, User, Filter, Building2, Briefcase, Sparkles, ChevronRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Suggestion, SuggestionType } from "./types";

const ICON_MAP: Record<string, React.ReactNode> = {
  search: <Search className="h-5 w-5" />,
  "map-pin": <MapPin className="h-5 w-5" />,
  mail: <Mail className="h-5 w-5" />,
  user: <User className="h-5 w-5" />,
  filter: <Filter className="h-5 w-5" />,
  building: <Building2 className="h-5 w-5" />,
  briefcase: <Briefcase className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
};

const ACTION_COLORS: Record<SuggestionType, string> = {
  expand_results: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
  expand_location: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20",
  add_filter: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
  find_emails: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
  filter_seniority: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20",
  related_roles: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20 hover:bg-pink-500/20",
  related_companies: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 hover:bg-teal-500/20",
  narrow_results: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20",
  custom: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 hover:bg-gray-500/20",
};

interface SuggestionCardProps {
  suggestion: Suggestion;
  onExecute: (suggestion: Suggestion) => void;
  isLoading?: boolean;
}

function SuggestionCard({ suggestion, onExecute, isLoading }: SuggestionCardProps) {
  const colorClass = ACTION_COLORS[suggestion.action.type] || ACTION_COLORS.custom;
  const icon = ICON_MAP[suggestion.icon] || <Sparkles className="h-5 w-5" />;

  return (
    <button
      onClick={() => onExecute(suggestion)}
      disabled={isLoading}
      className={`w-full p-4 rounded-xl border transition-all duration-200 text-left group ${colorClass} ${
        isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{suggestion.title}</h4>
            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs mt-1 opacity-80 line-clamp-2">{suggestion.description}</p>
        </div>
      </div>
    </button>
  );
}

export interface SmartSuggestionsPanelProps {
  open: boolean;
  suggestions: Suggestion[];
  isLoading: boolean;
  query: string;
  resultCount: number;
  onClose: () => void;
  onExecuteAction: (suggestion: Suggestion) => void;
  onCustomQuery?: (query: string) => void;
}

export function SmartSuggestionsPanel({
  open,
  suggestions,
  isLoading,
  query,
  resultCount,
  onClose,
  onExecuteAction,
  onCustomQuery,
}: SmartSuggestionsPanelProps) {
  const [customInput, setCustomInput] = useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim() && onCustomQuery) {
      onCustomQuery(customInput.trim());
      setCustomInput("");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed left-0 top-[52px] bottom-0 w-80 bg-panel-background border-r shadow-xl z-40 flex flex-col animate-in slide-in-from-left duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-sm">Suggestions</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close suggestions panel"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 py-2 border-b bg-muted/30">
        <p className="text-xs text-muted-foreground">
          {resultCount > 0 ? (
            <>Showing <span className="font-medium text-foreground">{resultCount}</span> results for "<span className="font-medium text-foreground">{query}</span>"</>
          ) : (
            <>Enter a search to get started</>
          )}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-full h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onExecute={onExecuteAction}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Run a search to see suggestions
              </p>
            </div>
          )}
        </div>
      </div>

      {onCustomQuery && (
        <form onSubmit={handleCustomSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Ask anything..."
                className="pl-9 text-sm"
              />
            </div>
            <Button type="submit" size="sm" disabled={!customInput.trim()}>
              Ask
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
