/**
 * Hunter.io Email Provider Module
 * 
 * Handles email discovery using Hunter.io API
 */

import { Request, Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../utils";

export async function searchHunterDirect(contact: any, company: any, apiKey: string): Promise<any> {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get('https://api.hunter.io/v2/email-finder', {
      params: {
        api_key: apiKey,
        domain: company.website || company.name.toLowerCase().replace(/\s+/g, '') + '.com',
        first_name: contact.name.split(' ')[0],
        last_name: contact.name.split(' ').slice(1).join(' ')
      },
      timeout: 20000
    });

    if (response.data?.data?.email) {
      return {
        success: true,
        contact: {
          ...contact,
          email: response.data.data.email,
          role: response.data.data.position || contact.role,
          phoneNumber: response.data.data.phone_number || contact.phoneNumber,
          linkedinUrl: response.data.data.linkedin_url || contact.linkedinUrl
        },
        metadata: {
          confidence: response.data.data.score || 75,
          searchDate: new Date().toISOString()
        }
      };
    }

    return {
      success: false,
      contact,
      metadata: {
        error: 'No email found',
        searchDate: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Hunter API error:', error);
    return {
      success: false,
      contact,
      metadata: {
        error: error instanceof Error ? error.message : 'Hunter API failed',
        searchDate: new Date().toISOString()
      }
    };
  }
}

export async function hunterSearch(req: Request, res: Response) {
  try {
    const contactId = parseInt(req.params.contactId);
    const userId = getUserId(req);
    console.log('Starting Hunter.io search for contact ID:', contactId);
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
      console.log('Contact already has email, skipping Hunter search:', contact.email);
      res.json(contact);
      return;
    }
    console.log('Contact data from database:', {
      id: contact.id,
      name: contact.name,
      companyId: contact.companyId
    });

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

    // Get the Hunter.io API key from environment variables
    const hunterApiKey = process.env.HUNTER_API_KEY;
    if (!hunterApiKey) {
      res.status(500).json({ message: "Hunter.io API key not configured" });
      return;
    }

    // Direct Hunter API implementation
    const searchResult = await searchHunterDirect(contact, company, hunterApiKey);
    
    if (searchResult.success) {
      // Handle email updates with unified deduplication logic - only include search result fields (no ID)
      const updateData: any = {
        completedSearches: [...(contact.completedSearches || []), 'hunter_search'],
        lastValidated: new Date()
      };

      // Only update role if it exists
      if (searchResult.contact.role) {
        updateData.role = searchResult.contact.role;
      }
      
      // Only update email if one was found
      if (searchResult.contact.email) {
        const { mergeEmailData } = await import('../../lib/email-utils');
        const emailUpdates = mergeEmailData(contact, searchResult.contact.email);
        Object.assign(updateData, emailUpdates);
      }

      // Update phone number if found
      if (searchResult.contact.phoneNumber) {
        updateData.phoneNumber = searchResult.contact.phoneNumber;
      }

      // Update LinkedIn URL if found
      if (searchResult.contact.linkedinUrl) {
        updateData.linkedinUrl = searchResult.contact.linkedinUrl;
      }

      const updatedContact = await storage.updateContact(contactId, updateData);
      
      console.log('Hunter search completed:', {
        success: true,
        emailFound: !!updatedContact?.email,
        confidence: searchResult.metadata.confidence
      });

      res.json(updatedContact);
    } else {
      // Update contact to mark search as completed even if failed - only include specific fields (no ID)
      const updateData = {
        completedSearches: [...(contact.completedSearches || []), 'hunter_search'],
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
    console.error('Hunter.io search error:', error);
    // Send a more detailed error response
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to search Hunter.io",
      details: error instanceof Error ? error.stack : undefined
    });
  }
}