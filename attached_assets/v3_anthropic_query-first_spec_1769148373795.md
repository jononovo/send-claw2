# Super Search Variant: v3_anthropic_query-first

## Overview

A multi-step search variant that analyzes the query BEFORE searching, then iteratively refines based on findings. The key differentiator from v2 is "query-first intelligence" - Claude understands intent and expected output structure before any web search occurs.

## Variant Metadata

```typescript
{
  id: 'v3_anthropic_query-first',
  name: 'Anthropic Query-First',
  description: 'Claude analyzes query intent first → Perplexity cursory search → Claude refines fields based on findings → Perplexity targeted deep searches → Claude final extraction. Optimized for ambiguous queries and signal-based searches.'
}
```

## File Structure

Create these files in `server/search/super-search/search-variants/v3_anthropic_query-first/`:

```
v3_anthropic_query-first/
├── index.ts                    # Variant export
├── stream.ts                   # Main execution logic
├── prompts/
│   ├── 1-query-analysis.txt    # Initial query understanding
│   ├── 2-research-planning.txt # Refine plan based on cursory results
│   └── 3-extraction.txt        # Final structured extraction
```

## Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Query Analysis (Claude)                                │
│ Input: Raw user query                                           │
│ Output: Intent, expected entity type, preliminary fields,       │
│         search strategy, what signals to look for               │
│ Stream: "Analyzing your query..."                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: Cursory Search (Perplexity)                            │
│ Input: Optimized search query from Phase 1                      │
│ Output: Broad landscape of what exists                          │
│ Stream: "Searching for relevant information..."                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: Research Planning (Claude)                             │
│ Input: Query analysis + cursory results                         │
│ Output: Final SearchPlan (fields, customFields, targetCount),   │
│         identified entities, gaps to fill, targeted queries     │
│ Stream: "Planning research strategy..." + emit PLAN event       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: Deep Search (Perplexity, 1-3 targeted queries)         │
│ Input: Targeted queries from Phase 3                            │
│ Output: Detailed data for identified entities                   │
│ Stream: "Researching [entity]..." for each                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: Extraction (Claude)                                    │
│ Input: All research data + plan                                 │
│ Output: Structured SuperSearchResult for each entity            │
│ Stream: Emit RESULT events as extracted                         │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation

### index.ts

```typescript
import type { SearchVariant } from '../types';
import { executeSearch } from './stream';

export const variant: SearchVariant = {
  id: 'v3_anthropic_query-first',
  name: 'Anthropic Query-First',
  description: 'Claude analyzes query intent first → Perplexity cursory search → Claude refines fields based on findings → Perplexity targeted deep searches → Claude final extraction. Optimized for ambiguous queries and signal-based searches.',
  executeSearch
};
```

### stream.ts

```typescript
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import type { SearchPlan, SuperSearchResult, StreamEvent } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load prompts
const QUERY_ANALYSIS_PROMPT = readFileSync(
  join(__dirname, 'prompts', '1-query-analysis.txt'),
  'utf-8'
);

const RESEARCH_PLANNING_PROMPT = readFileSync(
  join(__dirname, 'prompts', '2-research-planning.txt'),
  'utf-8'
);

const EXTRACTION_PROMPT = readFileSync(
  join(__dirname, 'prompts', '3-extraction.txt'),
  'utf-8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ----------------------------------------------------------------------------
// PHASE 1: Query Analysis
// ----------------------------------------------------------------------------
interface QueryAnalysis {
  intent: string;
  entityType: 'company' | 'contact';
  preliminaryFields: string[];
  suggestedCustomFields: Array<{ key: string; label: string }>;
  searchQuery: string;
  signalsToLookFor: string[];
  ambiguityNotes: string | null;
}

async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: QUERY_ANALYSIS_PROMPT,
    messages: [
      { role: 'user', content: query }
    ]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Query analysis did not return valid JSON');
  }

  return JSON.parse(jsonMatch[0]);
}

// ----------------------------------------------------------------------------
// PHASE 2: Cursory Search (Perplexity)
// ----------------------------------------------------------------------------
async function cursorSearch(searchQuery: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: searchQuery }],
      temperature: 0.1,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ----------------------------------------------------------------------------
// PHASE 3: Research Planning
// ----------------------------------------------------------------------------
interface ResearchPlan {
  plan: SearchPlan;
  entities: string[];
  gaps: string[];
  targetedQueries: string[];
}

async function planResearch(
  query: string,
  analysis: QueryAnalysis,
  cursoryResults: string
): Promise<ResearchPlan> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: RESEARCH_PLANNING_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Original Query: "${query}"

Query Analysis:
${JSON.stringify(analysis, null, 2)}

Cursory Search Results:
${cursoryResults}

Based on what we now know, create the final research plan.`
      }
    ]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Research planning did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  return {
    plan: {
      queryType: parsed.queryType || analysis.entityType,
      targetCount: parsed.targetCount || 10,
      standardFields: parsed.standardFields || analysis.preliminaryFields,
      customFields: parsed.customFields || analysis.suggestedCustomFields,
      searchStrategy: parsed.searchStrategy || analysis.intent
    },
    entities: parsed.entities || [],
    gaps: parsed.gaps || [],
    targetedQueries: parsed.targetedQueries || []
  };
}

