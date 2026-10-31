import { requestClaudeText } from '../../lib/claude-request';
import type { SearchResult, StructuredSearchData } from './perplexity-search-api';
import type { CandidateResult } from './types';

export interface ExtractionResult {
  searchContext: {
    interpretedName: string;
    interpretedCompany?: string;
    interpretedRole?: string;
    interpretedLocation?: string;
  };
  candidates: CandidateResult[];
}

function buildStructuredPrompt(structuredSearch: StructuredSearchData, searchResultsText: string): string {
  const nameParts = structuredSearch.fullName.split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];
  
  return `You are analyzing web search results to find people with a specific name.

SEARCH TARGET:
- Full Name: "${structuredSearch.fullName}"
  - First Name: "${firstName}"
  - Last Name: "${lastName}"
${structuredSearch.company ? `- Context Company: "${structuredSearch.company}"` : ''}
${structuredSearch.role ? `- Context Role: "${structuredSearch.role}"` : ''}
${structuredSearch.location ? `- Context Location: "${structuredSearch.location}"` : ''}
${structuredSearch.knownEmail ? `- Known Email: "${structuredSearch.knownEmail}"` : ''}
${structuredSearch.otherContext ? `- Additional Context: "${structuredSearch.otherContext}"` : ''}

SEARCH RESULTS:
${searchResultsText}

MANDATORY NAME FILTERS (candidates without BOTH are EXCLUDED - never show them):
1. Last name MUST be "${lastName}" exactly (case insensitive) - NO EXCEPTIONS
2. First name MUST be "${firstName}" OR a recognized nickname variation

Recognized nicknames: Mike=Michael, Bob=Robert, Rob=Robert, Will=William, Bill=William, Jim=James, Jimmy=James, Tim=Timothy, Tom=Thomas, Dick=Richard, Rick=Richard, Tony=Anthony, Joe=Joseph, Dan=Daniel, Dave=David, Steve=Steven, Chris=Christopher, Matt=Matthew, Nick=Nicholas, Sam=Samuel, Ben=Benjamin, Alex=Alexander, Andy=Andrew, Ed=Edward, Ted=Edward, Jack=John, etc.

SCORING (only for candidates that pass BOTH name filters):
- First name EXACT match ("${firstName}" = "${firstName}"): 85 points
- First name NICKNAME match (e.g., Mike matching Michael): 75 points
- Company context match: +5 points (if matches "${structuredSearch.company || 'N/A'}")
- Role context match: +5 points (if matches "${structuredSearch.role || 'N/A'}")
- Other context match: +5 points (location, industry, or other context matches)

Maximum score: 100 points (85 + 5 + 5 + 5)

CRITICAL RULES:
1. NEVER include anyone with a different last name than "${lastName}" - EXCLUDE them completely
2. NEVER include anyone with a different first name (unless it's a recognized nickname of "${firstName}")
3. Return 3-5 results ranked by score (highest first)
4. Same person at multiple companies = multiple results (current role + previous roles)
5. Use "Unknown" for missing company/role - NEVER leave blank

Return ONLY valid JSON:
{
  "searchContext": {
    "interpretedName": "${structuredSearch.fullName}",
    "interpretedCompany": ${structuredSearch.company ? `"${structuredSearch.company}"` : 'null'},
    "interpretedRole": ${structuredSearch.role ? `"${structuredSearch.role}"` : 'null'},
    "interpretedLocation": ${structuredSearch.location ? `"${structuredSearch.location}"` : 'null'}
  },
  "candidates": [
    {
      "name": "Full Name",
      "currentCompany": "Company Name",
      "currentRole": "Job Title",
      "companyWebsite": "https://...",
      "linkedinUrl": "https://linkedin.com/in/...",
      "score": 100,
      "reasoning": "First name 'Tim' matches exactly (+85), company Apple matches (+5), role CEO matches (+5), location California matches (+5) = 100 pts"
    }
  ]
}`;
}

export async function extractCandidatesWithClaude(
  originalQuery: string,
  searchResults: SearchResult[],
  structuredSearch?: StructuredSearchData
): Promise<ExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[ClaudeExtraction] Anthropic API key is not configured');
    throw new Error('Anthropic API key is not configured. Please add ANTHROPIC_API_KEY to enable individual search extraction.');
  }

  console.log(`[ClaudeExtraction] Extracting candidates from ${searchResults.length} search results`);
  if (structuredSearch) {
    console.log(`[ClaudeExtraction] Using structured search:`, structuredSearch);
  }

  const searchResultsText = searchResults
    .map((r, i) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}\n`)
    .join('\n');

  const prompt = structuredSearch 
    ? buildStructuredPrompt(structuredSearch, searchResultsText)
    : `You are analyzing web search results to find people matching a user's query.

ORIGINAL QUERY: "${originalQuery}"

SEARCH RESULTS:
${searchResultsText}

TASK:
1. First, interpret what the user is looking for from their query:
   - Person's name (first name + last name required)
   - Company context (if mentioned, look for "at [company]")
   - Role context (if mentioned)
   - Location context (if mentioned, look for "in [city]" or city names like NYC, London, etc.)

