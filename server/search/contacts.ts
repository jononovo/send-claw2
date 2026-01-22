/**
 * Contact Discovery Module
 * 
 * Handles all contact-related search operations including discovery,
 * enrichment, and marking searches as complete.
 */

import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { getUserId, isAuthenticated } from "../utils/auth";
import { searchContactDetails } from "./enrichment/contact-details";
import { findKeyDecisionMakers } from "./contacts/finder";
import { CreditService } from "../features/billing/credits/service";
import { maskContactEmails, maskContactsEmails } from "../utils/email-masker";
import { seoRateLimiter } from "../middleware/seo-rate-limiter";

export function registerContactRoutes(app: Express, requireAuth: any) {
  
  // Get contacts count and stats for the dashboard
  app.get("/api/contacts", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const allContacts = await storage.listContactsWithCompanies(userId);
      
      res.json({
        total: allContacts.length,
        contacts: allContacts
      });
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch contacts"
      });
    }
  });

  // Get a single contact by ID (allows unauthenticated access with masked emails)
  // Rate limited to protect against scraping (30 req/min per IP)
  app.get("/api/contacts/:id", seoRateLimiter, async (req: Request, res: Response) => {
    try {
      const userIsAuthenticated = isAuthenticated(req);
      const userId = getUserId(req);
      
      console.log('GET /api/contacts/:id - Request params:', {
        id: req.params.id,
        userId: userId,
        isAuthenticated: userIsAuthenticated
      });

      // Public page - single query by ID (for SEO accessibility)
      const contact = await storage.getContactPublic(parseInt(req.params.id));

      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      
      // Mask emails for unauthenticated users (SEO bots can't scrape emails)
      const responseContact = userIsAuthenticated ? contact : maskContactEmails(contact);
      res.json(responseContact);
    } catch (error) {
      console.error('Error fetching contact:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });

  // Search for contact details
  app.post("/api/contacts/search", requireAuth, async (req: Request, res: Response) => {
    const { name, company } = req.body;

    if (!name || !company) {
      res.status(400).json({
        message: "Both name and company are required"
      });
      return;
    }

    try {
      const contactDetails = await searchContactDetails(name, company);

      if (Object.keys(contactDetails).length === 0) {
        res.status(404).json({
          message: "No additional contact details found"
        });
        return;
      }

      res.json(contactDetails);
    } catch (error) {
      console.error('Contact search error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during contact search"
      });
    }
  });

  // Enrich contact with Perplexity
  app.post("/api/contacts/:contactId/enrich", requireAuth, async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const userId = getUserId(req);
      console.log('Starting Perplexity email search for contact:', contactId);
      console.log('User ID:', userId);

      // PRE-SEARCH CREDIT CHECK (same as other APIs)
      const creditCheck = await CreditService.getUserCredits(userId);
      if (creditCheck.isBlocked || creditCheck.currentBalance < 20) {
        res.status(402).json({ 
          message: "Insufficient credits for individual email search",
          balance: creditCheck.currentBalance,
          required: 20
        });
        return;
      }

      const contact = await storage.getContact(contactId, userId);
      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      console.log('Contact data from database:', { id: contact.id, name: contact.name, companyId: contact.companyId });

      if (!contact.companyId) {
        res.status(400).json({ message: "Contact has no associated company" });
        return;
      }
      const company = await storage.getCompany(contact.companyId, userId);
      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }
      console.log('Company data from database:', { id: company.id, name: company.name });

      // EXECUTE SEARCH (unchanged)
      console.log('Searching for contact details...');
      const enrichedDetails = await searchContactDetails(contact.name, company.name);
      console.log('Enriched details found:', enrichedDetails);

      // UPDATE CONTACT (unchanged)
      const updateData: any = {
        ...contact,
        linkedinUrl: enrichedDetails.linkedinUrl || contact.linkedinUrl,
        twitterHandle: enrichedDetails.twitterHandle || contact.twitterHandle,
        phoneNumber: enrichedDetails.phoneNumber || contact.phoneNumber,
        department: enrichedDetails.department || contact.department,
        location: enrichedDetails.location || contact.location,
        completedSearches: [...(contact.completedSearches || []), 'contact_enrichment']
      };
      
      // Handle email updates with billing detection
      let emailFound = false;
      if (enrichedDetails.email) {
        console.log('Processing Perplexity search email result:', {
          newEmail: enrichedDetails.email,
          existingEmail: contact.email,
          alternativeEmails: contact.alternativeEmails,
          contactId: contact.id
        });
        
        const { mergeEmailData } = await import('../lib/email-utils');
        const emailUpdates = mergeEmailData(contact, enrichedDetails.email);
        Object.assign(updateData, emailUpdates);
        
        // DETECT EMAIL SUCCESS (same logic as other APIs)
        emailFound = !!(emailUpdates.email || (emailUpdates.alternativeEmails && emailUpdates.alternativeEmails.length > 0));
        
        if (emailUpdates.email) {
          console.log('Setting as primary email:', enrichedDetails.email);
        } else if (emailUpdates.alternativeEmails) {
          console.log('Updated alternative emails:', emailUpdates.alternativeEmails);
        }
      }
      
      const updatedContact = await storage.updateContact(contactId, updateData);
      
      console.log('Perplexity search completed:', {
        success: true,
        emailFound: !!updatedContact?.email,
        contactId
      });

      res.json(updatedContact);
    } catch (error) {
      console.error('Perplexity email search error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during email search"
      });
    }
  });

  // Get contacts by company ID (masks emails for unauthenticated users)
  app.get("/api/companies/:companyId/contacts", async (req: Request, res: Response) => {
    try {
      const userIsAuthenticated = isAuthenticated(req);
      const userId = getUserId(req);
      const companyId = parseInt(req.params.companyId);
      
      // Handle cache invalidation for fresh data requests
      const cacheTimestamp = req.query.t;
      
      const contacts = await storage.listContactsByCompany(companyId, userId);
      
      // Set no-cache headers for fresh data requests
      if (cacheTimestamp) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
      
      // Mask emails for unauthenticated users (SEO bots can't scrape emails)
      const responseContacts = userIsAuthenticated ? contacts : maskContactsEmails(contacts);
      res.json(responseContacts);
    } catch (error) {
      console.error("Error fetching contacts by company:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // Enrich contacts for a specific company (find decision makers)
  // REDIRECTED TO JOB QUEUE FOR RESILIENT PROCESSING
  app.post("/api/companies/:companyId/enrich-contacts", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const companyId = parseInt(req.params.companyId);
      const company = await storage.getCompany(companyId, userId);

      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }

      console.log('[ContactEnrich] Redirecting contact discovery to job queue for company:', company.name);
      
      // Get contact search config from request or use defaults
      const contactSearchConfig = req.body.contactSearchConfig || {
        enableCoreLeadership: true,
        enableDepartmentHeads: true,
        enableMiddleManagement: true,
        enableCustomSearch: false,
        customSearchTarget: ""
      };

      // Import SearchJobService to create a job
      const { SearchJobService } = await import('./services/search-job-service');
      
      // Create a contact-only search job for this specific company
      const jobId = await SearchJobService.createJob({
        userId,
        query: `Contact search for ${company.name}`,
        searchType: 'contact-only',
        contactSearchConfig,
        source: 'frontend',
        metadata: {
          companyIds: [companyId],
          companyName: company.name,
          deleteExisting: true  // Flag to delete existing contacts before adding new ones
        },
        priority: 5  // Higher priority for single company enrichment
      });

      console.log(`[ContactEnrich] Created job ${jobId} for company ${company.name}`);
      
      // Execute immediately for synchronous-like behavior
      try {
        await SearchJobService.executeJob(jobId);
        
        // Get the completed job
        const completedJob = await SearchJobService.getJob(jobId, userId);
        
        // Extract contacts from job results
        const jobResults = completedJob?.results as any;
        const contacts = jobResults?.contacts || [];
        console.log(`[ContactEnrich] Job ${jobId} completed with ${contacts.length} contacts`);
        
        res.json(contacts);
      } catch (error) {
        console.error(`[ContactEnrich] Error executing job ${jobId}:`, error);
        
        // Return partial results or error
        res.status(500).json({
          message: "Contact search job created but processing failed. Check job status.",
          jobId,
          error: error instanceof Error ? error.message : "Processing error"
        });
      }
      
    } catch (error) {
      console.error('[ContactEnrich] Error creating contact search job:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to search for contacts"
      });
    }
  });
}