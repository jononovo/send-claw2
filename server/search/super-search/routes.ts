import { Express, Request, Response } from 'express';
import { SuperSearchService } from './super-search-service';
import { getUserId } from '../../utils/auth';
import { storage } from '../../storage';
import { listVariants, defaultVariantId } from './search-variants';
import type { SuperSearchRequest, SearchPlan, SuperSearchResult } from './types';

interface SaveSuperSearchRequest {
  query: string;
  plan: SearchPlan;
  results: SuperSearchResult[];
}

interface ExpandSuperSearchRequest {
  originalQuery: string;
  existingResults: Array<{ name: string; website?: string }>;
  additionalCount: number;
  plan: {
    queryType: 'company' | 'contact';
    standardFields: string[];
    customFields: Array<{ key: string; label: string }>;
  };
  variantId?: string;
}

export function registerSuperSearchRoutes(app: Express, requireAuth: any) {
  app.get('/api/super-search/variants', requireAuth, async (_req: Request, res: Response) => {
    try {
      const variants = listVariants();
      res.json({
        variants,
        defaultVariantId
      });
    } catch (error) {
      console.error('[SuperSearch] Error listing variants:', error);
      res.status(500).json({ error: 'Failed to list variants' });
    }
  });

  app.post('/api/super-search/stream', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { query, listId, variantId }: SuperSearchRequest & { variantId?: string } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    console.log(`[SuperSearch] SSE request from user ${userId}: "${query}" (variant: ${variantId || 'default'})`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const searchGenerator = SuperSearchService.executeSearch({
        userId,
        listId,
        query: query.trim(),
        variantId
      });

      for await (const event of searchGenerator) {
        sendEvent(event.type, event.data);

        if (event.type === 'error' || event.type === 'complete') {
          break;
        }
      }
    } catch (error) {
      console.error('[SuperSearch] SSE error:', error);
      sendEvent('error', error instanceof Error ? error.message : 'Stream failed');
    } finally {
      res.end();
    }
  });

  app.post('/api/super-search/expand', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { originalQuery, existingResults, additionalCount, plan, variantId }: ExpandSuperSearchRequest = req.body;

    if (!originalQuery || !existingResults || !additionalCount || !plan) {
      res.status(400).json({ error: 'Missing required fields: originalQuery, existingResults, additionalCount, plan' });
      return;
    }

    console.log(`[SuperSearch] Expand request from user ${userId}: adding ${additionalCount} to ${existingResults.length} existing`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const expandGenerator = SuperSearchService.executeExpandSearch({
        userId,
        originalQuery,
        existingResults,
        additionalCount,
        plan,
        variantId
      });

      for await (const event of expandGenerator) {
        sendEvent(event.type, event.data);

        if (event.type === 'error' || event.type === 'complete') {
          break;
        }
      }
    } catch (error) {
      console.error('[SuperSearch] Expand SSE error:', error);
      sendEvent('error', error instanceof Error ? error.message : 'Expand failed');
    } finally {
      res.end();
    }
  });

  app.post('/api/super-search/check-credits', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const result = await SuperSearchService.checkCredits(userId);
      res.json({
        canSearch: result.hasCredits,
        currentBalance: result.balance,
        requiredCredits: 250
      });
    } catch (error) {
      console.error('[SuperSearch] Credit check error:', error);
      res.status(500).json({ error: 'Failed to check credits' });
    }
  });

  app.post('/api/super-search/save', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { query, plan, results }: SaveSuperSearchRequest = req.body;

      if (!query || !plan || !results) {
        res.status(400).json({ error: 'Missing required fields: query, plan, results' });
        return;
      }

      const listId = await storage.getNextSearchListId();

      const savedList = await storage.createSearchList({
        userId,
        listId,
        prompt: query,
        resultCount: results.length,
        searchType: 'super' as const,
        superSearchData: {
          plan: {
            queryType: plan.queryType,
            targetCount: plan.targetCount,
            standardFields: plan.standardFields,
            customFields: plan.customFields,
            searchStrategy: plan.searchStrategy
          },
          results: results
        }
      } as any);

      console.log(`[SuperSearch] Saved super search ${listId} for user ${userId} with ${results.length} results`);

      res.json({
        success: true,
        listId: savedList.listId,
        id: savedList.id
      });
    } catch (error) {
      console.error('[SuperSearch] Save error:', error);
      res.status(500).json({ error: 'Failed to save super search results' });
    }
  });
}