2. Find people with the EXACT same name (first AND last name must match).

MANDATORY NAME FILTERS (candidates without BOTH are EXCLUDED - never show them):
1. Last name MUST match exactly (case insensitive) - NO EXCEPTIONS
2. First name MUST match exactly OR be a recognized nickname variation

Recognized nicknames: Mike=Michael, Bob=Robert, Rob=Robert, Will=William, Bill=William, Jim=James, Jimmy=James, Tim=Timothy, Tom=Thomas, Dick=Richard, Rick=Richard, Tony=Anthony, Joe=Joseph, Dan=Daniel, Dave=David, Steve=Steven, Chris=Christopher, Matt=Matthew, Nick=Nicholas, Sam=Samuel, Ben=Benjamin, Alex=Alexander, Andy=Andrew, Ed=Edward, Ted=Edward, Jack=John, etc.

SCORING (only for candidates that pass BOTH name filters):
- First name EXACT match: 85 points
- First name NICKNAME match: 75 points
- Company context match: +5 points
- Role context match: +5 points
- Other context match: +5 points (location, industry, etc.)

Maximum score: 100 points (85 + 5 + 5 + 5)

RULES:
- NEVER include anyone with a different last name - EXCLUDE them completely
- NEVER include anyone with a different first name (unless recognized nickname)
- Return 3-5 results ranked by score (highest first)
- Same person at multiple companies = multiple results
- Use "Unknown" for missing company or role - NEVER leave blank

Return ONLY valid JSON in this exact format:
{
  "searchContext": {
    "interpretedName": "The person's name from query",
    "interpretedCompany": "Company context from query or null",
    "interpretedRole": "Role context from query or null",
    "interpretedLocation": "Location context from query or null"
  },
  "candidates": [
    {
      "name": "Full Name",
      "currentCompany": "Company Name",
      "currentRole": "Job Title",
      "companyWebsite": "https://...",
      "linkedinUrl": "https://linkedin.com/in/...",
      "score": 100,
      "reasoning": "First name 'Tim' matches exactly (+85), company matches (+5), role matches (+5), location matches (+5) = 100 pts"
    }
  ]
}`;

  try {
    const reply = await requestClaudeText({
      system: 'You are a professional researcher extracting candidate information from search results. Always return valid JSON only, with no additional text or explanation.',
      prompt
    });

    if (!reply) {
      console.error('[ClaudeExtraction] No text content in response');
      return getDefaultResult(originalQuery);
    }

    console.log(`[ClaudeExtraction] Raw response length: ${reply.length} chars`);

    try {
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[ClaudeExtraction] No JSON found in response');
        return getDefaultResult(originalQuery);
      }

      const result = JSON.parse(jsonMatch[0]) as ExtractionResult;
      
      const searchContext = {
        interpretedName: result.searchContext?.interpretedName || extractNameFromQuery(originalQuery),
        interpretedCompany: result.searchContext?.interpretedCompany || undefined,
        interpretedRole: result.searchContext?.interpretedRole || undefined,
        interpretedLocation: result.searchContext?.interpretedLocation || undefined
      };

      const candidates = (result.candidates || [])
        .filter(c => c && c.name)
        .map(c => ({
          ...c,
          currentCompany: c.currentCompany || 'Unknown',
          currentRole: c.currentRole || 'Unknown',
          score: c.score || 50
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      console.log(`[ClaudeExtraction] Interpreted query:`, searchContext);
      console.log(`[ClaudeExtraction] Extracted ${candidates.length} candidates`);
      
      // Log each extracted candidate for debugging
      if (candidates.length > 0) {
        console.log(`[ClaudeExtraction] ========== EXTRACTED CANDIDATES ==========`);
        candidates.forEach((c, i) => {
          console.log(`[ClaudeExtraction] [${i + 1}] Name: ${c.name}`);
          console.log(`[ClaudeExtraction] [${i + 1}] Company: ${c.currentCompany}`);
          console.log(`[ClaudeExtraction] [${i + 1}] Role: ${c.currentRole}`);
          console.log(`[ClaudeExtraction] [${i + 1}] Score: ${c.score}`);
          console.log(`[ClaudeExtraction] [${i + 1}] Reasoning: ${c.reasoning}`);
          console.log(`[ClaudeExtraction] ---`);
        });
        console.log(`[ClaudeExtraction] ==========================================`);
      }

      return { searchContext, candidates };

    } catch (parseError) {
      console.error('[ClaudeExtraction] Failed to parse JSON:', parseError);
      return getDefaultResult(originalQuery);
    }

  } catch (error) {
    console.error('[ClaudeExtraction] Claude API error:', error);
    throw error;
  }
}

function extractNameFromQuery(query: string): string {
  const beforeAt = query.split(/\s+(?:at|in)\s+/i)[0].trim();
  return beforeAt || query.split(' ').slice(0, 2).join(' ');
}

function getDefaultResult(query: string): ExtractionResult {
  return {
    searchContext: {
      interpretedName: extractNameFromQuery(query),
      interpretedCompany: undefined,
      interpretedRole: undefined,
      interpretedLocation: undefined
    },
    candidates: []
  };
}
