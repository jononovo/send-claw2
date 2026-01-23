import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import type { SearchPlan, SuperSearchResult, StreamEvent, CustomField } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
