/**
 * Campaigns Module
 * Professional campaigns module structure that manages all campaign-related functionality
 * including sender profiles and customer profiles. Strategies live in features/strategies.
 */

import { Application } from 'express';
import { registerSenderProfilesRoutes } from './sender-profiles';
import { registerCustomerProfilesRoutes } from './customer-profiles';
import { registerCampaignsRoutes as registerCampaignsCRUDRoutes } from './campaigns/routes';

/**
 * Register all campaign-related routes
 * @param app Express application instance
 * @param requireAuth Authentication middleware
 */
export function registerCampaignsRoutes(app: Application, requireAuth: any) {
  // Register sender profiles routes
  registerSenderProfilesRoutes(app, requireAuth);
  
  // Register customer profiles routes  
  registerCustomerProfilesRoutes(app, requireAuth);
  
  // Register campaigns CRUD routes
  registerCampaignsCRUDRoutes(app, requireAuth);
}

// Also export individual route registration functions for flexibility
export { registerSenderProfilesRoutes } from './sender-profiles';
export { registerCustomerProfilesRoutes } from './customer-profiles';
export { registerCampaignsRoutes as registerCampaignsCRUDRoutes } from './campaigns/routes';