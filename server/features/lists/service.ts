import { storage } from '../../storage';
import type { SearchJob, SearchList } from '@shared/schema';
import { CompletedSearchJobResults, SearchListRequest, SearchListResponse, UpdateSearchListRequest } from './types';

export class SearchListsService {
  /**
   * Find a recent search by prompt (for cache lookup)
   * Returns the most recent list matching the prompt within the specified days
   */
  static async findRecentSearchByPrompt(
    prompt: string, 
    userId: number, 
    isAuthenticated: boolean,
    daysBack: number = 90
  ): Promise<{ listId: number; prompt: string; resultCount: number; createdAt: Date } | null> {
    const normalizedPrompt = prompt.toLowerCase().trim();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    // Get all lists for the user (or demo user if not authenticated)
    const targetUserId = isAuthenticated ? userId : 1;
    const lists = await storage.listSearchLists(targetUserId);
    
    // Find ALL matching prompts within date range, then sort to get most recent
    const matchingLists = lists
      .filter(list => 
        list.prompt.toLowerCase().trim() === normalizedPrompt &&
        new Date(list.createdAt) >= cutoffDate
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const matchingList = matchingLists[0]; // Get the most recent match
    
    if (matchingList) {
      console.log(`[CACHE HIT] Found cached search for prompt "${prompt}" (listId: ${matchingList.listId}, created: ${matchingList.createdAt})`);
      return {
        listId: matchingList.listId,
        prompt: matchingList.prompt,
        resultCount: matchingList.resultCount,
        createdAt: matchingList.createdAt
      };
    }
    
    console.log(`[CACHE MISS] No cached search found for prompt "${prompt}" within ${daysBack} days`);
    return null;
  }

  static extractCustomSearchTargets(contactSearchConfig: SearchListRequest['contactSearchConfig']): string[] {
    const customSearchTargets: string[] = [];
    if (contactSearchConfig) {
      if (contactSearchConfig.enableCustomSearch && contactSearchConfig.customSearchTarget) {
        customSearchTargets.push(contactSearchConfig.customSearchTarget);
      }
      if (contactSearchConfig.enableCustomSearch2 && contactSearchConfig.customSearchTarget2) {
        customSearchTargets.push(contactSearchConfig.customSearchTarget2);
      }
    }
    return customSearchTargets;
  }

  /**
   * Builds the saved search for a job that completed with `metadata.saveResultsAsSearchList` set
   * (agent API searches, strategy runs). The job has already saved its companies and contacts.
   * When `SearchJobService.createJob` reserved the number into `metadata.listId`, the companies were
   * linked to it as they were saved; otherwise they are linked here. The strategy tag comes from
   * `metadata.strategyId` and records where the search was run; it is never changed afterwards.
   * Browser searches still create their saved search from the client through `createSearchList`.
   */
  static async createSearchListFromCompletedJob(job: SearchJob, results: CompletedSearchJobResults): Promise<SearchList> {
    const metadata = (job.metadata ?? {}) as { listId?: number; strategyId?: number };
    const companies = results.companies ?? [];

    let listId = metadata.listId;
    if (!listId) {
      listId = await storage.getNextSearchListId();
      for (const company of companies) {
        await storage.updateCompanySearchList(company.id, listId);
      }
    }

    const contacts = companies.flatMap(company => company.contacts ?? []);
    const startedAt = job.startedAt ?? job.createdAt;
    const customSearchTargets = this.extractCustomSearchTargets(job.contactSearchConfig as SearchListRequest['contactSearchConfig']);

    const savedSearch = await storage.createSearchList({
      listId,
      userId: job.userId,
      prompt: job.query,
      resultCount: results.totalCompanies ?? companies.length,
      customSearchTargets: customSearchTargets.length > 0 ? customSearchTargets : null,
      totalContacts: results.totalContacts ?? contacts.length,
      totalEmails: contacts.filter(contact => contact.email).length,
      searchDurationSeconds: startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) : null,
      sourceBreakdown: results.sourceBreakdown ?? null,
      reportCompanies: companies.map(company => ({
        id: company.id,
        name: company.name,
        contacts: (company.contacts ?? []).map(contact => ({
          id: contact.id,
          name: contact.name ?? undefined,
          role: contact.role ?? undefined,
          email: contact.email ?? undefined,
          probability: contact.probability ?? undefined
        }))
      })),
      strategyId: metadata.strategyId ?? null
    });

    console.log(`[SearchLists] Saved search ${listId} created from job ${job.jobId} (${companies.length} companies, ${contacts.length} contacts, strategy ${metadata.strategyId ?? 'none'})`);
    return savedSearch;
  }