// ----------------------------------------------------------------------------
// PHASE 4: Deep Search (Perplexity)
// ----------------------------------------------------------------------------
async function deepSearch(queries: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  for (const query of queries) {
    try {
      const result = await cursorSearch(query);
      results.set(query, result);
    } catch (error) {
      console.error(`Deep search failed for query: ${query}`, error);
      results.set(query, '');
    }
  }
  
  return results;
}

// ----------------------------------------------------------------------------
// PHASE 5: Extraction
// ----------------------------------------------------------------------------
async function extractResults(
  query: string,
  plan: SearchPlan,
  entities: string[],
  allResearchData: string
): Promise<SuperSearchResult[]> {
  const results: SuperSearchResult[] = [];
  
  // Process entities in batches to avoid token limits
  const batchSize = 5;
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Query: "${query}"
Entity Type: ${plan.queryType}
Standard Fields: ${plan.standardFields.join(', ')}
Custom Fields: ${plan.customFields.map(f => `${f.key}: ${f.label}`).join(', ')}

Entities to extract: ${batch.join(', ')}

Research Data:
${allResearchData}

Extract structured data for each entity. Return a JSON array.`
        }
      ]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        results.push(...parsed);
      } catch (e) {
        console.error('Failed to parse extraction results:', e);
      }
    }
  }
  
  return results;
}

// ----------------------------------------------------------------------------
// MAIN EXECUTION
// ----------------------------------------------------------------------------
export async function* executeSearch(query: string): AsyncGenerator<StreamEvent, void, unknown> {
  try {
    // PHASE 1: Query Analysis
    yield { type: 'progress', data: 'Analyzing your query to understand intent...' };
    
    const analysis = await analyzeQuery(query);
    
    yield { type: 'progress', data: `Understanding: ${analysis.intent}` };
    
    if (analysis.ambiguityNotes) {
      yield { type: 'progress', data: `Note: ${analysis.ambiguityNotes}` };
    }

    // PHASE 2: Cursory Search
    yield { type: 'progress', data: 'Searching for relevant information...' };
    
    const cursoryResults = await cursorSearch(analysis.searchQuery);

    // PHASE 3: Research Planning
    yield { type: 'progress', data: 'Analyzing findings and planning detailed research...' };
    
    const researchPlan = await planResearch(query, analysis, cursoryResults);
    
    // Emit the plan
    yield { type: 'plan', data: researchPlan.plan };
    
    yield { type: 'progress', data: `Found ${researchPlan.entities.length} entities. ${researchPlan.gaps.length > 0 ? `Gaps to fill: ${researchPlan.gaps.join(', ')}` : ''}` };

    // PHASE 4: Deep Search (if needed)
    let allResearchData = cursoryResults;
    
    if (researchPlan.targetedQueries.length > 0) {
      yield { type: 'progress', data: `Running ${researchPlan.targetedQueries.length} targeted searches...` };
      
      const deepResults = await deepSearch(researchPlan.targetedQueries);
      
      for (const [q, result] of deepResults) {
        allResearchData += `\n\n--- Research: ${q} ---\n${result}`;
      }
    }

    // PHASE 5: Extraction
    const limitedEntities = researchPlan.entities.slice(0, researchPlan.plan.targetCount);
    
    yield { type: 'progress', data: `Extracting structured data for ${limitedEntities.length} results...` };
    
    const results = await extractResults(query, researchPlan.plan, limitedEntities, allResearchData);
    
    // Yield each result
    for (const result of results) {
      yield { type: 'result', data: result };
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[v3_anthropic_query-first] Error:', error);
    yield { type: 'error', data: errorMessage };
  }
}
```

### prompts/1-query-analysis.txt

```
You analyze user queries for a B2B lead generation search system.

Your job is to understand the user's TRUE intent before any search happens. This is critical - we need to understand WHAT we're looking for before we search.

Given a query, determine:

1. **intent**: What is the user actually trying to accomplish? (1-2 sentences)

2. **entityType**: Are they primarily looking for "company" or "contact"?
   - Companies: organizations, businesses, startups, agencies
   - Contacts: people, decision-makers, roles, executives

3. **preliminaryFields**: What standard fields are relevant?
   - For companies: name, website, city, state, country, description, size, services
   - For contacts: name, role, company, companyWebsite, linkedinUrl, city, state, country, department

4. **suggestedCustomFields**: What UNIQUE fields does this query need that aren't standard?
   - Think about what specific data points would answer the user's question
   - Examples: "Annual Revenue", "Tech Stack", "Funding Stage", "Years in Business", "Carbon Footprint"
   - Only suggest fields that are:
     a) Directly relevant to the query
     b) Likely discoverable through web research
     c) Enable meaningful comparison between results

5. **searchQuery**: What should we search for first? Optimize for broad discovery.

6. **signalsToLookFor**: What specific signals or indicators should we look for in results?
   - Examples: "recent funding announcements", "job postings for sustainability roles", "press releases about expansion"

7. **ambiguityNotes**: If the query is ambiguous, note what assumptions you're making. Null if clear.

Respond with JSON only:

{
  "intent": "string",
  "entityType": "company" | "contact",
  "preliminaryFields": ["field1", "field2"],
  "suggestedCustomFields": [
    {"key": "fieldKey", "label": "Human Readable Label"}
  ],
  "searchQuery": "optimized search query string",
  "signalsToLookFor": ["signal1", "signal2"],
  "ambiguityNotes": "string or null"
}

IMPORTANT:
- For ambiguous role queries like "who handles X at Y", entityType should be "contact"
- For "find companies that..." queries, entityType should be "company"
- Custom fields should be SPECIFIC to the query, not generic
- Search query should be broad enough to discover the landscape, not too narrow
```

### prompts/2-research-planning.txt

```
You are a research planner for a B2B lead generation system.

You've received:
1. The original user query
2. An initial analysis of what we're looking for
3. Cursory search results showing what's actually out there

Your job is to:
1. REFINE the search plan based on what we've discovered
2. IDENTIFY specific entities to include in results
3. SPOT gaps in our knowledge that need targeted research
4. CREATE targeted search queries to fill those gaps

Respond with JSON:

{
  "queryType": "company" | "contact",
  "targetCount": 5 | 10 | 20,
  "standardFields": ["name", "website", ...],
  "customFields": [
    {"key": "fieldKey", "label": "Human Readable Label"}
  ],
  "searchStrategy": "Brief explanation of the final approach",
  "entities": ["Entity Name 1", "Entity Name 2", ...],
  "gaps": ["What info is missing", "What needs verification"],
  "targetedQueries": ["specific search query 1", "specific search query 2"]
}

GUIDELINES:

**targetCount logic:**
- 5: Specific person search, niche query
- 10: Role-based search, company category search
- 20: Broad market research, large category

**customFields refinement:**
- REMOVE suggested custom fields if the cursory search shows they're not discoverable
- ADD new custom fields if the search revealed important dimensions we didn't anticipate
- RENAME fields if a better label emerged from the data

**entities:**
- List specific company names or person names found in cursory search
- Order by relevance to the original query
- Include up to targetCount * 1.5 entities (we'll filter later)

**gaps:**
- What information do we need but didn't find?
- What entities were mentioned but lack detail?
- What claims need verification?

**targetedQueries:**
- Maximum 3 queries
- Each should fill a specific gap
- Be specific: "[Entity name] [specific info needed]"
- Only include if genuinely needed - empty array is fine if cursory search was sufficient
```

### prompts/3-extraction.txt

```
You extract structured data from research results for a B2B lead generation system.

Given:
- The original query for context
- Entity type (company or contact)
- List of standard fields to extract
- List of custom fields to extract
- Names of entities to extract
- All research data collected

Extract a JSON array of results. Each result must match the entity type schema.

For companies:
{
  "type": "company",
  "name": "Company Name",
  "website": "https://...",
  "city": "City",
  "state": "State/Province",
  "country": "Country",
  "description": "Brief description",
  "size": "Employee count or range",
  "services": "Main services/products",
  "superSearchMeta": {
    "customFieldKey": "extracted value"
  }
}

For contacts:
{
  "type": "contact",
  "name": "Person Name",
  "role": "Job Title",
  "company": "Company Name",
  "companyWebsite": "https://...",
  "linkedinUrl": "https://linkedin.com/in/...",
  "city": "City",
  "state": "State",
  "country": "Country",
  "department": "Department",
  "superSearchMeta": {
    "customFieldKey": "extracted value"
  }
}

RULES:
1. Only include standard fields that were requested
2. Put all custom field values in superSearchMeta using the exact keys provided
3. Use null for values that cannot be determined - do NOT fabricate
4. If an entity was in the list but no data was found, still include them with minimal info
5. superSearchMeta values should be concise (under 100 chars each)
6. Return a JSON array, even for single results

QUALITY STANDARDS:
- Accuracy over completeness - only include what's verifiable
- If conflicting information exists, note it in a "conflictNote" field in superSearchMeta
- LinkedIn URLs should be full URLs, not just usernames
- Company websites should include https://
```

## Register the Variant

Update `server/search/super-search/search-variants/index.ts`:

```typescript
import type { SearchVariant } from './types';
export type { SearchVariant } from './types';

import { variant as v1PerplexityOneShot } from './v1_perplexity_one-shot';
import { variant as v2AnthropicMultiStep } from './v2_anthropic_multi-step';
import { variant as v3AnthropicQueryFirst } from './v3_anthropic_query-first';  // ADD

export const variants: Record<string, SearchVariant> = {
  'v1_perplexity_one-shot': v1PerplexityOneShot,
  'v2_anthropic_multi-step': v2AnthropicMultiStep,
  'v3_anthropic_query-first': v3AnthropicQueryFirst,  // ADD
};

export const defaultVariantId = 'v1_perplexity_one-shot';

export function getVariant(id: string): SearchVariant | undefined {
  return variants[id];
}

export function getDefaultVariant(): SearchVariant {
  return variants[defaultVariantId];
}

export function listVariants(): Array<{ id: string; name: string; description: string }> {
  return Object.values(variants).map(v => ({
    id: v.id,
    name: v.name,
    description: v.description
  }));
}
```

## Frontend Integration

Update `client/src/components/prompt-editor.tsx` to add v3 option:

```typescript
// In the search type selection logic, add:
const variantId = 
  searchType === 'super_search_fast' ? 'v1_perplexity_one-shot' :
  searchType === 'super_search_deep' ? 'v3_anthropic_query-first' :  // NEW
  'v2_anthropic_multi-step';
```

Or add a new search type option in the dropdown for "Super Search (Deep)" that maps to v3.

## Estimated Costs Per Search

| Phase | Model | Est. Tokens | Est. Cost |
|-------|-------|-------------|-----------|
| Query Analysis | Claude Sonnet | ~800 | $0.004 |
| Cursory Search | Perplexity Sonar | ~4000 | $0.004 |
| Research Planning | Claude Sonnet | ~1500 | $0.007 |
| Deep Search (x2) | Perplexity Sonar | ~8000 | $0.008 |
| Extraction | Claude Sonnet | ~2000 | $0.010 |
| **Total** | | | **~$0.033** |

## Key Differences from v2

| Aspect | v2 | v3 |
|--------|----|----|
| First step | Perplexity searches | Claude analyzes query |
| Field discovery | After search | Before + refined after |
| Research depth | Per-entity enrichment | Gap-based targeted queries |
| Claude calls | 2 (plan + extract) | 3 (analyze + plan + extract) |
| Best for | Clear queries | Ambiguous/signal queries |

## Testing Queries

Test v3 with these query types to validate the query-first approach:

1. **Ambiguous role**: "Who handles sustainability purchasing decisions at Fortune 500 energy companies"
2. **Signal-based**: "Startups that recently hired a VP of Sales and raised Series A"
3. **Custom metrics**: "Top carbon offset providers ranked by annual tonnage"
4. **Niche function**: "People responsible for AI ethics policies at big tech"
5. **Comparative**: "Marketing agencies specializing in B2B SaaS with case studies"
