import { storage } from '../../storage';
import { CreditService } from '../../features/billing/credits/service';
import { streamSuperSearch } from './perplexity-stream';
import type { SearchPlan, SuperSearchResult, CompanyResult, ContactResult, StreamEvent } from './types';

export interface SuperSearchContext {
  userId: number;
  listId?: number;
  query: string;
}

export interface SavedResults {
  companiesSaved: number;
  contactsSaved: number;
}

export class SuperSearchService {
  private static readonly CREDIT_COST = 250;

  static async checkCredits(userId: number): Promise<{ hasCredits: boolean; balance: number }> {
    const credits = await CreditService.getUserCredits(userId);
    return {
      hasCredits: credits.currentBalance >= this.CREDIT_COST,
      balance: credits.currentBalance
    };
  }

  static async* executeSearch(context: SuperSearchContext): AsyncGenerator<StreamEvent, void, unknown> {
    const { userId, listId, query } = context;

    console.log(`[SuperSearchService] Starting search for user ${userId}: "${query}"`);

    const creditCheck = await this.checkCredits(userId);
    if (!creditCheck.hasCredits) {
      yield {
        type: 'error',
        data: `Insufficient credits. You have ${creditCheck.balance} credits but Super Search requires ${this.CREDIT_COST} credits.`
      };
      return;
    }

    const collectedResults: SuperSearchResult[] = [];
    let plan: SearchPlan | null = null;

    try {
      for await (const event of streamSuperSearch(query)) {
        if (event.type === 'plan') {
          plan = event.data;
        }

        if (event.type === 'result') {
          collectedResults.push(event.data);
        }

        yield event;
      }

      const savedResults = await this.saveResults(userId, listId, collectedResults);

      await CreditService.deductCredits(userId, 'super_search', true);
      console.log(`[SuperSearchService] Deducted ${this.CREDIT_COST} credits from user ${userId}`);

      yield {
        type: 'complete',
        data: {
          totalResults: collectedResults.length,
          companiesSaved: savedResults.companiesSaved,
          contactsSaved: savedResults.contactsSaved
        }
      };

    } catch (error) {
      console.error('[SuperSearchService] Error during search:', error);
      yield {
        type: 'error',
        data: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  private static async saveResults(
    userId: number,
    listId: number | undefined,
    results: SuperSearchResult[]
  ): Promise<SavedResults> {
    let companiesSaved = 0;
    let contactsSaved = 0;

    const companyMap = new Map<string, number>();

    for (const result of results) {
      try {
        if (result.type === 'company') {
          const companyResult = result as CompanyResult;
          const company = await storage.createCompany({
            userId,
            name: companyResult.name,
            website: companyResult.website || null,
            city: companyResult.city || null,
            country: companyResult.country || null,
            listId: listId || null,
            superSearchNote: companyResult.superSearchNote || null,
            superSearchResearch: companyResult.superSearchResearch || null,
            superSearchMeta: companyResult.superSearchMeta || null,
            description: null,
            age: null,
            size: null,
            alternativeProfileUrl: null,
            defaultContactEmail: null,
            ranking: null,
            linkedinProminence: null,
            customerCount: null,
            rating: null,
            services: null,
            validationPoints: null,
            differentiation: null,
            totalScore: null,
            snapshot: null,
            state: null
          } as any);
          companyMap.set(companyResult.name.toLowerCase(), company.id);
          companiesSaved++;
          console.log(`[SuperSearchService] Saved company: ${company.name} (ID: ${company.id})`);
        } else if (result.type === 'contact') {
          const contactResult = result as ContactResult;
          
          let companyId = companyMap.get(contactResult.company?.toLowerCase() || '');
          
          if (!companyId && contactResult.company) {
            const company = await storage.createCompany({
              userId,
              name: contactResult.company,
              website: contactResult.companyWebsite || null,
              listId: listId || null,
              description: null,
              age: null,
              size: null,
              city: null,
              state: null,
              country: null,
              alternativeProfileUrl: null,
              defaultContactEmail: null,
              ranking: null,
              linkedinProminence: null,
              customerCount: null,
              rating: null,
              services: null,
              validationPoints: null,
              differentiation: null,
              totalScore: null,
              snapshot: null,
              superSearchNote: null,
              superSearchResearch: null,
              superSearchMeta: null
            } as any);
            companyId = company.id;
            companyMap.set(contactResult.company.toLowerCase(), company.id);
            companiesSaved++;
          }

          const contact = await storage.createContact({
            userId,
            companyId: companyId || undefined,
            name: contactResult.name,
            role: contactResult.role || null,
            linkedinUrl: contactResult.linkedinUrl || null,
            city: contactResult.city || null,
            country: contactResult.country || null,
            superSearchNote: contactResult.superSearchNote || null,
            superSearchResearch: contactResult.superSearchResearch || null,
            superSearchMeta: contactResult.superSearchMeta || null,
            email: null,
            probability: null,
            twitterHandle: null,
            phoneNumber: null,
            companyPhoneNumber: null,
            department: null,
            location: null,
            state: null,
            verificationSource: 'super_search',
            nameConfidenceScore: null,
            userFeedbackScore: null,
            feedbackCount: 0
          } as any);
          contactsSaved++;
          console.log(`[SuperSearchService] Saved contact: ${contact.name} (ID: ${contact.id})`);
        }
      } catch (error) {
        console.error('[SuperSearchService] Error saving result:', error);
      }
    }

    console.log(`[SuperSearchService] Saved ${companiesSaved} companies and ${contactsSaved} contacts`);
    return { companiesSaved, contactsSaved };
  }
}