  static async getSearchLists(userId: number, isAuthenticated: boolean) {
    if (isAuthenticated) {
      return storage.listSearchLists(userId);
    } else {
      // For unauthenticated users, return only demo lists (userId = 1)
      return storage.listSearchLists(1);
    }
  }

  static async getSearchList(listId: number) {
    // Public page - single query by ID (for SEO accessibility)
    return storage.getSearchListPublic(listId);
  }

  static async getSearchListCompanies(listId: number) {
    // Public page - single query by listId (for SEO accessibility)
    return storage.listCompaniesBySearchListPublic(listId);
  }

  static async createSearchList(request: SearchListRequest, userId: number): Promise<SearchListResponse> {
    const { companies, prompt, contactSearchConfig } = request;
    
    console.log(`🟢 [LIST CREATION] Creating list with ${companies?.length || 0} companies for user ${userId}`);
    console.log(`🟢 [LIST CREATION] Prompt: "${prompt}"`);
    console.log(`🟢 [LIST CREATION] Timestamp: ${new Date().toISOString()}`);
    
    // Check for existing list with the same prompt to prevent duplicates
    const existingLists = await storage.listSearchLists(userId);
    const duplicateList = existingLists.find(list => 
      list.prompt.toLowerCase().trim() === prompt.toLowerCase().trim()
    );
    
    if (duplicateList) {
      console.log(`🟢 [DUPLICATE PREVENTION] Found existing list with same prompt:`);
      console.log(`🟢 [DUPLICATE PREVENTION] Existing listId: ${duplicateList.listId}`);
      console.log(`🟢 [DUPLICATE PREVENTION] Created at: ${duplicateList.createdAt}`);
      console.log(`🟢 [DUPLICATE PREVENTION] Returning existing list instead of creating duplicate`);
      return duplicateList; // Return existing instead of creating new
    }
    
    const listId = await storage.getNextSearchListId();
    const customSearchTargets = this.extractCustomSearchTargets(contactSearchConfig);
    
    console.log(`🟢 [LIST CREATION] Creating new list with ID: ${listId}`);
    
    const list = await storage.createSearchList({
      listId,
      prompt,
      resultCount: companies.length,
      customSearchTargets: customSearchTargets.length > 0 ? customSearchTargets : null,
      userId
    });

    // Save companies and their contacts to database first, then link to list
    const savedCompanyIds: number[] = [];
    for (const company of companies) {
      try {
        // Create or update the company
        let savedCompany;
        if (company.id && typeof company.id === 'number') {
          // Company might already exist, try to get it
          const existing = await storage.getCompany(company.id, userId);
          if (existing) {
            savedCompany = existing;
          } else {
            // Create new company
            savedCompany = await storage.createCompany({
              name: company.name,
              website: company.website || null,
              industry: company.industry || null,
              description: company.description || null,
              size: company.size ? parseInt(company.size as string) : null,
              location: company.location || null,
              revenue: company.revenue || null,
              userId
            });
          }
        } else {
          // No ID, create new company
          savedCompany = await storage.createCompany({
            name: company.name,
            website: company.website || null,
            industry: company.industry || null,
            description: company.description || null,
            size: company.size ? parseInt(company.size as string) : null,
            location: company.location || null,
            revenue: company.revenue || null,
            userId
          });
        }
        
        // Save contacts for this company
        if (company.contacts && company.contacts.length > 0) {
          for (const contact of company.contacts) {
            try {
              // Check if contact already exists
              const existingContacts = await storage.listContactsByCompany(savedCompany.id, userId);
              const existingContact = existingContacts.find(c => 
                (c.email && contact.email && c.email.toLowerCase() === contact.email.toLowerCase()) ||
                (c.name && contact.name && c.name.toLowerCase() === contact.name.toLowerCase())
              );
              
              if (!existingContact) {
                await storage.createContact({
                  name: contact.name,
                  email: contact.email || null,
                  role: contact.role || null,
                  companyId: savedCompany.id,
                  linkedinUrl: contact.linkedinUrl || null,
                  phoneNumber: contact.phoneNumber || null,
                  lastValidated: new Date()
                }, userId);
              }
            } catch (contactError) {
              console.error(`Error saving contact ${contact.name}:`, contactError);
            }
          }
        }
        
        // Link company to search list
        await storage.updateCompanySearchList(savedCompany.id, listId);
        savedCompanyIds.push(savedCompany.id);
      } catch (companyError) {
        console.error(`Error saving company ${company.name}:`, companyError);
      }
    }

    console.log(`Saved ${savedCompanyIds.length} companies and linked them to list ${listId}`);
    return list;
  }

