import { apiRequest } from "@/lib/queryClient";
import type { StrategicProfile } from "../types";

/**
 * Strategic Profiles API Service
 * Handles API interactions for strategic profiles/products
 */

export const strategicProfilesService = {
  /**
   * Get all strategic profiles for the user
   */
  async getProfiles(): Promise<StrategicProfile[]> {
    const res = await apiRequest("GET", "/api/products");
    return await res.json();
  },

  /**
   * Get a single strategic profile by ID
   */
  async getProfile(id: number): Promise<StrategicProfile> {
    const res = await apiRequest("GET", `/api/products/${id}`);
    return await res.json();
  },

  /**
   * Create a new strategic profile
   */
  async createProfile(data: Partial<StrategicProfile>): Promise<StrategicProfile> {
    const res = await apiRequest("POST", "/api/products", data);
    return await res.json();
  },

  /**
   * Update an existing strategic profile
   */
  async updateProfile(id: number, data: Partial<StrategicProfile>): Promise<StrategicProfile> {
    const res = await apiRequest("PATCH", `/api/products/${id}`, data);
    return await res.json();
  },

  /**
   * Delete a strategic profile
   */
  async deleteProfile(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/products/${id}`);
  },

  /**
   * Save generated product offers
   */
  async saveProductOffers(productId: number, offers: any) {
    const res = await apiRequest("POST", "/api/products/offers", { productId, offers });
    return await res.json();
  }
};