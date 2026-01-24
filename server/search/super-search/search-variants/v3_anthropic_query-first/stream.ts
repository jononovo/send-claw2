import Anthropic from '@anthropic-ai/sdk';
import type { SearchPlan, SuperSearchResult, StreamEvent, CustomField } from '../../types';

const QUERY_ANALYSIS_PROMPT = `You analyze user queries for a B2B lead generation search system.

Your job is to understand the user's TRUE intent before any search happens. This is critical - we need to understand WHAT we're looking for before we search.

RESULT TYPES - Choose ONE:

**Company Search** - When the user wants to find organizations, businesses, startups, agencies
- Example queries: "AI startups in Austin", "Lithium mining companies in California", "Top marketing agencies"
- Results will be: company name, website, description, size, services, location

**Contact Search** - When the user wants to find PEOPLE, individuals, decision-makers, roles
- Example queries: "CTOs at fintech startups", "People responsible for procurement at Tesla", "VP of Sales at Series A companies"
- Results will be: person's name, job title/role, their company, LinkedIn, location

Given a query, determine:

1. **intent**: What is the user actually trying to accomplish? (1-2 sentences)

2. **entityType**: "company" or "contact"
   - If the query mentions roles, people, "who", decision-makers → entityType = "contact"
   - If the query is about finding organizations, businesses → entityType = "company"

3. **preliminaryFields**: What standard fields are relevant?
   - For companies: name, website, city, state, country, description, size, services
   - For contacts: name, role, company, companyWebsite, linkedinUrl, city, state, country, department

4. **suggestedCustomFields**: What UNIQUE fields does this query need that aren't standard?
   - Think about what specific data points would answer the user's question
   - Examples: "Annual Revenue", "Tech Stack", "Funding Stage", "Years in Business"
   - Only suggest fields that are discoverable through web research

5. **searchQuery**: What should we search for first? Optimize for finding what entityType specifies.
   - If entityType = "contact": Search for people/roles/professionals, not just companies
   - If entityType = "company": Search for companies/organizations/businesses

6. **signalsToLookFor**: What specific signals should we look for?
   - For contacts: job titles, LinkedIn profiles, press mentions of individuals
   - For companies: company websites, funding news, product announcements

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

CRITICAL:
- "who handles X", "people responsible for", "find the person" → entityType = "contact"
- "find companies that", "list of businesses", "startups in" → entityType = "company"
- The searchQuery must match the entityType - don't search for companies if we want contacts`;

const RESEARCH_PLANNING_PROMPT = `You are a research planner for a B2B lead generation system.

You've received:
1. The original user query
2. An initial analysis of what we're looking for (includes entityType: company OR contact)
3. Cursory search results showing what's actually out there

Your job is to create a refined research plan that delivers the correct result type.

CRITICAL: RESPECT THE ENTITY TYPE

If queryType = "company":
- The "entities" list must contain COMPANY NAMES (organizations, businesses)
- Example entities: ["Acme Corp", "TechStartup Inc", "Global Industries"]
- Results will show: company name, website, description, size, services

If queryType = "contact":
- The "entities" list must contain PERSON NAMES (individuals, not companies)
- Example entities: ["John Smith", "Sarah Johnson", "Michael Chen"]
- Results will show: person's name, role/title, their company, LinkedIn
- If the cursory search only found companies, create targetedQueries to find PEOPLE at those companies

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

**standardFields - match the queryType:**
- For companies: name, website, city, state, country, description, size, services
- For contacts: name, role, company, companyWebsite, linkedinUrl, city, state, country, department

**entities - MUST match queryType:**
- If queryType = "company": List company/organization names
- If queryType = "contact": List individual person names (NOT company names!)
- If searching for contacts but cursory results only have companies, leave entities sparse and use targetedQueries

**targetedQueries - fill the gaps:**
- Maximum 3 queries
- For contact searches where you only found companies, search for people:
  - "[Company Name] [role] executive LinkedIn"
  - "[Company Name] VP procurement director"
  - "Who is the [role] at [Company Name]"
- Only include if genuinely needed

**gaps:**
- For contacts: "Need to identify specific individuals at these companies"
- For companies: "Need more details on company size/services"`;