  static async updateSearchList(
    listId: number,
    request: UpdateSearchListRequest,
    userId: number
  ): Promise<SearchListResponse | null> {
    const { companies, prompt, contactSearchConfig } = request;
    
    console.log(`Updating list ${listId} with ${companies?.length || 0} companies for user ${userId}`);
    
    // Check if list exists and user has permission
    const existingList = await storage.getSearchList(listId, userId);
    if (!existingList) {
      console.log(`List update failed: List ${listId} not found for user ${userId}`);
      return null;
    }
    
    console.log(`Found existing list ${listId} for user ${userId}: ${existingList.prompt}`);
    
    // Save companies and their contacts to database first, then link to list
    const savedCompanyIds: number[] = [];
    for (const company of companies) {
      try {
        // Create or update the company
        let savedCompany;
        if (company.id && typeof company.id === 'number') {
          // Company might already exist, try to get it
          const existing = await storage.getCompany(company.id, userId);
          if (existing) {
            savedCompany = existing;
          } else {
            // Create new company
            savedCompany = await storage.createCompany({
              name: company.name,
              website: company.website || null,
              industry: company.industry || null,
              description: company.description || null,
              size: company.size ? parseInt(company.size as string) : null,
              location: company.location || null,
              revenue: company.revenue || null,
              userId
            });
          }
        } else {
          // No ID, create new company
          savedCompany = await storage.createCompany({
            name: company.name,
            website: company.website || null,
            industry: company.industry || null,
            description: company.description || null,
            size: company.size ? parseInt(company.size as string) : null,
            location: company.location || null,
            revenue: company.revenue || null,
            userId
          });
        }
        
        // Save contacts for this company
        if (company.contacts && company.contacts.length > 0) {
          for (const contact of company.contacts) {
            try {
              // Check if contact already exists
              const existingContacts = await storage.listContactsByCompany(savedCompany.id, userId);
              const existingContact = existingContacts.find(c => 
                (c.email && contact.email && c.email.toLowerCase() === contact.email.toLowerCase()) ||
                (c.name && contact.name && c.name.toLowerCase() === contact.name.toLowerCase())
              );
              
              if (!existingContact) {
                await storage.createContact({
                  name: contact.name,
                  email: contact.email || null,
                  role: contact.role || null,
                  companyId: savedCompany.id,
                  linkedinUrl: contact.linkedinUrl || null,
                  phoneNumber: contact.phoneNumber || null,
                  lastValidated: new Date()
                }, userId);
              }
            } catch (contactError) {
              console.error(`Error saving contact ${contact.name}:`, contactError);
            }
          }
        }
        
        // Link company to search list
        await storage.updateCompanySearchList(savedCompany.id, listId);
        savedCompanyIds.push(savedCompany.id);
      } catch (companyError) {
        console.error(`Error saving company ${company.name}:`, companyError);
      }
    }
    
    const customSearchTargets = this.extractCustomSearchTargets(contactSearchConfig);
    
    // Update the list metadata
    const updated = await storage.updateSearchList(listId, {
      prompt,
      resultCount: companies.length,
      customSearchTargets: customSearchTargets.length > 0 ? customSearchTargets : null
    }, userId);
    
    if (!updated) {
      console.log(`List update failed: updateSearchList returned null for list ${listId}`);
      return null;
    }
    
    console.log(`List ${listId} successfully updated with ${savedCompanyIds.length} companies`);
    return updated;
  }

  static async updateSearchListMetrics(
    listId: number,
    metrics: {
      totalContacts?: number | null;
      totalEmails?: number | null;
      searchDurationSeconds?: number | null;
      sourceBreakdown?: { Perplexity: number; Apollo: number; Hunter: number } | null;
      reportCompanies?: Array<{ id: number; name: string; contacts?: Array<{ id: number; name?: string; role?: string; email?: string; probability?: number }> }> | null;
    },
    userId: number
  ): Promise<SearchListResponse | null> {
    console.log(`Updating metrics for list ${listId} for user ${userId}:`, metrics);
    
    // Check if list exists and user has permission
    const existingList = await storage.getSearchList(listId, userId);
    if (!existingList) {
      console.log(`Metrics update failed: List ${listId} not found for user ${userId}`);
      return null;
    }
    
    const updated = await storage.updateSearchList(listId, {
      totalContacts: metrics.totalContacts ?? undefined,
      totalEmails: metrics.totalEmails ?? undefined,
      searchDurationSeconds: metrics.searchDurationSeconds ?? undefined,
      sourceBreakdown: metrics.sourceBreakdown ?? undefined,
      reportCompanies: metrics.reportCompanies ?? undefined
    }, userId);
    
    if (!updated) {
      console.log(`Metrics update failed: updateSearchList returned null for list ${listId}`);
      return null;
    }
    
    console.log(`Metrics for list ${listId} successfully updated`);
    return updated;
  }
}