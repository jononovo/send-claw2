/**
 * Server-side fetch utilities for SSR pages
 * These functions fetch data from the Express backend during server rendering
 */

import type { Company, Contact } from '@shared/schema';

// Use environment variable or default to localhost for development
const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000';

/**
 * Fetch company data by ID (server-side)
 * Returns null if company not found
 */
export async function fetchCompanySSR(id: number): Promise<Company | null> {
  try {
    const res = await fetch(`${API_BASE}/api/companies/${id}`, {
      cache: 'no-store', // Always fresh for dynamic data
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch company ${id}: ${res.status}`);
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error(`Error fetching company ${id}:`, error);
    return null;
  }
}

/**
 * Fetch contact data by ID (server-side)
 * Returns null if contact not found
 * Note: Emails are masked for unauthenticated requests
 */
export async function fetchContactSSR(id: number): Promise<Contact | null> {
  try {
    const res = await fetch(`${API_BASE}/api/contacts/${id}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch contact ${id}: ${res.status}`);
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error(`Error fetching contact ${id}:`, error);
    return null;
  }
}

/**
 * Fetch contacts for a company (server-side)
 * Returns empty array if none found
 */
export async function fetchCompanyContactsSSR(companyId: number): Promise<Contact[]> {
  try {
    const res = await fetch(`${API_BASE}/api/companies/${companyId}/contacts`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch contacts for company ${companyId}: ${res.status}`);
      return [];
    }
    
    return res.json();
  } catch (error) {
    console.error(`Error fetching contacts for company ${companyId}:`, error);
    return [];
  }
}

/**
 * Fetch search list data by ID (server-side)
 * Returns null if not found
 */
export async function fetchSearchListSSR(listId: number): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/api/search-lists/${listId}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch search list ${listId}: ${res.status}`);
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error(`Error fetching search list ${listId}:`, error);
    return null;
  }
}
