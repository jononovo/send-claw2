import { Router, Request, Response } from 'express';
import { attributionService } from './service';
import { ATTRIBUTION_EVENTS, type AttributionEventType } from './types';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { source, attributionData } = req.body;
    
    if (!attributionData) {
      return res.status(400).json({ error: 'attributionData is required' });
    }

    const attribution = await attributionService.setAttribution(userId, source || 'unknown', attributionData);
    res.json({ success: true, attribution });
  } catch (error) {
    console.error('[Attribution] Error saving attribution:', error);
    res.status(500).json({ error: 'Failed to save attribution' });
  }
});

router.post('/event', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { event, metadata } = req.body;
    
    if (!event || !ATTRIBUTION_EVENTS.includes(event as AttributionEventType)) {
      return res.status(400).json({ 
        error: 'Invalid event type',
        validEvents: ATTRIBUTION_EVENTS 
      });
    }

    const attribution = await attributionService.logConversionEvent(userId, event as AttributionEventType, metadata);
    res.json({ success: true, attribution });
  } catch (error) {
    console.error('[Attribution] Error logging event:', error);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const attribution = await attributionService.getAttribution(userId);
    res.json(attribution || { source: null, attributionData: {}, conversionEvents: [] });
  } catch (error) {
    console.error('[Attribution] Error fetching attribution:', error);
    res.status(500).json({ error: 'Failed to fetch attribution' });
  }
});

export default router;
