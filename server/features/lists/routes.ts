import { Router, Request, Response, Application } from 'express';
import { SearchListsService } from './service';
import { SearchListRequest, UpdateSearchListRequest } from './types';
import { isAuthenticated as checkAuth, getUserId as getAuthUserId } from '../../utils/auth';
import { maskContactEmails } from '../../utils/email-masker';

// Helper function to safely get user ID from request (wrapper around shared utility)
function getUserId(req: Request): number {
  return getAuthUserId(req);
}

export function registerSearchListsRoutes(app: Application, requireAuth: any) {
  const router = Router();

  // Get all lists
  router.get('/', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const isAuthenticated = (req as any).isAuthenticated && (req as any).isAuthenticated() && (req as any).user;
    
    const lists = await SearchListsService.getSearchLists(userId, isAuthenticated);
    res.json(lists);
  });

  // Search for cached list by prompt (for parallel cache check)
  router.get('/by-prompt', async (req: Request, res: Response) => {
    const prompt = req.query.prompt as string;
    
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ message: "Missing or invalid prompt parameter" });
      return;
    }
    
    const userIsAuthenticated = checkAuth(req);
    const userId = userIsAuthenticated ? getUserId(req) : 1;
    
    const cachedList = await SearchListsService.findRecentSearchByPrompt(
      prompt, 
      userId, 
      userIsAuthenticated
    );
    
    if (cachedList) {
      res.json(cachedList);
    } else {
      res.json(null);
    }
  });

  // Get specific list - PUBLIC access for SEO (emails masked for unauthenticated)
  router.get('/:listId', async (req: Request, res: Response) => {
    const userIsAuthenticated = checkAuth(req);
    const listId = parseInt(req.params.listId);
    
    const list = await SearchListsService.getSearchList(listId);
    
    if (!list) {
      res.status(404).json({ message: "List not found" });
      return;
    }
    
    // Mask emails in reportCompanies for unauthenticated users
    if (!userIsAuthenticated && list.reportCompanies) {
      const maskedReportCompanies = list.reportCompanies.map((company: any) => ({
        ...company,
        contacts: company.contacts ? company.contacts.map((contact: any) => maskContactEmails(contact)) : []
      }));
      res.json({ ...list, reportCompanies: maskedReportCompanies });
      return;
    }
    
    res.json(list);
  });

  // Get companies in a list - PUBLIC access for SEO (emails masked for unauthenticated)
  router.get('/:listId/companies', async (req: Request, res: Response) => {
    const userIsAuthenticated = checkAuth(req);
    const listId = parseInt(req.params.listId);
    
    const companies = await SearchListsService.getSearchListCompanies(listId);
    
    // Mask contact emails for unauthenticated users
    const responseCompanies = userIsAuthenticated 
      ? companies 
      : companies.map((company: any) => ({
          ...company,
          contacts: company.contacts ? company.contacts.map((contact: any) => maskContactEmails(contact)) : []
        }));
    
    res.json(responseCompanies);
  });

  // Create new list
  router.post('/', async (req: Request, res: Response) => {
    const body = req.body as SearchListRequest;
    const { companies, prompt, contactSearchConfig } = body;

    console.log(`POST /api/lists called with ${companies?.length || 0} companies`);
    console.log('Call stack context:', new Error().stack?.split('\n')[2]);

    if (!Array.isArray(companies) || !prompt || typeof prompt !== 'string') {
      res.status(400).json({ message: "Invalid request: companies must be an array and prompt must be a string" });
      return;
    }

    try {
      const userId = getUserId(req);
      const list = await SearchListsService.createSearchList(body, userId);
      res.json(list);
    } catch (error) {
      console.error('List creation error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });

  // Update list metrics (for search report persistence)
  router.patch('/:listId/metrics', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.listId);
      const { totalContacts, totalEmails, searchDurationSeconds, sourceBreakdown, reportCompanies } = req.body;
      
      console.log(`PATCH /api/lists/${listId}/metrics called by user ${userId}`);
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid list ID" });
      }
      
      const updated = await SearchListsService.updateSearchListMetrics(listId, {
        totalContacts,
        totalEmails,
        searchDurationSeconds,
        sourceBreakdown,
        reportCompanies
      }, userId);
      
      if (!updated) {
        return res.status(404).json({
          message: "List not found or you don't have permission to update it"
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Metrics update error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update metrics"
      });
    }
  });

  // Update list
  router.put('/:listId', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.listId);
      const body = req.body as UpdateSearchListRequest;
      const { companies, prompt } = body;
      
      console.log(`PUT /api/lists/${listId} called by user ${userId} with ${companies?.length || 0} companies`);
      
      // Validate listId parameter
      if (isNaN(listId)) {
        console.log(`PUT request failed: Invalid listId ${req.params.listId}`);
        return res.status(400).json({
          message: "Invalid list ID"
        });
      }
      
      // Validate companies array
      if (!Array.isArray(companies)) {
        return res.status(400).json({
          message: "Companies must be an array"
        });
      }
      
      const updated = await SearchListsService.updateSearchList(listId, body, userId);
      
      if (!updated) {
        return res.status(404).json({
          message: "List not found or you don't have permission to update it"
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('List update error:', error);
      const message = error instanceof Error ? error.message : "Failed to update list";
      
      // Check if it's a validation error about companies
      if (message.includes('Invalid or unauthorized companies')) {
        res.status(400).json({ message });
      } else {
        res.status(500).json({ message });
      }
    }
  });

  app.use('/api/lists', router);
}