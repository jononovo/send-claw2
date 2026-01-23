import type { SearchPlan, SuperSearchResult, StreamEvent } from '../../types';
import { SYSTEM_PROMPT } from './system-prompt';

interface PerplexityStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

interface ParseState {
  content: string;
}

function createParseState(): ParseState {
  return { content: '' };
}

function normalizePlan(rawPlan: any): SearchPlan {
  const plan: SearchPlan = {
    queryType: rawPlan.queryType || 'company',
    targetCount: rawPlan.targetCount || 10,
    standardFields: rawPlan.standardFields || [],
    customFields: rawPlan.customFields || [],
    searchStrategy: rawPlan.searchStrategy || '',
  };

  if (plan.standardFields.length === 0) {
    if (plan.queryType === 'company') {
      plan.standardFields = ['name', 'website', 'city', 'country'];
    } else {
      plan.standardFields = ['name', 'role', 'company', 'linkedinUrl'];
    }
  }

  if (!plan.standardFields.includes('name')) {
    plan.standardFields.unshift('name');
  }

  return plan;
}

function parseStreamContent(state: ParseState, content: string, planEmitted: boolean): StreamEvent[] {
  state.content += content;
  const events: StreamEvent[] = [];

  if (!planEmitted) {
    const planMatch = state.content.match(/###PLAN###\s*([\s\S]*?)\s*###END_PLAN###/);
    if (planMatch) {
      try {
        const rawPlan = JSON.parse(planMatch[1]);
        const plan = normalizePlan(rawPlan);
        events.push({ type: 'plan', data: plan });
        state.content = state.content.replace(planMatch[0], '');
        console.log('[v1_perplexity_one-shot] Parsed plan:', plan);
      } catch (e) {
        console.error('[v1_perplexity_one-shot] Failed to parse plan:', e);
      }
    }
  }

  const resultPattern = /###RESULT###\s*([\s\S]*?)\s*###END_RESULT###/g;
  let match;
  while ((match = resultPattern.exec(state.content)) !== null) {
    try {
      const result = JSON.parse(match[1]) as SuperSearchResult;
      events.push({ type: 'result', data: result });
      console.log('[v1_perplexity_one-shot] Parsed result:', result.name);
    } catch (e) {
      console.error('[v1_perplexity_one-shot] Failed to parse result:', e);
    }
  }
  state.content = state.content.replace(resultPattern, '');

  const cleanContent = state.content
    .replace(/###PLAN###[\s\S]*?###END_PLAN###/g, '')
    .replace(/###RESULT###[\s\S]*?###END_RESULT###/g, '')
    .replace(/###PLAN###[\s\S]*/g, '')
    .replace(/###RESULT###[\s\S]*/g, '')
    .trim();

  if (cleanContent && cleanContent.length > 10 && !cleanContent.startsWith('{')) {
    const progressLines = cleanContent.split('\n').filter(l => l.trim().length > 5);
    for (const line of progressLines) {
      if (!line.includes('###')) {
        events.push({ type: 'progress', data: line.trim() });
      }
    }
    state.content = state.content.replace(cleanContent, '');
  }

  return events;
}

export async function* executeSearch(
  query: string
): AsyncGenerator<StreamEvent, void, unknown> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    yield { type: 'error', data: 'Perplexity API key is not configured' };
    return;
  }

  console.log('[v1_perplexity_one-shot] Starting search for:', query);
  
  const parseState = createParseState();

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[v1_perplexity_one-shot] API error:', response.status, errorText);
      yield { type: 'error', data: `API error: ${response.status}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', data: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let planEmitted = false;
    let resultCount = 0;
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const chunk: PerplexityStreamChunk = JSON.parse(data);
          const content = chunk.choices[0]?.delta?.content;
          if (!content) continue;

          fullContent += content;

          const events = parseStreamContent(parseState, content, planEmitted);
          for (const event of events) {
            if (event.type === 'plan') {
              planEmitted = true;
            }
            if (event.type === 'result') {
              resultCount++;
            }
            yield event;
          }
        } catch (e) {
          // Skip unparseable chunks
        }
      }
    }

    if (buffer.trim()) {
      const events = parseStreamContent(parseState, buffer, planEmitted);
      for (const event of events) {
        if (event.type === 'result') resultCount++;
        yield event;
      }
    }

    console.log(`[v1_perplexity_one-shot] Stream complete, ${resultCount} results`);
    console.log(`[v1_perplexity_one-shot] Full response (first 2000 chars):\n${fullContent.substring(0, 2000)}`);
    if (fullContent.length > 2000) {
      console.log(`[v1_perplexity_one-shot] ... (truncated, total length: ${fullContent.length} chars)`);
    }

  } catch (error) {
    console.error('[v1_perplexity_one-shot] Stream error:', error);
    yield { type: 'error', data: error instanceof Error ? error.message : 'Stream failed' };
  }
}