const EXTRACTION_PROMPT = `You extract structured data from research results for a B2B lead generation system.

Given:
- The original query for context
- Entity type (company or contact)
- List of standard fields to extract
- List of custom fields to extract
- Names of entities to extract
- All research data collected

CRITICAL: Match the entity type exactly.

FOR COMPANY RESULTS (type: "company"):
Each result represents an ORGANIZATION. Required structure:
{
  "type": "company",
  "name": "Company Name",
  "website": "https://...",
  "city": "City",
  "state": "State/Province",
  "country": "Country",
  "description": "Brief description of the company",
  "size": "Employee count or range",
  "services": "Main services/products",
  "superSearchMeta": {
    "customFieldKey": "extracted value"
  }
}

FOR CONTACT RESULTS (type: "contact"):
Each result represents a PERSON. Required structure:
{
  "type": "contact",
  "name": "Person's Full Name",
  "role": "Job Title",
  "company": "Their Company Name",
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
1. The "type" field MUST match the Entity Type provided
2. For contacts: "name" must be a PERSON'S NAME (e.g., "John Smith"), NOT a company name
3. For contacts: "role" must be their job title (e.g., "VP of Procurement", "Director of Supply Chain")
4. For contacts: "company" is the organization they work at (use empty string "" if unknown)
5. Only include standard fields that were requested
6. Put all custom field values in superSearchMeta using the exact keys provided
7. Use null for values that cannot be determined - do NOT fabricate
8. superSearchMeta values should be concise (under 100 chars each)
9. Return a JSON array, even for single results

QUALITY STANDARDS:
- For contacts: MUST have person's name and role - these are the primary identifiers
- For companies: MUST have company name - this is the primary identifier
- Accuracy over completeness - only include what's verifiable
- LinkedIn URLs should be full URLs, not just usernames
- Company websites should include https://

If you cannot find person-specific data for a contact search, indicate this clearly rather than returning company data in contact fields.`;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface QueryAnalysis {
  intent: string;
  entityType: 'company' | 'contact';
  preliminaryFields: string[];
  suggestedCustomFields: Array<{ key: string; label: string }>;
  searchQuery: string;
  signalsToLookFor: string[];
  ambiguityNotes: string | null;
}

interface ResearchPlan {
  plan: SearchPlan;
  entities: string[];
  gaps: string[];
  targetedQueries: string[];
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
  
  const customFields: CustomField[] = (parsed.customFields || analysis.suggestedCustomFields || []).map((f: any) => ({
    key: f.key,
    label: f.label
  }));

  return {
    plan: {
      queryType: parsed.queryType || analysis.entityType,
      targetCount: parsed.targetCount || 10,
      standardFields: parsed.standardFields || analysis.preliminaryFields,
      customFields,
      searchStrategy: parsed.searchStrategy || analysis.intent
    },
    entities: parsed.entities || [],
    gaps: parsed.gaps || [],
    targetedQueries: parsed.targetedQueries || []
  };
}

async function deepSearch(queries: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  for (const query of queries) {
    try {
      const result = await cursorSearch(query);
      results.set(query, result);
    } catch (error) {
      console.error(`[v3] Deep search failed for query: ${query}`, error);
      results.set(query, '');
    }
  }
  
  return results;
}

async function extractResults(
  query: string,
  plan: SearchPlan,
  entities: string[],
  allResearchData: string
): Promise<SuperSearchResult[]> {
  const results: SuperSearchResult[] = [];
  
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
        for (const item of parsed) {
          if (item.type === 'contact' && (!item.company || item.company === 'Unknown')) {
            item.company = '';
          }
          results.push(item);
        }
      } catch (e) {
        console.error('[v3] Failed to parse extraction results:', e);
      }
    }
  }
  
  return results;
}

export async function* executeSearch(query: string): AsyncGenerator<StreamEvent, void, unknown> {
  try {
    yield { type: 'progress', data: 'Analyzing your query to understand intent...' };
    
    const analysis = await analyzeQuery(query);
    
    yield { type: 'progress', data: `Understanding: ${analysis.intent}` };
    
    if (analysis.ambiguityNotes) {
      yield { type: 'progress', data: `Note: ${analysis.ambiguityNotes}` };
    }

    yield { type: 'progress', data: 'Searching for relevant information...' };
    
    const cursoryResults = await cursorSearch(analysis.searchQuery);

    yield { type: 'progress', data: 'Analyzing findings and planning detailed research...' };
    
    const researchPlan = await planResearch(query, analysis, cursoryResults);
    
    yield { type: 'plan', data: researchPlan.plan };
    
    const gapsMessage = researchPlan.gaps.length > 0 
      ? ` Gaps to fill: ${researchPlan.gaps.slice(0, 2).join(', ')}` 
      : '';
    yield { type: 'progress', data: `Found ${researchPlan.entities.length} entities.${gapsMessage}` };

    let allResearchData = cursoryResults;
    
    if (researchPlan.targetedQueries.length > 0) {
      yield { type: 'progress', data: `Running ${researchPlan.targetedQueries.length} targeted searches...` };
      
      const deepResults = await deepSearch(researchPlan.targetedQueries);
      
      for (const [q, result] of Array.from(deepResults.entries())) {
        allResearchData += `\n\n--- Research: ${q} ---\n${result}`;
      }
    }

    const limitedEntities = researchPlan.entities.slice(0, researchPlan.plan.targetCount);
    
    yield { type: 'progress', data: `Extracting structured data for ${limitedEntities.length} results...` };
    
    const results = await extractResults(query, researchPlan.plan, limitedEntities, allResearchData);
    
    for (const result of results) {
      yield { type: 'result', data: result };
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[v3_anthropic_query-first] Error:', error);
    yield { type: 'error', data: errorMessage };
  }
}
