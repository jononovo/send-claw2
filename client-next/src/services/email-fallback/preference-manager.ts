/**
 * Email Preference Manager Service
 * Manages user email sending preferences and tracks success rates
 */

import { EmailMethod } from './environment-detector';
import { apiRequest } from '@/lib/queryClient';

export type EmailPreference = 'smart-default' | 'gmail' | 'outlook' | 'default-app' | 'ask-always';

export interface UserEmailPreferences {
  id?: number;
  userId: number;
  preferredMethod: EmailPreference;
  hasSeenFirstTimeModal: boolean;
  hasSeenIOSNotification: boolean;
  hasSeenAndroidNotification: boolean;
  successCount: number;
  failureCount: number;
  lastUsedMethod?: EmailMethod;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PreferenceManager {
  private static instance: PreferenceManager;
  private cachedPreferences: UserEmailPreferences | null = null;
  private userId: number | null = null;
  
  static getInstance(): PreferenceManager {
    if (!PreferenceManager.instance) {
      PreferenceManager.instance = new PreferenceManager();
    }
    return PreferenceManager.instance;
  }
  
  /**
   * Set the current user ID
   */
  setUserId(userId: number): void {
    this.userId = userId;
    // Clear cache when user changes
    if (this.cachedPreferences && this.cachedPreferences.userId !== userId) {
      this.cachedPreferences = null;
    }
  }
  
  /**
   * Get user preferences from database or create defaults
   */
  async getPreferences(): Promise<UserEmailPreferences> {
    if (!this.userId) {
      return this.getDefaultPreferences();
    }
    
    if (this.cachedPreferences) {
      return this.cachedPreferences;
    }
    
    try {
      const response = await apiRequest('GET', `/api/email-preferences`);
      if (response.ok) {
        const data = await response.json();
        this.cachedPreferences = data;
        return data;
      }
    } catch (error) {
      console.error('Failed to fetch email preferences:', error);
    }
    
    // Return defaults if fetch fails
    return this.getDefaultPreferences();
  }
  
  /**
   * Save user preferences to database
   */
  async savePreferences(preferences: Partial<UserEmailPreferences>): Promise<boolean> {
    if (!this.userId) {
      console.warn('Cannot save preferences without user ID');
      return false;
    }
    
    try {
      const response = await apiRequest('PUT', `/api/email-preferences`, {
        ...preferences,
        userId: this.userId
      });
      
      if (response.ok) {
        const updated = await response.json();
        this.cachedPreferences = updated;
        return true;
      }
    } catch (error) {
      console.error('Failed to save email preferences:', error);
    }
    
    return false;
  }
  
  /**
   * Get default preferences for new users
   */
  private getDefaultPreferences(): UserEmailPreferences {
    return {
      userId: this.userId || 0,
      preferredMethod: 'smart-default',
      hasSeenFirstTimeModal: false,
      hasSeenIOSNotification: false,
      hasSeenAndroidNotification: false,
      successCount: 0,
      failureCount: 0
    };
  }
  
  /**
   * Convert preference to email method based on environment
   */
  async getEmailMethod(preference?: EmailPreference): Promise<EmailMethod> {
    const pref = preference || (await this.getPreferences()).preferredMethod;
    
    switch (pref) {
      case 'gmail':
        return 'gmail';
      
      case 'outlook':
        return 'outlook';
      
      case 'default-app':
        return 'mailto';
      
      case 'smart-default':
        // Use environment detection to pick best method
        const { environmentDetector } = await import('./environment-detector');
        return environmentDetector.getRecommendedMethod();
      
      case 'ask-always':
        // This will trigger the selection modal
        return 'mailto'; // Default fallback
      
      default:
        return 'mailto';
    }
  }
  
  /**
   * Track email send success/failure
   */
  async trackEmailSend(method: EmailMethod, success: boolean): Promise<void> {
    if (!this.userId) return;
    
    const preferences = await this.getPreferences();
    const updates: Partial<UserEmailPreferences> = {
      lastUsedMethod: method,
      successCount: success ? preferences.successCount + 1 : preferences.successCount,
      failureCount: !success ? preferences.failureCount + 1 : preferences.failureCount
    };
    
    await this.savePreferences(updates);
  }
  
  /**
   * Mark that user has seen a specific notification
   */
  async markNotificationSeen(type: 'firstTime' | 'ios' | 'android'): Promise<void> {
    const updates: Partial<UserEmailPreferences> = {};
    
    switch (type) {
      case 'firstTime':
        updates.hasSeenFirstTimeModal = true;
        break;
      case 'ios':
        updates.hasSeenIOSNotification = true;
        break;
      case 'android':
        updates.hasSeenAndroidNotification = true;
        break;
    }
    
    await this.savePreferences(updates);
  }
  
  /**
   * Check if user should see a notification
   */
  async shouldShowNotification(type: 'firstTime' | 'ios' | 'android'): Promise<boolean> {
    const preferences = await this.getPreferences();
    
    switch (type) {
      case 'firstTime':
        return !preferences.hasSeenFirstTimeModal;
      case 'ios':
        return !preferences.hasSeenIOSNotification;
      case 'android':
        return !preferences.hasSeenAndroidNotification;
      default:
        return false;
    }
  }
  
  /**
   * Get success rate for analytics
   */
  async getSuccessRate(): Promise<number> {
    const preferences = await this.getPreferences();
    const total = preferences.successCount + preferences.failureCount;
    
    if (total === 0) return 0;
    return (preferences.successCount / total) * 100;
  }
  
  /**
   * Reset all preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    this.cachedPreferences = null;
    await this.savePreferences(this.getDefaultPreferences());
  }
}

// Export singleton instance
export const preferenceManager = PreferenceManager.getInstance();