import type { Company, Contact } from "@shared/schema";
import { queryPerplexity } from "./perplexity-client";
import type { PerplexityMessage } from "./perplexity-types";
import { analyzeWithPerplexity } from "./perplexity-utils";
import { findKeyDecisionMakers } from "../contacts/finder";
import { cleanPerplexityResponse } from "../../lib/utils";

// Core search functions

// Helper function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fast discovery - just get names and websites for immediate display (5-7 seconds)
export async function discoverCompanies(query: string, excludeCompanies: string[] = []): Promise<Array<{name: string, website: string | null, city: string | null, country: string | null}>> {
  console.log(`[PERPLEXITY API CALL] discoverCompanies called with query: "${query}"`);
  console.log(`[PERPLEXITY API CALL] Excluding ${excludeCompanies.length} companies:`, excludeCompanies);
  console.log(`[PERPLEXITY API CALL] Timestamp: ${new Date().toISOString()}`);
  
  // Create exclusion instruction if we have companies to exclude
  const excludeInstruction = excludeCompanies.length > 0 
    ? `\nDO NOT include these companies (they have already been found): ${excludeCompanies.join(', ')}` 
    : '';
  
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "Be precise and concise. Return results immediately. Website: Only include the official domain." 
    },
    {
      role: "user",
      content: `List 7 companies matching: ${query}${excludeInstruction}
Return ONLY company names and websites. Be concise.
Format: JSON array with "name" and "website" fields.`
    }
  ];

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    
    try {
      console.log(`[PERPLEXITY API CALL] Making fast discovery request to Perplexity (attempt ${attempt}/${maxRetries})`);
      const response = await queryPerplexity(messages);
      const elapsed = Date.now() - startTime;
      console.log(`[PERPLEXITY API CALL] Discovery completed in ${elapsed}ms`);
      console.log('Raw Perplexity discovery response:', response);
      
      const cleanedResponse = cleanPerplexityResponse(response);
      const jsonMatch = cleanedResponse.match(/(\[\s*\{[\s\S]*?\}\s*\])/);
      const jsonString = jsonMatch ? jsonMatch[1] : cleanedResponse;
      
      try {
        const parsed = JSON.parse(jsonString);
        const companiesArray = Array.isArray(parsed) ? parsed : 
                            (parsed.companies && Array.isArray(parsed.companies) ? parsed.companies : null);
        
        if (companiesArray) {
          const companies = companiesArray.slice(0, 7).map((company: {name: string, website?: string, city?: string, country?: string}) => ({
            name: company.name,
            website: company.website || null,
            city: company.city || null,
            country: company.country || null
          }));
          console.log(`Successfully discovered ${companies.length} companies in ${elapsed}ms`);
          return companies;
        }
      } catch (jsonError) {
        console.error('JSON parsing failed in discovery:', jsonError);
      }
      
      // Fallback parsing for names, websites, city, and country
      const nameMatches = cleanedResponse.match(/"name":\s*"([^"]*)"/g) || [];
      const websiteMatches = cleanedResponse.match(/"website":\s*"([^"]*)"/g) || [];
      const cityMatches = cleanedResponse.match(/"city":\s*"([^"]*)"/g) || [];
      const countryMatches = cleanedResponse.match(/"country":\s*"([^"]*)"/g) || [];
      
      const companies = [];
      for (let i = 0; i < nameMatches.length && companies.length < 7; i++) {
        const nameMatch = nameMatches[i].match(/"name":\s*"([^"]*)"/);
        if (nameMatch && nameMatch[1]) {
          let website = null;
          if (i < websiteMatches.length) {
            const websiteMatch = websiteMatches[i].match(/"website":\s*"([^"]*)"/);
            website = websiteMatch && websiteMatch[1] ? websiteMatch[1].trim() : null;
          }
          let city = null;
          if (i < cityMatches.length) {
            const cityMatch = cityMatches[i].match(/"city":\s*"([^"]*)"/);
            city = cityMatch && cityMatch[1] ? cityMatch[1].trim() : null;
          }
          let country = null;
          if (i < countryMatches.length) {
            const countryMatch = countryMatches[i].match(/"country":\s*"([^"]*)"/);
            country = countryMatch && countryMatch[1] ? countryMatch[1].trim() : null;
          }
          companies.push({
            name: nameMatch[1].trim(),
            website: website,
            city: city,
            country: country
          });
        }
      }
      
      if (companies.length > 0) {
        console.log(`Extracted ${companies.length} companies using fallback in ${elapsed}ms`);
        return companies;
      }
      
      return [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[PERPLEXITY API CALL] Error in company discovery (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        console.log(`[PERPLEXITY API CALL] Retrying in 1 second...`);
        await delay(1000);
      }
    }
  }

  // All retries exhausted - throw error with specific marker so job fails immediately
  console.error(`[PERPLEXITY API CALL] All ${maxRetries} attempts failed for company discovery`);
  const error = new Error('Company discovery failed after all retries. Please try again.');
  (error as any).isPerplexityFailure = true;  // Mark for immediate job failure
  throw error;
}

// Enrichment - get descriptions (can run in parallel with contact search)
export async function enrichCompanyDetails(companies: Array<{name: string, website: string | null}>): Promise<Array<{name: string, description: string | null}>> {
  if (!companies.length) {
    return [];
  }
  
  console.log(`[PERPLEXITY API CALL] enrichCompanyDetails called for ${companies.length} companies`);
  
  const companyList = companies.map(c => `${c.name}${c.website ? ` (${c.website})` : ''}`).join(', ');
  
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "Provide concise 1-2 sentence descriptions of what each company does. If no information is available, leave empty." 
    },
    {
      role: "user",
      content: `For these companies: ${companyList}
Provide a brief description (1-2 sentences) for each.
Format: JSON array with "name" and "description" fields.`
    }
  ];

  const startTime = Date.now();
  
  try {
    console.log(`[PERPLEXITY API CALL] Making enrichment request to Perplexity`);
    const response = await queryPerplexity(messages);
    const elapsed = Date.now() - startTime;
    console.log(`[PERPLEXITY API CALL] Enrichment completed in ${elapsed}ms`);
    
    const cleanedResponse = cleanPerplexityResponse(response);
    const jsonMatch = cleanedResponse.match(/(\[\s*\{[\s\S]*?\}\s*\])/);
    const jsonString = jsonMatch ? jsonMatch[1] : cleanedResponse;
    
    try {
      const parsed = JSON.parse(jsonString);
      const enrichedArray = Array.isArray(parsed) ? parsed : 
                          (parsed.companies && Array.isArray(parsed.companies) ? parsed.companies : []);
      
      const enrichedData = enrichedArray.map((item: {name: string, description?: string}) => ({
        name: item.name,
        description: item.description || null
      }));
      
      console.log(`Successfully enriched ${enrichedData.length} companies in ${elapsed}ms`);
      return enrichedData;
    } catch (jsonError) {
      console.error('Failed to parse enrichment response:', jsonError);
      // Return empty descriptions on failure
      return companies.map(c => ({ name: c.name, description: null }));
    }
  } catch (error) {
    console.error('Error enriching company details:', error);
    // Return empty descriptions on failure
    return companies.map(c => ({ name: c.name, description: null }));
  }
}