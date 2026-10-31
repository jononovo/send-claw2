import type { Contact } from "@shared/schema";
import type { EnhancedContactFinderOptions } from "./finder";

export interface FallbackAnalysis {
  currentContactCount: number;
  shouldTriggerFallback: boolean;
  recommendedFallbacks: string[];
  reasoning: string;
}

export interface ContactThresholds {
  MINIMUM: number;
  OPTIMAL: number;  
  MAXIMUM: number;
}

export class SmartFallbackManager {
  private static readonly CONTACT_THRESHOLDS: ContactThresholds = {
    MINIMUM: 3,    // Trigger fallback if below this (per company)
    OPTIMAL: 5,    // Target number of contacts per company
    MAXIMUM: 10    // Stop additional searches if above this (per company)
  };

  /**
   * Analyze if fallback searches are needed based on current contact count
   */
  static analyzeFallbackNeeds(
    currentContacts: Partial<Contact>[],
    originalConfig: EnhancedContactFinderOptions
  ): FallbackAnalysis {
    const contactCount = currentContacts.length;
    const fallbacks: string[] = [];
    
    // Check quality of current contacts
    const qualityContacts = currentContacts.filter(contact => 
      (contact.probability || 0) >= 70
    );
    
    let reasoning = `Found ${contactCount} contacts (${qualityContacts.length} high-quality)`;
    
    // Simplified fallback logic: Only trigger if < 3 contacts per company
    if (contactCount < this.CONTACT_THRESHOLDS.MINIMUM) {
      // Only add ONE fallback search, prioritized by most likely to yield results
      if (!originalConfig.enableCoreLeadership) {
        fallbacks.push('enableCoreLeadership');
        reasoning += `. Only ${contactCount} contacts found - adding core leadership fallback`;
      } else if (!originalConfig.enableDepartmentHeads) {
        fallbacks.push('enableDepartmentHeads');
        reasoning += `. Only ${contactCount} contacts found - adding department heads fallback`;
      } else {
        reasoning += `. Only ${contactCount} contacts found - all search types already enabled`;
      }
    }
    
    return {
      currentContactCount: contactCount,
      shouldTriggerFallback: fallbacks.length > 0,
      recommendedFallbacks: fallbacks,
      reasoning
    };
  }

  /**
   * Execute fallback searches for specific search types
   */
  static async executeFallbackSearches(
    companyName: string,
    fallbacks: string[],
    industry?: string,
    searchFunctions?: {
      searchCoreLeadership?: (companyName: string, industry?: string) => Promise<Partial<Contact>[]>;
      searchDepartmentHeads?: (companyName: string, industry?: string) => Promise<Partial<Contact>[]>;
    }
  ): Promise<Partial<Contact>[]> {
    const fallbackContacts: Partial<Contact>[] = [];
    
    if (!searchFunctions) {
      console.log('Search functions not provided to SmartFallbackManager');
      return fallbackContacts;
    }
    
    for (const fallback of fallbacks) {
      console.log(`Executing smart fallback search: ${fallback} for ${companyName}`);
      
      try {
        switch (fallback) {
          case 'enableCoreLeadership':
            if (searchFunctions.searchCoreLeadership) {
              const coreContacts = await searchFunctions.searchCoreLeadership(companyName, industry);
              fallbackContacts.push(...coreContacts);
              console.log(`Smart fallback: Found ${coreContacts.length} core leadership contacts`);
            }
            break;
          case 'enableDepartmentHeads':
            if (searchFunctions.searchDepartmentHeads) {
              const deptContacts = await searchFunctions.searchDepartmentHeads(companyName, industry);
              fallbackContacts.push(...deptContacts);
              console.log(`Smart fallback: Found ${deptContacts.length} department head contacts`);
            }
            break;
        }
      } catch (error) {
        console.error(`Error in fallback search ${fallback}:`, error);
        continue;
      }
    }
    
    console.log(`Smart fallback complete: ${fallbackContacts.length} additional contacts found`);
    return fallbackContacts;
  }

  /**
   * Check if we should continue with additional searches based on contact count
   */
  static shouldContinueSearching(
    currentContacts: Partial<Contact>[],
    nextSearchType: string
  ): boolean {
    const contactCount = currentContacts.length;
    const qualityContacts = currentContacts.filter(contact => 
      (contact.probability || 0) >= 70
    );
    
    // Stop if we have enough contacts for this company
    if (contactCount >= this.CONTACT_THRESHOLDS.OPTIMAL) {
      console.log(`Stopping ${nextSearchType} search: Already have ${contactCount} contacts (optimal: ${this.CONTACT_THRESHOLDS.OPTIMAL})`);
      return false;
    }
    
    // Also stop if we have too many contacts
    if (contactCount >= this.CONTACT_THRESHOLDS.MAXIMUM) {
      console.log(`Stopping ${nextSearchType} search: Already have ${contactCount} contacts (max: ${this.CONTACT_THRESHOLDS.MAXIMUM})`);
      return false;
    }
    
    return true;
  }

  /**
   * Apply smart deduplication and filtering after fallback searches
   */
  static optimizeContactResults(
    originalContacts: Partial<Contact>[],
    fallbackContacts: Partial<Contact>[],
    maxContacts: number = 15
  ): Partial<Contact>[] {
    // Combine all contacts
    const allContacts = [...originalContacts, ...fallbackContacts];
    
    // Deduplicate by name (case-insensitive)
    const uniqueContacts = allContacts.filter((contact, index, self) =>
      index === self.findIndex(c => 
        c.name && contact.name && 
        c.name.toLowerCase().trim() === contact.name.toLowerCase().trim()
      )
    );
    
    // Sort by probability (highest first)
    const sortedContacts = uniqueContacts.sort((a, b) => 
      (b.probability || 0) - (a.probability || 0)
    );
    
    // Limit to max contacts
    const limitedContacts = sortedContacts.slice(0, maxContacts);
    
    console.log(`Contact optimization: ${allContacts.length} → ${uniqueContacts.length} → ${limitedContacts.length}`);
    
    return limitedContacts;
  }
}