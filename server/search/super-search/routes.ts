import { Express, Request, Response } from 'express';
import { SuperSearchService } from './super-search-service';
import { getUserId } from '../../utils/auth';
import type { SuperSearchRequest } from './types';

export function registerSuperSearchRoutes(app: Express, requireAuth: any) {
  app.post('/api/super-search/stream', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { query, listId }: SuperSearchRequest = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    console.log(`[SuperSearch] SSE request from user ${userId}: "${query}"`);

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
        query: query.trim()
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
}
