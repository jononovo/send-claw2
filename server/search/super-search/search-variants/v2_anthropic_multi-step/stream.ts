import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import type { SearchPlan, SuperSearchResult, StreamEvent } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ANALYSIS_PROMPT = readFileSync(
  join(__dirname, 'analysis-prompt.txt'),
  'utf-8'
);

const EXTRACTION_PROMPT = readFileSync(
  join(__dirname, 'extraction-prompt.txt'),
  'utf-8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function perplexitySearch(query: string): Promise<string> {
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
      messages: [{ role: 'user', content: query }],
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

async function claudeAnalyze(
  query: string, 
  perplexityResults: string
): Promise<{ plan: SearchPlan; entities: string[] }> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 2000,
    system: ANALYSIS_PROMPT,
    messages: [
      {
        role: 'user',
        content: `User Query: "${query}"

Raw Search Results:
${perplexityResults}

Extract entities and create a research plan.`
      }
    ]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    plan: {
      queryType: parsed.queryType || 'company',
      targetCount: parsed.targetCount || 10,
      standardFields: parsed.standardFields || ['name', 'website', 'description'],
      customFields: parsed.customFields || [],
      searchStrategy: parsed.searchStrategy || ''
    },
    entities: parsed.entities || []
  };
}

async function claudeExtractEntity(
  entity: string,
  query: string,
  plan: SearchPlan,
  perplexityData: string
): Promise<SuperSearchResult> {
  const standardFieldsList = plan.standardFields.join(', ');
  const customFieldsList = plan.customFields.map(f => `- ${f.key}: ${f.label}`).join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: EXTRACTION_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Entity: "${entity}"
Query Context: "${query}"
Entity Type: ${plan.queryType}

Standard fields to extract: ${standardFieldsList}

Custom fields to extract:
${customFieldsList || '(none)'}

Research Data:
${perplexityData}

Extract structured data for this entity.`
      }
    ]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    if (plan.queryType === 'contact') {
      return {
        type: 'contact',
        name: entity,
        company: '',
        superSearchMeta: {}
      };
    }
    return {
      type: 'company',
      name: entity,
      superSearchMeta: {}
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  if (plan.queryType === 'contact') {
    return {
      type: 'contact' as const,
      name: parsed.name || entity,
      company: parsed.company || '',
      role: parsed.role,
      companyWebsite: parsed.companyWebsite,
      city: parsed.city,
      state: parsed.state,
      country: parsed.country,
      department: parsed.department,
      superSearchMeta: parsed.superSearchMeta || {}
    };
  }
  
  return {
    type: 'company' as const,
    name: parsed.name || entity,
    website: parsed.website,
    city: parsed.city,
    state: parsed.state,
    country: parsed.country,
    description: parsed.description,
    size: parsed.size,
    services: parsed.services,
    superSearchMeta: parsed.superSearchMeta || {}
  };
}

export async function* executeSearch(query: string): AsyncGenerator<StreamEvent, void, unknown> {
  try {
    yield { type: 'progress', data: 'Searching the web for relevant information...' };

    const exploratoryResults = await perplexitySearch(
      `Find companies, organizations, or entities relevant to: ${query}. Include specific names, details, and any available data points.`
    );

    yield { type: 'progress', data: 'Analyzing results and planning research...' };

    const { plan, entities } = await claudeAnalyze(query, exploratoryResults);

    yield { type: 'plan', data: plan };

    const limitedEntities = entities.slice(0, plan.targetCount);

    for (let i = 0; i < limitedEntities.length; i++) {
      const entity = limitedEntities[i];
      yield { type: 'progress', data: `Researching ${entity} (${i + 1}/${limitedEntities.length})...` };

      try {
        const fieldQueries = [
          ...plan.standardFields,
          ...plan.customFields.map(f => f.label)
        ].join(', ');
        
        const enrichmentQuery = `${entity}: ${fieldQueries} related to ${query}`;
        const enrichmentData = await perplexitySearch(enrichmentQuery);

        const result = await claudeExtractEntity(entity, query, plan, enrichmentData);
        yield { type: 'result', data: result };
      } catch (err) {
        console.error(`Error enriching ${entity}:`, err);
        const fallbackResult: SuperSearchResult = plan.queryType === 'contact'
          ? { type: 'contact', name: entity, company: '', superSearchMeta: {} }
          : { type: 'company', name: entity, superSearchMeta: {} };
        yield { type: 'result', data: fallbackResult };
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Search error:', error);
    yield { type: 'error', data: errorMessage };
  }
}
