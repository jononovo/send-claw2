import { ExtensionSearchParams, ExtensionSearchResult } from './types';
import { SearchJobService } from '../services/search-job-service';
import { discoverCompanies } from '../perplexity/company-search';

export class ExtensionSearchService {
  /**
   * Execute an extension search to find additional companies
   * This is separate from the core search flow to maintain clean separation
   */
  static async extendSearch(params: ExtensionSearchParams): Promise<ExtensionSearchResult> {
    const { userId, originalQuery, excludeCompanyNames, contactSearchConfig, listId } = params;
    
    console.log(`[ExtensionSearch] Starting extension for user ${userId}`);
    console.log(`[ExtensionSearch] Query: "${originalQuery}"`);
    console.log(`[ExtensionSearch] Excluding ${excludeCompanyNames.length} existing companies`);
    
    // Step 1: Discover new companies with exclusions
    const discoveredCompanies = await discoverCompanies(originalQuery, excludeCompanyNames);
    console.log(`[ExtensionSearch] Perplexity returned ${discoveredCompanies.length} companies`);
    
    // Step 2: Additional filtering as safety measure
    const filteredCompanies = discoveredCompanies.filter(company => {
      const isExcluded = excludeCompanyNames.some(excludedName => 
        excludedName.toLowerCase() === company.name.toLowerCase()
      );
      return !isExcluded;
    });
    
    console.log(`[ExtensionSearch] After filtering: ${filteredCompanies.length} companies`);
    
    // Step 3: Take only 5 additional companies
    const additionalCompanies = filteredCompanies.slice(0, 5);
    console.log(`[ExtensionSearch] Selected ${additionalCompanies.length} companies for extension`);
    
    if (additionalCompanies.length === 0) {
      return {
        jobId: '',
        companies: []
      };
    }
    
    // Step 4: Create a dedicated extension job
    const jobId = await SearchJobService.createJob({
      userId,
      query: originalQuery,
      searchType: 'extension' as any, // New dedicated search type
      contactSearchConfig: contactSearchConfig || {
        enableCoreLeadership: true,
        enableDepartmentHeads: true,
        enableMiddleManagement: true
      },
      source: 'frontend',
      metadata: {
        isExtension: true,
        listId,
        additionalCompanies: additionalCompanies.map(c => ({
          name: c.name,
          website: c.website,
          city: c.city,
          country: c.country
        }))
      },
      priority: 1
    });
    
    // Step 5: Execute the job in background
    SearchJobService.executeJob(jobId).catch(error => {
      console.error(`[ExtensionSearch] Background execution failed for job ${jobId}:`, error);
    });
    
    return {
      jobId,
      companies: additionalCompanies
    };
  }
  
  /**
   * Execute an extension job - separate handler from core search
   * This processes pre-discovered companies with full enrichment flow
   */
  static async executeExtensionJob(job: any, jobId: string): Promise<void> {
    const metadata = job.metadata as any;
    if (!metadata?.additionalCompanies || !Array.isArray(metadata.additionalCompanies)) {
      throw new Error('Extension job missing additionalCompanies in metadata');
    }
    
    console.log(`[ExtensionSearch] Executing extension job ${jobId} with ${metadata.additionalCompanies.length} companies`);
    
    // Import storage
    const { storage } = await import('../../storage');
    
    // Phase 1: Save companies immediately
    const savedCompanies: any[] = [];
    for (const company of metadata.additionalCompanies) {
      const companyData: any = {
        name: company.name,
        website: company.website || null,
        description: null, // Will be enriched later
        userId: job.userId,
        listId: metadata.listId || null,
        city: company.city || null,
        country: company.country || null
      };
      const savedCompany = await storage.createCompany(companyData);
      savedCompanies.push(savedCompany);
    }
    
    console.log(`[ExtensionSearch] Saved ${savedCompanies.length} extension companies`);
    
    // Phase 2: Update job with initial companies
    await storage.updateSearchJob(job.id, {
      results: {
        companies: savedCompanies.map(c => ({ ...c, contacts: [] })),
        contacts: [],
        totalCompanies: savedCompanies.length,
        totalContacts: 0
      }
    });
    
    // Phase 3: Enrich companies and find contacts/emails
    // Import necessary services
    const { enrichCompanyDetails } = await import('../perplexity/company-search');
    const { ContactSearchService } = await import('../services/contact-search-service');
    
    // Parallel enrichment and contact discovery
    const [enrichedDescriptions, contactResults] = await Promise.all([
      enrichCompanyDetails(savedCompanies).catch(error => {
        console.error(`[ExtensionSearch] Company enrichment failed:`, error);
        return [];
      }),
      ContactSearchService.searchContacts({
        companies: savedCompanies,
        userId: job.userId,
        searchConfig: job.contactSearchConfig || ContactSearchService.getDefaultConfig(),
        jobId: job.jobId,
        onProgress: async (message: string) => {
          console.log(`[ExtensionSearch] Contact search progress: ${message}`);
        }
      }).catch(error => {
        console.error(`[ExtensionSearch] Contact search failed:`, error);
        return [];
      })
    ]);
    
    // Update companies with enriched descriptions
    if (enrichedDescriptions && enrichedDescriptions.length > 0) {
      for (const enrichedCompany of enrichedDescriptions) {
        const savedCompany = savedCompanies.find(c => c.name === enrichedCompany.name);
        if (savedCompany && enrichedCompany.description) {
          savedCompany.description = enrichedCompany.description;
          await storage.updateCompany(savedCompany.id, { description: enrichedCompany.description });
        }
      }
    }
    
    // Process contact results
    const contacts: any[] = [];
    if (contactResults && contactResults.length > 0) {
      for (const result of contactResults) {
        const companyContacts = result.contacts.map((contact: any) => ({
          ...contact,
          companyId: result.companyId,
          companyName: result.companyName
        }));
        contacts.push(...companyContacts);
      }
    }
    
    console.log(`[ExtensionSearch] Found ${contacts.length} contacts for extension companies`);
    
    // Phase 4: Find emails if needed
    if (job.searchType === 'extension' && contacts.length > 0) {
      // Import parallel email search
      const { parallelTieredEmailSearch } = await import('../services/parallel-email-search');
      
      // Group contacts by company for email search
      const contactsByCompany: { [companyId: number]: any[] } = {};
      for (const contact of contacts) {
        if (!contactsByCompany[contact.companyId]) {
          contactsByCompany[contact.companyId] = [];
        }
        contactsByCompany[contact.companyId].push(contact);
      }
      
      // Run email search for each company's contacts
      for (const [companyId, companyContacts] of Object.entries(contactsByCompany)) {
        const company = savedCompanies.find(c => c.id === parseInt(companyId));
        if (company) {
          const emailResults = await parallelTieredEmailSearch(companyContacts, company, job.userId);
          console.log(`[ExtensionSearch] Email search for ${company.name}: found ${emailResults.length} emails`);
        }
      }
    }
    
    // Phase 5: Final update with all data
    const companiesWithContacts = savedCompanies.map(company => {
      const companyContacts = contacts.filter((contact: any) => 
        contact.companyId === company.id
      );
      return {
        ...company,
        contacts: companyContacts
      };
    });
    
    await storage.updateSearchJob(job.id, {
      status: 'completed',
      completedAt: new Date(),
      results: {
        companies: companiesWithContacts,
        contacts: contacts,
        totalCompanies: savedCompanies.length,
        totalContacts: contacts.length
      },
      resultCount: savedCompanies.length
    });
    
    console.log(`[ExtensionSearch] Completed extension job ${jobId}: ${savedCompanies.length} companies, ${contacts.length} contacts`);
  }
}