import Anthropic from "@anthropic-ai/sdk";
import type { Suggestion, SearchContext, SuggestionType } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

interface ClaudeSuggestion {
  type: SuggestionType;
  title: string;
  description: string;
  icon: string;
  payload?: Record<string, any>;
}

export async function generateSmartSuggestions(context: SearchContext): Promise<Suggestion[]> {
  const { query, resultCount, emailCount, companies } = context;
  
  const systemPrompt = `You are a smart search assistant that analyzes search results and suggests helpful next actions.
Your goal is to help users refine, expand, or improve their search results.

You must respond with a JSON array of exactly 4 suggestion objects. Each suggestion should have:
- type: one of "expand_results", "expand_location", "add_filter", "find_emails", "filter_seniority", "related_roles", "related_companies", "narrow_results"
- title: a short, action-oriented title (3-5 words)
- description: a brief explanation of what this action does (10-20 words)
- icon: one of "search", "map-pin", "mail", "user", "filter", "building", "briefcase", "sparkles"
- payload: optional object with additional data for the action

Consider the search context:
- If results are few (<10), suggest expanding
- If results are many (>50), suggest narrowing/filtering
- If email coverage is low, prioritize email finding
- If query mentions a location, suggest location expansion
- If query mentions a role/title, suggest related roles

IMPORTANT: Return ONLY the JSON array, no other text or markdown.`;

  const userPrompt = `Analyze this search and suggest 4 smart actions:

Search Query: "${query}"
Results Found: ${resultCount}
Contacts with Emails: ${emailCount} of ${resultCount}
Companies Found: ${companies.length}
Top Companies: ${companies.slice(0, 5).map(c => `${c.name} (${c.contactCount} contacts)`).join(", ")}

Generate exactly 4 suggestions that would help the user get better results.
Return only a JSON array of suggestion objects.`;

  try {
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "user", content: userPrompt }
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== "text") {
      console.error("Unexpected response type from Claude:", content.type);
      return getDefaultSuggestions(context);
    }

    const parsed = JSON.parse(content.text) as ClaudeSuggestion[];
    
    return parsed.map((s, index): Suggestion => ({
      id: `ai-${s.type}-${index}`,
      icon: s.icon,
      title: s.title,
      description: s.description,
      action: {
        type: s.type,
        payload: s.payload,
      },
      priority: index,
    }));
  } catch (error) {
    console.error("Error generating smart suggestions:", error);
    return getDefaultSuggestions(context);
  }
}

function getDefaultSuggestions(context: SearchContext): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const { resultCount, emailCount, query } = context;
  
  if (resultCount < 20) {
    suggestions.push({
      id: "default-expand",
      icon: "search",
      title: "Find More Results",
      description: "Expand search to include similar roles and companies",
      action: { type: "expand_results" },
      priority: 0,
    });
  } else if (resultCount > 50) {
    suggestions.push({
      id: "default-narrow",
      icon: "filter",
      title: "Narrow Results",
      description: `${resultCount} results found. Add filters to focus.`,
      action: { type: "narrow_results" },
      priority: 0,
    });
  }
  
  suggestions.push({
    id: "default-location",
    icon: "map-pin",
    title: "Expand Location",
    description: "Include nearby regions and countries",
    action: { type: "expand_location" },
    priority: 1,
  });
  
  if (emailCount < resultCount * 0.5) {
    suggestions.push({
      id: "default-emails",
      icon: "mail",
      title: "Find Missing Emails",
      description: `Only ${emailCount} of ${resultCount} have emails`,
      action: { type: "find_emails" },
      priority: 2,
    });
  } else {
    suggestions.push({
      id: "default-emails",
      icon: "mail",
      title: "Find All Emails",
      description: "Search for email addresses across contacts",
      action: { type: "find_emails" },
      priority: 2,
    });
  }
  
  suggestions.push({
    id: "default-seniority",
    icon: "user",
    title: "Filter by Seniority",
    description: "Focus on senior, lead, or manager roles",
    action: { type: "filter_seniority" },
    priority: 3,
  });
  
  return suggestions.slice(0, 4);
}
