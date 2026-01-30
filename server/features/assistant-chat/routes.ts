import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";

// The newest Anthropic model is "claude-sonnet-4-20250514"
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SearchContext {
  query: string;
  resultCount: number;
  emailCount: number;
  companies: Array<{
    id: number;
    name: string;
    contactCount: number;
  }>;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "expandSearch",
    description: "Expand the search to find more results. Use this when the user wants more companies or contacts.",
    input_schema: {
      type: "object" as const,
      properties: {
        strategy: {
          type: "string",
          enum: ["broader_query", "related_companies", "similar_roles", "expand_location"],
          description: "The expansion strategy to use",
        },
        modifiedQuery: {
          type: "string",
          description: "A modified search query if the strategy involves changing the search terms",
        },
      },
      required: ["strategy"],
    },
  },
  {
    name: "narrowSearch",
    description: "Narrow the search results by adding filters. Use this when there are too many results or user wants to focus.",
    input_schema: {
      type: "object" as const,
      properties: {
        filterType: {
          type: "string",
          enum: ["seniority", "department", "company_size", "location", "has_email"],
          description: "The type of filter to apply",
        },
        filterValue: {
          type: "string",
          description: "The specific value to filter by",
        },
      },
      required: ["filterType"],
    },
  },
  {
    name: "findEmails",
    description: "Search for email addresses for contacts that don't have emails yet.",
    input_schema: {
      type: "object" as const,
      properties: {
        scope: {
          type: "string",
          enum: ["all", "top_prospects", "selected"],
          description: "Which contacts to find emails for",
        },
        priority: {
          type: "string",
          enum: ["fast", "thorough"],
          description: "Search priority - fast for quick results, thorough for comprehensive search",
        },
      },
      required: ["scope"],
    },
  },
  {
    name: "modifyQuery",
    description: "Modify the current search query with a new query string.",
    input_schema: {
      type: "object" as const,
      properties: {
        newQuery: {
          type: "string",
          description: "The new search query to execute",
        },
        reason: {
          type: "string",
          description: "Brief explanation of why this query modification was suggested",
        },
      },
      required: ["newQuery"],
    },
  },
  {
    name: "filterByRole",
    description: "Filter results to show only specific roles or seniority levels.",
    input_schema: {
      type: "object" as const,
      properties: {
        roles: {
          type: "array",
          items: { type: "string" },
          description: "List of roles or titles to filter by",
        },
        seniorityLevel: {
          type: "string",
          enum: ["c-level", "vp", "director", "manager", "senior", "any"],
          description: "The seniority level to filter by",
        },
      },
      required: ["roles"],
    },
  },
  {
    name: "analyzeResults",
    description: "Analyze the current search results and provide insights.",
    input_schema: {
      type: "object" as const,
      properties: {
        analysisType: {
          type: "string",
          enum: ["overview", "gaps", "recommendations", "comparison"],
          description: "Type of analysis to perform",
        },
      },
      required: ["analysisType"],
    },
  },
];

export function registerAssistantChatRoutes(app: Express) {
  app.post("/api/assistant-chat/stream", async (req: Request, res: Response) => {
    try {
      const { messages, searchContext } = req.body as {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        searchContext?: SearchContext;
      };

      if (!messages || messages.length === 0) {
        return res.status(400).json({ error: "Messages are required" });
      }

      const systemPrompt = buildSystemPrompt(searchContext);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = anthropic.messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        tools: TOOLS,
      });

      const toolCalls: Array<{ toolName: string; args: Record<string, any> }> = [];

      stream.on("text", (text) => {
        res.write(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`);
      });

      stream.on("contentBlock", (contentBlock: Anthropic.ContentBlock) => {
        if (contentBlock.type === "tool_use") {
          toolCalls.push({
            toolName: contentBlock.name,
            args: contentBlock.input as Record<string, any>,
          });
        }
      });

      stream.on("message", () => {
        if (toolCalls.length > 0) {
          res.write(`data: ${JSON.stringify({ type: "tool_calls", calls: toolCalls })}\n\n`);
        }
        res.write("data: [DONE]\n\n");
        res.end();
      });

      stream.on("error", (error) => {
        console.error("Stream error:", error);
        res.write(`data: ${JSON.stringify({ type: "error", message: "Stream interrupted" })}\n\n`);
        res.end();
      });

    } catch (error) {
      console.error("Error in assistant chat:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat request" });
      }
    }
  });
}

function buildSystemPrompt(searchContext?: SearchContext): string {
  let contextInfo = "";
  
  if (searchContext) {
    const { query, resultCount, emailCount, companies } = searchContext;
    const emailCoverage = resultCount > 0 ? Math.round((emailCount / resultCount) * 100) : 0;
    const topCompanies = companies.slice(0, 5).map(c => `${c.name} (${c.contactCount} contacts)`).join(", ");
    
    contextInfo = `
CURRENT SEARCH CONTEXT:
- Search Query: "${query}"
- Total Results: ${resultCount} contacts
- Contacts with Emails: ${emailCount} (${emailCoverage}% coverage)
- Companies Found: ${companies.length}
- Top Companies: ${topCompanies || "None"}
`;
  }

  return `You are an intelligent search assistant helping users find and manage business contacts. You analyze search results and suggest helpful actions to improve their prospecting.

${contextInfo}

YOUR CAPABILITIES:
1. Analyze search results and provide insights
2. Suggest ways to expand or narrow searches
3. Help find missing emails for contacts
4. Recommend filters and refinements
5. Explain search strategies

CONVERSATION STYLE:
- Be concise and helpful (2-3 sentences max for regular responses)
- Proactively suggest 2-3 relevant actions based on context
- When results are few, suggest expansions
- When results are many, suggest filters
- When email coverage is low, suggest finding emails
- Use tools to take actions when the user requests them
- Always explain what action you're taking and why

IMPORTANT:
- When suggesting actions, be specific about what will happen
- If the user's request is unclear, ask for clarification
- Provide quick action suggestions after analyzing results
- When using tools, briefly explain what action you're taking`;
}
