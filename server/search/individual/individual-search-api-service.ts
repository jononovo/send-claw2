import { storage } from '../../storage';
import { CreditService } from '../../features/billing/credits/service';
import { searchPerplexityApi, type StructuredSearchData } from './perplexity-search-api';
import { extractCandidatesWithClaude } from './claude-extraction';
import { enrichIndividualWithEmail } from './individual-search';
import type { SearchJob } from '@shared/schema';
import type { SearchType } from '../../features/billing/credits/types';
import type { CandidateResult } from './types';

/**
 * Individual Search API Service
 * 
 * Uses Perplexity Search API + Claude for extraction:
 * 1. Perplexity Search API → Get 20 raw web results
 * 2. Claude → Extract & score 3-5 candidates
 * 3. Create company/contact records
 * 4. Apollo → Enrich with email addresses
 * 
 * Best of both: Perplexity for search, Claude for structured extraction.
 */
export class IndividualSearchApiService {
  static async executeIndividualSearchJob(job: SearchJob, jobId: string): Promise<void> {
    try {
      console.log(`[IndividualSearchApiService] Starting search for job ${jobId}`);
      console.log(`[IndividualSearchApiService] Query: "${job.query}"`);

      const metadata = job.metadata as Record<string, any> || {};
      const structuredSearch: StructuredSearchData | undefined = metadata.structuredSearch 
        ? {
            fullName: metadata.structuredSearch.fullName,
            location: metadata.structuredSearch.location,
            role: metadata.structuredSearch.role,
            company: metadata.structuredSearch.company,
            otherContext: metadata.structuredSearch.otherContext,
            knownEmail: metadata.structuredSearch.knownEmail,
          }
        : undefined;

      if (structuredSearch) {
        console.log(`[IndividualSearchApiService] Using structured search:`, structuredSearch);
      }

      await storage.updateSearchJob(job.id, {
        progress: {
          phase: 'Searching web',
          completed: 1,
          total: 6,
          message: 'Searching the web for candidates...'
        }
      });

      if (job.source !== 'cron') {
        const creditType: SearchType = 'individual_search';
        const userCredits = await CreditService.getUserCredits(job.userId);
        const { CREDIT_COSTS } = await import('../../features/billing/credits/types');
        const requiredCredits = CREDIT_COSTS[creditType];

        if (userCredits.currentBalance < requiredCredits) {
          console.log(`[IndividualSearchApiService] Insufficient credits for job ${job.id}: has ${userCredits.currentBalance}, needs ${requiredCredits}`);
          await storage.updateSearchJob(job.id, {
            status: 'failed',
            completedAt: new Date(),
            error: `Insufficient credits. You have ${userCredits.currentBalance} credits but this search requires ${requiredCredits} credits.`,
            results: {
              companies: [],
              contacts: [],
              totalCompanies: 0,
              totalContacts: 0,
              searchType: 'individual_search',
              metadata: {
                message: 'Insufficient credits for this search. Please add more credits to continue.'
              }
            },
            resultCount: 0
          });
          return;
        }
      }

      // Step 1: Call Perplexity Search API for raw web results
      const searchResults = await searchPerplexityApi(job.query, structuredSearch);
      
      console.log(`[IndividualSearchApiService] Got ${searchResults.length} web results`);

      if (searchResults.length === 0) {
        await storage.updateSearchJob(job.id, {
          status: 'completed',
          completedAt: new Date(),
          results: {
            companies: [],
            contacts: [],
            totalCompanies: 0,
            totalContacts: 0,
            searchType: 'individual_search',
            metadata: {
              message: `No web results found for "${job.query}". Try a different search.`
            }
          },
          resultCount: 0
        });
        return;
      }

      await storage.updateSearchJob(job.id, {
        progress: {
          phase: 'Analyzing results',
          completed: 2,
          total: 6,
          message: `Found ${searchResults.length} web results, analyzing with AI...`
        }
      });

      // Step 2: Send to Claude to extract and score candidates
      const { candidates, searchContext } = await extractCandidatesWithClaude(job.query, searchResults, structuredSearch);

      console.log(`[IndividualSearchApiService] AI interpreted query as:`, searchContext);

      if (candidates.length === 0) {
        console.log(`[IndividualSearchApiService] No candidates extracted for "${searchContext.interpretedName}"`);
        await storage.updateSearchJob(job.id, {
          status: 'completed',
          completedAt: new Date(),
          results: {
            companies: [],
            contacts: [],
            totalCompanies: 0,
            totalContacts: 0,
            searchType: 'individual_search',
            metadata: {
              searchedName: searchContext.interpretedName,
              webResultsCount: searchResults.length,
              message: `Found ${searchResults.length} web results but couldn't identify specific candidates matching "${searchContext.interpretedName}". Try adding more context like company, role, or location.`
            }
          },
          resultCount: 0
        });
        return;
      }

      console.log(`[IndividualSearchApiService] Extracted ${candidates.length} candidates`);

      await storage.updateSearchJob(job.id, {
        progress: {
          phase: 'Creating records',
          completed: 3,
          total: 6,
          message: `Found ${candidates.length} candidates, creating records...`
        }
      });

      // Step 3: Create company and contact records
      const createdCompanies: any[] = [];
      const createdContacts: any[] = [];
      const listId = (job.metadata as any)?.listId || null;

      for (const candidate of candidates) {
        const { company, contact } = await this.createCandidateRecords(
          job.userId,
          candidate,
          listId
        );
        createdCompanies.push(company);
        createdContacts.push(contact);
      }

      console.log(`[IndividualSearchApiService] Created ${createdCompanies.length} companies and ${createdContacts.length} contacts`);

      await storage.updateSearchJob(job.id, {
        progress: {
          phase: 'Finding emails',
          completed: 4,
          total: 6,
          message: `Searching for email addresses for ${createdContacts.length} candidates...`
        }
      });

      // Step 4: Enrich with emails via Apollo
      for (let i = 0; i < createdContacts.length; i++) {
        const contact = createdContacts[i];
        const company = createdCompanies[i];
        
        await storage.updateSearchJob(job.id, {
          progress: {
            phase: 'Finding emails',
            completed: 4,
            total: 6,
            message: `Finding email for ${contact.name} (${i + 1}/${createdContacts.length})...`
          }
        });
        
        await enrichIndividualWithEmail(contact.id, company.id, job.userId);
      }

      // Step 5: Get enriched contacts
      const enrichedContacts = await Promise.all(
        createdContacts.map(c => storage.getContact(c.id, job.userId))
      );

      // Step 6: Deduct credits
      if (job.source !== 'cron') {
        await storage.updateSearchJob(job.id, {
          progress: {
            phase: 'Processing credits',
            completed: 5,
            total: 6,
            message: 'Updating account credits'
          }
        });

        const creditType: SearchType = 'individual_search';
        const creditResult = await CreditService.deductCredits(
          job.userId,
          creditType,
          true
        );

        console.log(`[IndividualSearchApiService] Deducted credits, new balance: ${creditResult.newBalance}`);
      }

      const companiesWithContacts = createdCompanies.map((company, index) => ({
        ...company,
        contacts: enrichedContacts[index] ? [enrichedContacts[index]] : [createdContacts[index]]
      }));

      await storage.updateSearchJob(job.id, {
        status: 'completed',
        completedAt: new Date(),
        progress: {
          phase: 'Complete',
          completed: 6,
          total: 6,
          message: `Found ${candidates.length} candidates`
        },
        results: {
          companies: companiesWithContacts,
          contacts: enrichedContacts.filter(Boolean),
          totalCompanies: createdCompanies.length,
          totalContacts: createdContacts.length,
          searchType: 'individual_search',
          metadata: {
            candidateCount: candidates.length,
            webResultsCount: searchResults.length,
            searchedName: searchContext.interpretedName,
            hints: {
              company: searchContext.interpretedCompany,
              location: searchContext.interpretedLocation,
              role: searchContext.interpretedRole
            }
          }
        },
        resultCount: candidates.length
      });

      console.log(`[IndividualSearchApiService] Completed search job ${jobId} with ${candidates.length} results`);

    } catch (error) {
      console.error(`[IndividualSearchApiService] Error in individual search:`, error);

      const shouldRetry = (job.retryCount || 0) < (job.maxRetries || 3);

      await storage.updateSearchJob(job.id, {
        status: shouldRetry ? 'pending' : 'failed',
        error: error instanceof Error ? error.message : 'Unknown error in individual search',
        retryCount: (job.retryCount || 0) + 1
      });

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  private static async createCandidateRecords(
    userId: number,
    candidate: CandidateResult,
    listId: number | null
  ): Promise<{ company: any; contact: any }> {
    const companyData = {
      userId,
      name: candidate.currentCompany || 'Unknown Company',
      website: candidate.companyWebsite || null,
      description: null,
      size: null,
      age: null,
      alternativeProfileUrl: null,
      defaultContactEmail: null,
      ranking: null,
      linkedinProminence: null,
      customerCount: null,
      rating: null,
      services: null,
      validationPoints: null,
      differentiation: null,
      totalScore: candidate.score || null,
      snapshot: null,
      city: null,
      state: null,
      country: null,
      listId
    };

    const savedCompany = await storage.createCompany(companyData);
    console.log(`[IndividualSearchApiService] Created company ${savedCompany.id}: ${savedCompany.name}`);

    const contactData = {
      userId,
      name: candidate.name,
      companyId: savedCompany.id,
      role: candidate.currentRole || null,
      email: null,
      probability: candidate.score || null,
      linkedinUrl: candidate.linkedinUrl || null,
      twitterHandle: null,
      phoneNumber: null,
      department: null,
      location: null,
      city: null,
      state: null,
      country: null,
      verificationSource: 'individual_search_api',
      nameConfidenceScore: candidate.score,
      userFeedbackScore: null,
      feedbackCount: null
    };

    const savedContact = await storage.createContact(contactData);
    console.log(`[IndividualSearchApiService] Created contact ${savedContact.id}: ${savedContact.name} (score: ${candidate.score})`);

    return { company: savedCompany, contact: savedContact };
  }
}
