import { useState, useCallback, useRef } from "react";
import type { AssistantMessage, SearchContext, ToolCall, AssistantAction } from "./types";

interface UseAssistantChatOptions {
  onAction?: (action: AssistantAction) => void;
}

export function useAssistantChat(options: UseAssistantChatOptions = {}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchContext, setSearchContext] = useState<SearchContext | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/assistant-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          searchContext,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const assistantMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        toolCalls: [],
        createdAt: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === "text") {
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMessage = updated[updated.length - 1];
                  if (lastMessage.role === "assistant") {
                    lastMessage.content += parsed.content;
                  }
                  return updated;
                });
              } else if (parsed.type === "tool_calls") {
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMessage = updated[updated.length - 1];
                  if (lastMessage.role === "assistant") {
                    lastMessage.toolCalls = parsed.calls;
                  }
                  return updated;
                });
                // Tool calls are rendered as buttons in the UI
                // User clicks them to execute - no auto-execution
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Chat error:", err);
        setError((err as Error).message);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, searchContext, options]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen(prev => !prev), []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const updateSearchContext = useCallback((context: SearchContext | null) => {
    setSearchContext(context);
    
    if (context && messages.length === 0) {
      const welcomeMessage: AssistantMessage = {
        id: `assistant-welcome-${Date.now()}`,
        role: "assistant",
        content: generateWelcomeMessage(context),
        createdAt: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  return {
    messages,
    isLoading,
    isOpen,
    error,
    searchContext,
    sendMessage,
    stopGeneration,
    openPanel,
    closePanel,
    togglePanel,
    clearMessages,
    updateSearchContext,
  };
}

function convertToolCallToAction(toolCall: ToolCall): AssistantAction | null {
  const { toolName, args } = toolCall;
  
  switch (toolName) {
    case "expandSearch":
      return { type: "expandSearch", ...args } as AssistantAction;
    case "narrowSearch":
      return { type: "narrowSearch", ...args } as AssistantAction;
    case "findEmails":
      return { type: "findEmails", ...args } as AssistantAction;
    case "modifyQuery":
      return { type: "modifyQuery", ...args } as AssistantAction;
    case "filterByRole":
      return { type: "filterByRole", ...args } as AssistantAction;
    case "analyzeResults":
      return { type: "analyzeResults", ...args } as AssistantAction;
    default:
      return null;
  }
}

function generateWelcomeMessage(context: SearchContext): string {
  const { query, resultCount, emailCount, companies } = context;
  const emailCoverage = resultCount > 0 ? Math.round((emailCount / resultCount) * 100) : 0;
  
  let message = `I found **${resultCount} contacts** across **${companies.length} companies** for "${query}".`;
  
  if (emailCoverage < 50) {
    message += ` Only ${emailCoverage}% have emails - would you like me to find more?`;
  } else if (emailCoverage >= 80) {
    message += ` Great news - ${emailCoverage}% already have emails!`;
  }
  
  message += "\n\nHere are some things I can help with:";
  
  return message;
}
