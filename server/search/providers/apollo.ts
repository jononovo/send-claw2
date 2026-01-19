/**
 * Apollo.io Email Provider Module
 * 
 * Handles email discovery using Apollo.io API
 */

import { Request, Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../utils";

export async function searchApolloDirect(contact: any, company: any, apiKey: string): Promise<any> {
  try {
    console.log(`[Apollo] Starting search for ${contact.name} at ${company.name}`);
    
    const axios = (await import('axios')).default;
    const requestData = {
      name: contact.name,
      organization_name: company.name,
      domain: company.website
    };
    
    console.log(`[Apollo] Request data:`, JSON.stringify(requestData));
    
    const response = await axios.post('https://api.apollo.io/v1/people/match', requestData, {
      headers: {
        'X-Api-Key': apiKey
      },
      timeout: 20000
    });

    // Log response status and headers for rate limit info
    console.log(`[Apollo] Response status: ${response.status}`);
    console.log(`[Apollo] Rate limit headers:`, {
      'x-rate-limit-limit': response.headers['x-rate-limit-limit'],
      'x-rate-limit-remaining': response.headers['x-rate-limit-remaining'],
      'x-rate-limit-reset': response.headers['x-rate-limit-reset']
    });
    
    // Log the full response data for debugging
    console.log(`[Apollo] Response data:`, JSON.stringify(response.data));

    if (response.data?.person?.email) {
      console.log(`[Apollo] ✅ Email found for ${contact.name}: ${response.data.person.email}`);
      
      const person = response.data.person;
      const organization = person.organization || {};
      
      return {
        success: true,
        contact: {
          ...contact,
          email: person.email,
          role: person.title || contact.role,
          linkedinUrl: person.linkedin_url || contact.linkedinUrl,
          phoneNumber: person.phone_numbers?.[0]?.sanitized_number || contact.phoneNumber,
          // Apollo data takes priority, falls back to existing (Perplexity) data
          city: person.city || contact.city || null,
          state: person.state || contact.state || null,
          country: person.country || contact.country || null
        },
        company: {
          city: organization.city || null,
          state: organization.state || null,
          country: organization.country || null
        },
        metadata: {
          confidence: person.email_confidence || 75,
          searchDate: new Date().toISOString()
        }
      };
    }

    console.log(`[Apollo] ❌ No email found for ${contact.name} - Response:`, response.data);
    return {
      success: false,
      contact,
      metadata: {
        error: 'No email found',
        searchDate: new Date().toISOString()
      }
    };
  } catch (error: any) {
    // Enhanced error logging to capture rate limit and other API errors
    console.error(`[Apollo] API error for ${contact.name}:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    
    // Check for specific rate limit error
    if (error.response?.status === 429) {
      console.error(`[Apollo] ⚠️ RATE LIMIT HIT! Reset time:`, error.response.headers['x-rate-limit-reset']);
    }
    
    return {
      success: false,
      contact,
      metadata: {
        error: error instanceof Error ? error.message : 'Apollo API failed',
        searchDate: new Date().toISOString()
      }
    };
  }
}

export async function apolloSearch(req: Request, res: Response) {
  try {
    const contactId = parseInt(req.params.contactId);
    const userId = getUserId(req);
    console.log('Starting Apollo.io search for contact ID:', contactId);
    console.log('User ID:', userId);

    const contact = await storage.getContact(contactId, userId);
    if (!contact) {
      console.error('Contact not found in database for ID:', contactId);
      res.status(404).json({ message: "Contact not found" });
      return;
    }

    // Check if contact already has completed email search
    const { hasCompletedEmailSearch } = await import('../../lib/email-utils');
    if (hasCompletedEmailSearch(contact)) {
      console.log('Contact already has email, skipping Apollo search:', contact.email);
      res.json(contact);
      return;
    }
    console.log('Contact data from database:', {
      id: contact.id,
      name: contact.name,
      companyId: contact.companyId
    });

    if (!contact.companyId) {
      console.error('Contact has no company ID:', contactId);
      res.status(404).json({ message: "Contact has no associated company" });
      return;
    }

    const company = await storage.getCompany(contact.companyId, userId);
    if (!company) {
      console.error('Company not found in database for ID:', contact.companyId);
      res.status(404).json({ message: "Company not found" });
      return;
    }
    console.log('Company data from database:', {
      id: company.id,
      name: company.name
    });

    // Get the Apollo.io API key from environment variables
    const apolloApiKey = process.env.APOLLO_API_KEY;
    if (!apolloApiKey) {
      res.status(500).json({ message: "Apollo.io API key not configured" });
      return;
    }

    // Direct Apollo API implementation
    const searchResult = await searchApolloDirect(contact, company, apolloApiKey);
    
    if (searchResult.success) {
      // Handle email updates with unified deduplication logic - only include search result fields (no ID)
      const updateData: any = {
        completedSearches: [...(contact.completedSearches || []), 'apollo_search'],
        lastValidated: new Date()
      };

      // Only update role if it exists
      if (searchResult.contact.role) {
        updateData.role = searchResult.contact.role;
      }
      
      // Only update linkedinUrl if it exists
      if (searchResult.contact.linkedinUrl) {
        updateData.linkedinUrl = searchResult.contact.linkedinUrl;
      }
      
      // Only update email if one was found
      if (searchResult.contact.email) {
        const { mergeEmailData } = await import('../../lib/email-utils');
        const emailUpdates = mergeEmailData(contact, searchResult.contact.email);
        Object.assign(updateData, emailUpdates);
      }
      
      // Update contact location fields if provided by Apollo
      if (searchResult.contact.city) {
        updateData.city = searchResult.contact.city;
      }
      if (searchResult.contact.state) {
        updateData.state = searchResult.contact.state;
      }
      if (searchResult.contact.country) {
        updateData.country = searchResult.contact.country;
      }
      // Also update the legacy location field as a composite string
      if (searchResult.contact.city || searchResult.contact.state || searchResult.contact.country) {
        const locationParts = [
          searchResult.contact.city,
          searchResult.contact.state,
          searchResult.contact.country
        ].filter(Boolean);
        if (locationParts.length > 0 && !contact.location) {
          updateData.location = locationParts.join(', ');
        }
      }

      const updatedContact = await storage.updateContact(contactId, updateData);
      
      // Update company location fields if provided by Apollo
      if (searchResult.company && (searchResult.company.city || searchResult.company.state || searchResult.company.country)) {
        const companyUpdateData: any = {};
        if (searchResult.company.city && !company.city) {
          companyUpdateData.city = searchResult.company.city;
        }
        if (searchResult.company.state && !company.state) {
          companyUpdateData.state = searchResult.company.state;
        }
        if (searchResult.company.country && !company.country) {
          companyUpdateData.country = searchResult.company.country;
        }
        
        if (Object.keys(companyUpdateData).length > 0) {
          await storage.updateCompany(company.id, companyUpdateData);
          console.log(`[Apollo] Updated company ${company.name} with location:`, companyUpdateData);
        }
      }
      
      console.log('Apollo search completed:', {
        success: true,
        emailFound: !!updatedContact?.email,
        confidence: searchResult.metadata.confidence,
        contactLocation: { city: searchResult.contact.city, state: searchResult.contact.state, country: searchResult.contact.country },
        companyLocation: searchResult.company
      });

      res.json(updatedContact);
    } else {
      // Update contact to mark search as completed even if failed - only include specific fields (no ID)
      const updateData = {
        completedSearches: [...(contact.completedSearches || []), 'apollo_search'],
        lastValidated: new Date()
      };
      
      const updatedContact = await storage.updateContact(contactId, updateData);
      res.status(422).json({
        message: searchResult.metadata.error || "No email found",
        contact: updatedContact,
        searchMetadata: searchResult.metadata
      });
    }
  } catch (error) {
    console.error('Apollo.io search error:', error);
    // Send a more detailed error response
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to search Apollo.io",
      details: error instanceof Error ? error.stack : undefined
    });
  }
}