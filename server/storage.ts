import { 
  userPreferences, searchLists, companies, contacts, emailTemplates, users,
  strategicProfiles, userEmailPreferences,
  senderProfiles, customerProfiles, campaigns, searchJobs,
  contactLists, contactListMembers, oauthTokens,
  userCredits, creditTransactions, subscriptions, userNotifications,
  campaignRecipients, userGuidanceProgress, userProgress, accessApplications,
  emailSequences, emailSequenceEvents, emailSends,
  type UserPreferences, type InsertUserPreferences,
  type UserEmailPreferences, type InsertUserEmailPreferences,
  type SearchList, type InsertSearchList,
  type Company, type InsertCompany,
  type Contact, type InsertContact,
  type EmailTemplate, type InsertEmailTemplate,
  type User, type InsertUser,
  type StrategicProfile, type InsertStrategicProfile,
  type SenderProfile, type InsertSenderProfile,
  type TargetCustomerProfile, type InsertTargetCustomerProfile,
  type Campaign, type InsertCampaign,
  type SearchJob, type InsertSearchJob,
  type ContactList, type InsertContactList,
  type ContactListMember, type InsertContactListMember,
  type CampaignRecipient, type InsertCampaignRecipient,
  type UserGuidanceProgress, type InsertUserGuidanceProgress,
  type UserProgress, type InsertUserProgress,
  type AccessApplication, type InsertAccessApplication,
  type EmailSequence, type InsertEmailSequence,
  type EmailSequenceEvent, type InsertEmailSequenceEvent,
  type EmailSend, type InsertEmailSend
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, sql, desc, lt, inArray, isNull, ne } from "drizzle-orm";
import { encrypt, decrypt } from "./utils/encryption";

export interface IStorage {
  // User Auth
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(data: { email: string; password: string; username?: string }): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;

  // User Preferences
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: number, data: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  initializeUserPreferences(userId: number): Promise<UserPreferences>;

  // Search Lists
  listSearchLists(userId: number): Promise<SearchList[]>;
  getSearchList(listId: number, userId: number): Promise<SearchList | undefined>;
  listCompaniesBySearchList(listId: number, userId: number): Promise<Company[]>;
  getNextSearchListId(): Promise<number>;
  createSearchList(data: InsertSearchList): Promise<SearchList>;
  updateCompanySearchList(companyId: number, listId: number): Promise<void>;
  updateSearchList(listId: number, data: Partial<InsertSearchList>, userId: number): Promise<SearchList | undefined>;

  // Companies
  listCompanies(userId: number): Promise<Company[]>;
  getCompany(id: number, userId: number): Promise<Company | undefined>;
  createCompany(data: InsertCompany): Promise<Company>;
  updateCompany(id: number, data: Partial<Company>): Promise<Company | undefined>;

  // Contacts
  listContactsByCompany(companyId: number, userId: number): Promise<Contact[]>;
  listContacts(userId: number): Promise<Contact[]>;
  listContactsWithCompanies(userId: number): Promise<(Contact & { companyName?: string })[]>;
  getContact(id: number, userId: number): Promise<Contact | undefined>;
  createContact(data: InsertContact): Promise<Contact>;
  updateContact(id: number, data: Partial<Contact>): Promise<Contact>;
  deleteContactsByCompany(companyId: number, userId: number): Promise<void>;

  // Email Conversations (inactive - commented out)
  // listActiveContactsWithThreads(userId: number): Promise<(Contact & { lastMessage: string, lastMessageDate: Date, unread: boolean })[]>;
  // listThreadsByContact(contactId: number, userId: number): Promise<EmailThread[]>;
  // getThread(id: number, userId: number): Promise<EmailThread | undefined>;
  // createThread(data: InsertEmailThread): Promise<EmailThread>;
  // updateThread(id: number, data: Partial<EmailThread>): Promise<EmailThread>;
  // listMessagesByThread(threadId: number): Promise<EmailMessage[]>;
  // getThreadMessage(id: number): Promise<EmailMessage | undefined>;
  // createMessage(data: InsertEmailMessage): Promise<EmailMessage>;
  // markThreadMessagesAsRead(threadId: number): Promise<void>;
  

  // Email Templates
  listEmailTemplates(userId: number): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number, userId: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, data: InsertEmailTemplate): Promise<EmailTemplate>;

  // User Email Preferences
  getUserEmailPreferences(userId: number): Promise<UserEmailPreferences | undefined>;
  createUserEmailPreferences(data: InsertUserEmailPreferences): Promise<UserEmailPreferences>;
  updateUserEmailPreferences(userId: number, data: Partial<UserEmailPreferences>): Promise<UserEmailPreferences | undefined>;

  // Strategic Profiles
  getStrategicProfiles(userId: number): Promise<StrategicProfile[]>;
  createStrategicProfile(data: InsertStrategicProfile): Promise<StrategicProfile>;
  updateStrategicProfile(id: number, data: Partial<StrategicProfile>): Promise<StrategicProfile>;
  deleteStrategicProfile(id: number): Promise<void>;
  clearDefaultStrategicProfiles(userId: number): Promise<void>;

  // Sender Profiles
  listSenderProfiles(userId: number): Promise<SenderProfile[]>;
  getSenderProfile(id: number, userId: number): Promise<SenderProfile | undefined>;
  createSenderProfile(data: InsertSenderProfile): Promise<SenderProfile>;
  updateSenderProfile(id: number, data: Partial<SenderProfile>): Promise<SenderProfile>;
  deleteSenderProfile(id: number, userId: number): Promise<void>;

  // Customer Profiles
  listCustomerProfiles(userId: number): Promise<TargetCustomerProfile[]>;
  getCustomerProfile(id: number, userId: number): Promise<TargetCustomerProfile | undefined>;
  createCustomerProfile(data: InsertTargetCustomerProfile): Promise<TargetCustomerProfile>;
  updateCustomerProfile(id: number, data: Partial<TargetCustomerProfile>): Promise<TargetCustomerProfile>;
  deleteCustomerProfile(id: number, userId: number): Promise<void>;

  // Campaigns
  listCampaigns(userId: number): Promise<Campaign[]>;
  getCampaign(id: number, userId: number): Promise<Campaign | undefined>;
  getCampaignWithMetrics(id: number, userId: number): Promise<any>;
  createCampaign(data: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, data: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: number, userId: number): Promise<void>;
  restartCampaign(id: number, userId: number, mode: 'all' | 'failed'): Promise<Campaign>;

  // Search Jobs
  createSearchJob(data: InsertSearchJob): Promise<SearchJob>;
  getSearchJobByJobId(jobId: string): Promise<SearchJob | undefined>;
  updateSearchJob(id: number, data: Partial<SearchJob>): Promise<SearchJob | undefined>;
  listSearchJobs(userId: number, limit?: number): Promise<SearchJob[]>;
  getPendingSearchJobs(limit?: number): Promise<SearchJob[]>;
  deleteOldSearchJobs(cutoffDate: Date): Promise<number>;

  // Contact Lists
  listContactLists(userId: number): Promise<ContactList[]>;
  getContactList(id: number, userId: number): Promise<ContactList | undefined>;
  getOrCreatePipeline(userId: number): Promise<ContactList>;
  createContactList(data: InsertContactList): Promise<ContactList>;
  updateContactList(id: number, data: Partial<ContactList>): Promise<ContactList>;
  deleteContactList(id: number, userId: number): Promise<void>;
  
  // Contact List Members
  listContactsByListId(listId: number): Promise<any[]>;
  addContactsToList(listId: number, contactIds: number[], source: string, addedBy: number, metadata?: any): Promise<{
    addedCount: number;
    duplicateCount: number;
    noEmailCount: number;
    otherListDuplicateCount: number;
  }>;
  removeContactsFromList(listId: number, contactIds: number[]): Promise<void>;
  isContactInList(listId: number, contactId: number): Promise<boolean>;
  getListMemberCount(listId: number): Promise<number>;

  // OAuth Tokens
  getOAuthToken(userId: number, service: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; email?: string } | null>;
  saveOAuthToken(userId: number, service: string, tokenData: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    email?: string;
    scopes?: string[];
    metadata?: any;
  }): Promise<void>;
  deleteOAuthToken(userId: number, service: string): Promise<void>;
  updateOAuthTokenExpiry(userId: number, service: string, expiresAt: Date): Promise<void>;

  // User Credits
  getUserCredits(userId: number): Promise<{ balance: number; totalPurchased: number; totalUsed: number; lastUpdated?: Date } | null>;
  updateUserCredits(userId: number, amount: number, type: 'purchase' | 'usage' | 'refund' | 'bonus', description?: string): Promise<{ balance: number }>;
  getUserCreditHistory(userId: number, limit?: number): Promise<any[]>;
  awardOneTimeCredits(userId: number, amount: number, rewardKey: string, description?: string): Promise<{ success: boolean; credited: boolean; newBalance: number; alreadyClaimed: boolean }>;

  // Subscriptions
  getUserSubscription(userId: number): Promise<any | null>;
  updateUserSubscription(userId: number, data: any): Promise<any>;
  cancelUserSubscription(userId: number): Promise<void>;

  // User Notifications  
  getUserNotifications(userId: number, status?: string): Promise<any[]>;
  createUserNotification(userId: number, notification: { type: string; title: string; message: string; priority?: string; metadata?: any }): Promise<any>;
  markNotificationAsRead(notificationId: number): Promise<void>;
  dismissNotification(notificationId: number): Promise<void>;

  // User Guidance Progress (legacy - being replaced by unified userProgress)
  getUserGuidanceProgress(userId: number): Promise<UserGuidanceProgress | null>;
  updateUserGuidanceProgress(userId: number, data: Partial<InsertUserGuidanceProgress>): Promise<UserGuidanceProgress>;

  // Unified User Progress (namespace-scoped progress for any feature)
  getUserProgress(userId: number, namespace: string): Promise<UserProgress | null>;
  upsertUserProgress(userId: number, namespace: string, completedMilestones: string[], metadata?: Record<string, any>): Promise<UserProgress>;

  // Access Applications (for stealth landing page)
  createAccessApplication(data: InsertAccessApplication): Promise<AccessApplication>;
  getAccessApplicationByEmail(email: string): Promise<AccessApplication | undefined>;
  listAccessApplications(): Promise<AccessApplication[]>;

  // Drip Email Engine
  getEmailSequenceByName(name: string): Promise<EmailSequence | undefined>;
  getEmailSequenceEvents(sequenceId: number): Promise<EmailSequenceEvent[]>;
  createEmailSend(data: InsertEmailSend): Promise<EmailSend>;
  getEmailSendsByRecipient(email: string): Promise<EmailSend[]>;
  getPendingEmailSends(limit?: number): Promise<EmailSend[]>;
  updateEmailSendStatus(id: number, status: string, errorMessage?: string): Promise<EmailSend | undefined>;
  markEmailSendAsSent(id: number): Promise<EmailSend | undefined>;
}

class DatabaseStorage implements IStorage {
  // User Auth methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(data: { email: string; password: string; username?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        username: data.username || data.email.split('@')[0],
        password: data.password
      })
      .returning();

    await this.initializeUserPreferences(user.id);

    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // User Preferences
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));

    if (!prefs) {
      return this.initializeUserPreferences(userId);
    }

    return prefs;
  }

  async updateUserPreferences(userId: number, data: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));

    if (existing) {
      // Merge settings field if provided (to not overwrite other settings)
      const mergedSettings = data.settings 
        ? { ...(existing.settings || {}), ...data.settings }
        : existing.settings;
      
      const [updated] = await db
        .update(userPreferences)
        .set({ ...data, settings: mergedSettings, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    }

    return this.initializeUserPreferences(userId);
  }

  async initializeUserPreferences(userId: number): Promise<UserPreferences> {
    console.log('DatabaseStorage.initializeUserPreferences - Creating preferences for userId:', userId);
    const [prefs] = await db
      .insert(userPreferences)
      .values({ userId })
      .returning();

    return prefs;
  }

  // Search Lists
  async listSearchLists(userId: number): Promise<SearchList[]> {
    return db.select().from(searchLists).where(eq(searchLists.userId, userId)).orderBy(desc(searchLists.createdAt));
  }

  async getSearchList(listId: number, userId: number): Promise<SearchList | undefined> {
    const [list] = await db
      .select()
      .from(searchLists)
      .where(and(eq(searchLists.listId, listId), eq(searchLists.userId, userId)));
    return list;
  }

  async listCompaniesBySearchList(listId: number, userId: number): Promise<Company[]> {
    return db.select()
      .from(companies)
      .where(and(eq(companies.listId, listId), eq(companies.userId, userId)));
  }

  async getNextSearchListId(): Promise<number> {
    const allLists = await db.select().from(searchLists);
    let maxId = 1000;
    
    for (const list of allLists) {
      if (list.listId > maxId) {
        maxId = list.listId;
      }
    }
    
    return maxId + 1;
  }

  async createSearchList(data: InsertSearchList): Promise<SearchList> {
    const [list] = await db.insert(searchLists).values(data).returning();
    return list;
  }

  async updateCompanySearchList(companyId: number, listId: number): Promise<void> {
    await db.update(companies)
      .set({ listId })
      .where(eq(companies.id, companyId));
  }

  async updateSearchList(listId: number, data: Partial<InsertSearchList>, userId: number): Promise<SearchList | undefined> {
    const [updated] = await db.update(searchLists)
      .set(data)
      .where(and(eq(searchLists.listId, listId), eq(searchLists.userId, userId)))
      .returning();
    return updated;
  }

  // Companies
  async listCompanies(userId: number): Promise<Company[]> {
    console.log('DatabaseStorage.listCompanies - Fetching companies for userId:', userId);
    return db.select().from(companies).where(eq(companies.userId, userId));
  }

  async getCompany(id: number, userId: number): Promise<Company | undefined> {
    console.log('DatabaseStorage.getCompany - Fetching company:', { id, userId });
    try {
      const result = await db
        .select()
        .from(companies)
        .where(and(eq(companies.id, id), eq(companies.userId, userId)))
        .limit(1);

      console.log('DatabaseStorage.getCompany - Result:', {
        requested: { id, userId },
        found: result[0] ? { id: result[0].id, name: result[0].name } : null
      });

      return result[0];
    } catch (error) {
      console.error('Error fetching company:', error);
      return undefined;
    }
  }

  async createCompany(data: InsertCompany): Promise<Company> {
    const { generateCompanySlug } = await import('./utils/slug-generator');
    const slug = data.slug || generateCompanySlug(data.name);
    const [company] = await db.insert(companies).values({ ...data, slug } as any).returning();
    return company;
  }

  async updateCompany(id: number, data: Partial<Company>): Promise<Company | undefined> {
    const [updated] = await db
      .update(companies)
      .set(data)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  // Contacts
  async listContactsByCompany(companyId: number, userId: number): Promise<Contact[]> {
    try {
      return await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.companyId, companyId), eq(contacts.userId, userId)));
    } catch (error) {
      console.error('Error fetching contacts by company:', error);
      return [];
    }
  }

  async listContacts(userId: number): Promise<Contact[]> {
    try {
      return await db
        .select()
        .from(contacts)
        .where(eq(contacts.userId, userId));
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  }

  async listContactsWithCompanies(userId: number): Promise<(Contact & { companyName?: string })[]> {
    try {
      const result = await db
        .select({
          id: contacts.id,
          userId: contacts.userId,
          companyId: contacts.companyId,
          name: contacts.name,
          role: contacts.role,
          email: contacts.email,
          alternativeEmails: contacts.alternativeEmails,
          probability: contacts.probability,
          linkedinUrl: contacts.linkedinUrl,
          twitterHandle: contacts.twitterHandle,
          phoneNumber: contacts.phoneNumber,
          department: contacts.department,
          location: contacts.location,
          verificationSource: contacts.verificationSource,
          lastEnriched: contacts.lastEnriched,
          nameConfidenceScore: contacts.nameConfidenceScore,
          userFeedbackScore: contacts.userFeedbackScore,
          feedbackCount: contacts.feedbackCount,
          lastValidated: contacts.lastValidated,
          createdAt: contacts.createdAt,
          completedSearches: contacts.completedSearches,
          contactStatus: contacts.contactStatus,
          lastContactedAt: contacts.lastContactedAt,
          lastContactChannel: contacts.lastContactChannel,
          totalCommunications: contacts.totalCommunications,
          totalReplies: contacts.totalReplies,
          lastThreadId: contacts.lastThreadId,
          companyName: companies.name
        })
        .from(contacts)
        .leftJoin(companies, eq(contacts.companyId, companies.id))
        .where(eq(contacts.userId, userId));
      return result as (Contact & { companyName?: string })[];
    } catch (error) {
      console.error('Error fetching contacts with companies:', error);
      return [];
    }
  }

  async getContact(id: number, userId: number): Promise<Contact | undefined> {
    console.log('DatabaseStorage.getContact - Fetching contact:', { id, userId });
    try {
      const result = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
        .limit(1);

      console.log('DatabaseStorage.getContact - Result:', {
        requested: { id, userId },
        found: result[0] ? { id: result[0].id, name: result[0].name } : null
      });

      return result[0];
    } catch (error) {
      console.error('Error fetching contact:', error);
      return undefined;
    }
  }

  async createContact(data: InsertContact): Promise<Contact> {
    // Clean contact data to prevent duplicate emails
    const { cleanContactData } = await import('./lib/email-utils');
    const { generateContactSlug } = await import('./utils/slug-generator');
    const cleanedData = cleanContactData(data);
    
    // Generate slug if not provided
    let slug = cleanedData.slug;
    if (!slug) {
      let companyName: string | undefined;
      if (cleanedData.companyId) {
        const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, cleanedData.companyId)).limit(1);
        companyName = company?.name;
      }
      slug = generateContactSlug(cleanedData.name, companyName, cleanedData.role);
    }
    
    const [contact] = await db.insert(contacts).values({ ...cleanedData, slug } as any).returning();
    return contact;
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    // Clean contact data to prevent duplicate emails
    const { cleanContactData } = await import('./lib/email-utils');
    const cleanedData = cleanContactData(data);
    
    // Remove id field to prevent PostgreSQL error "column 'id' can only be updated to DEFAULT"
    const { id: _, ...updateData } = cleanedData;
    
    const [updated] = await db.update(contacts)
      .set(updateData)
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async deleteContactsByCompany(companyId: number, userId: number): Promise<void> {
    await db.delete(contacts)
      .where(and(eq(contacts.companyId, companyId), eq(contacts.userId, userId)));
  }


  // Email Templates
  async listEmailTemplates(userId: number): Promise<EmailTemplate[]> {
    console.log('DatabaseStorage.listEmailTemplates called for userId:', userId);
    
    // If this is not userId=1, get both the default templates and the user's templates
    if (userId !== 1) {
      console.log(`Fetching both default templates (userId=1) and user templates (userId=${userId})`);
      return db
        .select()
        .from(emailTemplates)
        .where(or(
          eq(emailTemplates.userId, 1),  // Default templates (userId=1)
          eq(emailTemplates.userId, userId)  // User's personal templates
        ))
        .orderBy(emailTemplates.createdAt);
    }
    
    // If it is userId=1, just return their templates (which are the defaults)
    console.log('Fetching only templates for userId=1 (defaults)');
    return db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(emailTemplates.createdAt);
  }

  async getEmailTemplate(id: number, userId: number): Promise<EmailTemplate | undefined> {
    console.log('DatabaseStorage.getEmailTemplate called with:', { id, userId });
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
    return template;
  }

  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    console.log('DatabaseStorage.createEmailTemplate called with:', {
      name: data.name,
      userId: data.userId
    });
    try {
      const [template] = await db
        .insert(emailTemplates)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      console.log('Created template:', { id: template.id, name: template.name });
      return template;
    } catch (error) {
      console.error('Error creating email template:', error);
      throw error;
    }
  }

  async updateEmailTemplate(id: number, data: InsertEmailTemplate): Promise<EmailTemplate> {
    console.log('DatabaseStorage.updateEmailTemplate called with:', {
      id,
      name: data.name,
      userId: data.userId
    });
    try {
      const [template] = await db
        .update(emailTemplates)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(emailTemplates.id, id))
        .returning();
      
      if (!template) {
        throw new Error(`Template with id ${id} not found`);
      }
      
      console.log('Updated template:', { id: template.id, name: template.name });
      return template;
    } catch (error) {
      console.error('Error updating email template:', error);
      throw error;
    }
  }

  // User Email Preferences methods
  async getUserEmailPreferences(userId: number): Promise<UserEmailPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userEmailPreferences)
      .where(eq(userEmailPreferences.userId, userId));
    return prefs;
  }

  async createUserEmailPreferences(data: InsertUserEmailPreferences): Promise<UserEmailPreferences> {
    const [prefs] = await db
      .insert(userEmailPreferences)
      .values(data)
      .returning();
    return prefs;
  }

  async updateUserEmailPreferences(userId: number, data: Partial<UserEmailPreferences>): Promise<UserEmailPreferences | undefined> {
    const [prefs] = await db
      .update(userEmailPreferences)
      .set(data)
      .where(eq(userEmailPreferences.userId, userId))
      .returning();
    return prefs;
  }

  // Strategic Profiles methods
  async getStrategicProfiles(userId: number): Promise<StrategicProfile[]> {
    return await db
      .select()
      .from(strategicProfiles)
      .where(eq(strategicProfiles.userId, userId));
  }

  async createStrategicProfile(data: InsertStrategicProfile): Promise<StrategicProfile> {
    const [profile] = await db
      .insert(strategicProfiles)
      .values(data)
      .returning();
    return profile;
  }

  async updateStrategicProfile(id: number, data: Partial<StrategicProfile>): Promise<StrategicProfile> {
    const [profile] = await db
      .update(strategicProfiles)
      .set(data)
      .where(eq(strategicProfiles.id, id))
      .returning();
    return profile;
  }

  async deleteStrategicProfile(id: number): Promise<void> {
    await db
      .delete(strategicProfiles)
      .where(eq(strategicProfiles.id, id));
  }

  async clearDefaultStrategicProfiles(userId: number): Promise<void> {
    await db
      .update(strategicProfiles)
      .set({ isDefault: false })
      .where(eq(strategicProfiles.userId, userId));
  }

  // Sender Profiles
  async listSenderProfiles(userId: number): Promise<SenderProfile[]> {
    return db.select()
      .from(senderProfiles)
      .where(eq(senderProfiles.userId, userId))
      .orderBy(desc(senderProfiles.createdAt));
  }

  async getSenderProfile(id: number, userId: number): Promise<SenderProfile | undefined> {
    const [profile] = await db.select()
      .from(senderProfiles)
      .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)));
    return profile;
  }

  async createSenderProfile(data: InsertSenderProfile): Promise<SenderProfile> {
    const [profile] = await db.insert(senderProfiles).values(data).returning();
    return profile;
  }

  async updateSenderProfile(id: number, data: Partial<SenderProfile>): Promise<SenderProfile> {
    const [updated] = await db.update(senderProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(senderProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteSenderProfile(id: number, userId: number): Promise<void> {
    await db.delete(senderProfiles)
      .where(and(eq(senderProfiles.id, id), eq(senderProfiles.userId, userId)));
  }

  // Customer Profiles
  async listCustomerProfiles(userId: number): Promise<TargetCustomerProfile[]> {
    return db.select()
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, userId))
      .orderBy(desc(customerProfiles.createdAt));
  }

  async getCustomerProfile(id: number, userId: number): Promise<TargetCustomerProfile | undefined> {
    const [profile] = await db.select()
      .from(customerProfiles)
      .where(and(eq(customerProfiles.id, id), eq(customerProfiles.userId, userId)));
    return profile;
  }

  async createCustomerProfile(data: InsertTargetCustomerProfile): Promise<TargetCustomerProfile> {
    const [profile] = await db.insert(customerProfiles).values(data).returning();
    return profile;
  }

  async updateCustomerProfile(id: number, data: Partial<TargetCustomerProfile>): Promise<TargetCustomerProfile> {
    const [updated] = await db.update(customerProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteCustomerProfile(id: number, userId: number): Promise<void> {
    await db.delete(customerProfiles)
      .where(and(eq(customerProfiles.id, id), eq(customerProfiles.userId, userId)));
  }

  // Campaigns
  async listCampaigns(userId: number): Promise<Campaign[]> {
    return db.select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number, userId: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
    return campaign;
  }

  async getCampaignWithMetrics(id: number, userId: number): Promise<any> {
    const campaign = await this.getCampaign(id, userId);
    if (!campaign) {
      return undefined;
    }

    // Get recipients and their activity
    const recipients = await db.select({
      id: campaignRecipients.id,
      email: campaignRecipients.recipientEmail,
      firstName: campaignRecipients.recipientFirstName,
      lastName: campaignRecipients.recipientLastName,
      companyName: campaignRecipients.recipientCompany,
      status: campaignRecipients.status,
      sentAt: campaignRecipients.sentAt,
      openedAt: campaignRecipients.openedAt,
      clickedAt: campaignRecipients.clickedAt,
      repliedAt: campaignRecipients.repliedAt,
      bouncedAt: campaignRecipients.bouncedAt,
      unsubscribedAt: campaignRecipients.unsubscribedAt,
      emailSubject: campaignRecipients.emailSubject,
      emailContent: campaignRecipients.emailContent,
      openCount: campaignRecipients.openCount,
      clickCount: campaignRecipients.clickCount,
      lastActivity: campaignRecipients.updatedAt
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, id))
    .orderBy(desc(campaignRecipients.updatedAt));

    // Calculate metrics
    let totalRecipients = recipients.length;
    
    // Always fetch contact list name if campaign has a contact list
    if (campaign.contactListId) {
      const contactList = await db.select({
        contactCount: contactLists.contactCount,
        name: contactLists.name
      })
      .from(contactLists)
      .where(eq(contactLists.id, campaign.contactListId))
      .limit(1);
      
      if (contactList[0]) {
        // Store the list name for display
        (campaign as any).contactListName = contactList[0].name;
        
        // If no campaign_recipients entries exist, use contact list count as fallback
        if (totalRecipients === 0) {
          totalRecipients = contactList[0].contactCount || 0;
        }
      }
    }
    
    totalRecipients = totalRecipients || 0;
    const emailsSent = recipients.filter(r => r.sentAt).length || 0;
    const emailsOpened = recipients.filter(r => r.openedAt).length;
    const emailsClicked = recipients.filter(r => r.clickedAt).length;
    const emailsReplied = recipients.filter(r => r.repliedAt).length;
    const emailsBounced = recipients.filter(r => r.bouncedAt).length;
    const emailsUnsubscribed = recipients.filter(r => r.unsubscribedAt).length;

    const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
    const clickRate = emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0;
    const replyRate = emailsSent > 0 ? (emailsReplied / emailsSent) * 100 : 0;
    const bounceRate = emailsSent > 0 ? (emailsBounced / emailsSent) * 100 : 0;
    const unsubscribeRate = emailsSent > 0 ? (emailsUnsubscribed / emailsSent) * 100 : 0;
    
    // Get email template if exists
    let emailSubject = campaign.subject;
    let emailBody = campaign.body;
    
    if (campaign.emailTemplateId) {
      const template = await db.select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, campaign.emailTemplateId))
        .limit(1);
      
      if (template[0]) {
        emailSubject = template[0].subject || emailSubject;
        emailBody = template[0].content || emailBody;
      }
    }

    // Get recipients in review status for the review queue
    const recipientsInReview = recipients.filter(r => r.status === 'in_review')
      .map(r => ({
        ...r,
        emailSubject: r.emailSubject || campaign.subject,
        emailContent: r.emailContent || campaign.body
      }));

    return {
      ...campaign,
      totalRecipients,
      emailsSent,
      emailsOpened,
      emailsClicked,
      emailsReplied,
      emailsBounced,
      emailsUnsubscribed,
      openRate,
      clickRate,
      replyRate,
      bounceRate,
      unsubscribeRate,
      emailSubject,
      emailBody,
      recipients,
      recipientsInReview,
      reviewCount: recipientsInReview.length
    };
  }

  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(data).returning();
    return campaign;
  }

  async createCampaignRecipients(recipients: any[]): Promise<void> {
    if (recipients.length === 0) return;
    
    // Batch insert recipients, ignoring conflicts (duplicates)
    await db.insert(campaignRecipients)
      .values(recipients)
      .onConflictDoNothing(); // Unique constraint handles duplicates
  }

  async getContactsByIds(contactIds: number[], userId: number): Promise<Contact[]> {
    if (contactIds.length === 0) return [];
    
    try {
      return await db
        .select()
        .from(contacts)
        .where(and(
          inArray(contacts.id, contactIds),
          eq(contacts.userId, userId)
        ));
    } catch (error) {
      console.error('Error fetching contacts by IDs:', error);
      return [];
    }
  }

  async updateCampaign(id: number, data: Partial<Campaign>): Promise<Campaign> {
    const [campaign] = await db.update(campaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  async deleteCampaign(id: number, userId: number): Promise<void> {
    await db.delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
  }

  async restartCampaign(id: number, userId: number, mode: 'all' | 'failed'): Promise<Campaign> {
    // Verify campaign exists and belongs to user
    const campaign = await this.getCampaign(id, userId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Reset campaign status to active
    const updates: Partial<Campaign> = {
      status: 'active',
      startDate: new Date(),
      endDate: null,
      updatedAt: new Date()
    };

    if (mode === 'all') {
      // Reset all metrics for complete restart
      updates.totalLeadsGenerated = 0;
      updates.responseRate = 0;
      
      // Clear recipient statuses for all recipients
      await db.update(campaignRecipients)
        .set({
          status: 'scheduled',
          sentAt: null,
          openedAt: null,
          clickedAt: null,
          repliedAt: null,
          bouncedAt: null,
          unsubscribedAt: null,
          openCount: 0,
          clickCount: 0,
          updatedAt: new Date()
        })
        .where(eq(campaignRecipients.campaignId, id));
    } else if (mode === 'failed') {
      // Only reset failed recipients (failed_generation, failed_send, manual_send_required)
      await db.update(campaignRecipients)
        .set({
          status: 'scheduled',
          updatedAt: new Date()
        })
        .where(and(
          eq(campaignRecipients.campaignId, id),
          or(
            eq(campaignRecipients.status, 'failed_generation'),
            eq(campaignRecipients.status, 'failed_send'),
            eq(campaignRecipients.status, 'manual_send_required')
          )
        ));
    }

    // Update the campaign
    const [updatedCampaign] = await db.update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();

    return updatedCampaign;
  }

  // Search Jobs
  async createSearchJob(data: InsertSearchJob): Promise<SearchJob> {
    const [job] = await db.insert(searchJobs).values(data as any).returning();
    return job;
  }

  async getSearchJobByJobId(jobId: string): Promise<SearchJob | undefined> {
    const [job] = await db.select()
      .from(searchJobs)
      .where(eq(searchJobs.jobId, jobId));
    return job;
  }

  async updateSearchJob(id: number, data: Partial<SearchJob>): Promise<SearchJob | undefined> {
    const [updated] = await db.update(searchJobs)
      .set(data)
      .where(eq(searchJobs.id, id))
      .returning();
    return updated;
  }

  async listSearchJobs(userId: number, limit: number = 10): Promise<SearchJob[]> {
    return db.select()
      .from(searchJobs)
      .where(eq(searchJobs.userId, userId))
      .orderBy(desc(searchJobs.createdAt))
      .limit(limit);
  }

  async getPendingSearchJobs(limit: number = 1): Promise<SearchJob[]> {
    return db.select()
      .from(searchJobs)
      .where(eq(searchJobs.status, 'pending'))
      .orderBy(desc(searchJobs.priority), searchJobs.createdAt)
      .limit(limit);
  }

  async getStuckProcessingJobs(cutoffTime: Date): Promise<SearchJob[]> {
    return db.select()
      .from(searchJobs)
      .where(and(
        eq(searchJobs.status, 'processing'),
        lt(searchJobs.startedAt, cutoffTime)
      ));
  }

  async getFailedJobsForRetry(): Promise<SearchJob[]> {
    return db.select()
      .from(searchJobs)
      .where(and(
        eq(searchJobs.status, 'failed'),
        sql`${searchJobs.retryCount} < ${searchJobs.maxRetries}`
      ))
      .orderBy(desc(searchJobs.priority), searchJobs.createdAt);
  }

  async deleteOldSearchJobs(cutoffDate: Date): Promise<number> {
    const result = await db.delete(searchJobs)
      .where(and(
        eq(searchJobs.status, 'completed'),
        sql`${searchJobs.completedAt} < ${cutoffDate}`
      ));
    
    // Return the number of deleted rows
    return (result as any).rowCount || 0;
  }

  // Contact Lists
  async listContactLists(userId: number): Promise<ContactList[]> {
    return db.select()
      .from(contactLists)
      .where(eq(contactLists.userId, userId))
      .orderBy(desc(contactLists.isDefault), desc(contactLists.createdAt));
  }

  async getOrCreatePipeline(userId: number): Promise<ContactList> {
    const [existing] = await db.select()
      .from(contactLists)
      .where(and(
        eq(contactLists.userId, userId),
        eq(contactLists.isDefault, true)
      ));
    
    if (existing) {
      return existing;
    }
    
    const [pipeline] = await db.insert(contactLists)
      .values({
        userId,
        name: 'Pipeline',
        description: 'Your default contact list for prospects',
        contactCount: 0,
        isDefault: true
      })
      .returning();
    
    return pipeline;
  }

  async getContactList(id: number, userId: number): Promise<ContactList | undefined> {
    const [list] = await db.select()
      .from(contactLists)
      .where(and(
        eq(contactLists.id, id),
        eq(contactLists.userId, userId)
      ));
    return list;
  }

  async createContactList(data: InsertContactList): Promise<ContactList> {
    const [list] = await db.insert(contactLists)
      .values(data)
      .returning();
    return list;
  }

  async updateContactList(id: number, data: Partial<ContactList>): Promise<ContactList> {
    const [updated] = await db.update(contactLists)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(contactLists.id, id))
      .returning();
    return updated;
  }

  async deleteContactList(id: number, userId: number): Promise<void> {
    await db.delete(contactLists)
      .where(and(
        eq(contactLists.id, id),
        eq(contactLists.userId, userId)
      ));
  }

  // Contact List Members
  async listContactsByListId(listId: number): Promise<any[]> {
    const members = await db.select({
      id: contacts.id,
      userId: contacts.userId,
      companyId: contacts.companyId,
      name: contacts.name,
      role: contacts.role,
      email: contacts.email,
      alternativeEmails: contacts.alternativeEmails,
      probability: contacts.probability,
      linkedinUrl: contacts.linkedinUrl,
      twitterHandle: contacts.twitterHandle,
      phoneNumber: contacts.phoneNumber,
      department: contacts.department,
      location: contacts.location,
      verificationSource: contacts.verificationSource,
      lastEnriched: contacts.lastEnriched,
      nameConfidenceScore: contacts.nameConfidenceScore,
      userFeedbackScore: contacts.userFeedbackScore,
      feedbackCount: contacts.feedbackCount,
      lastValidated: contacts.lastValidated,
      createdAt: contacts.createdAt,
      completedSearches: contacts.completedSearches,
      contactStatus: contacts.contactStatus,
      lastContactedAt: contacts.lastContactedAt,
      lastContactChannel: contacts.lastContactChannel,
      totalCommunications: contacts.totalCommunications,
      totalReplies: contacts.totalReplies,
      lastThreadId: contacts.lastThreadId,
      companyName: companies.name,
      companyWebsite: companies.website
    })
      .from(contactListMembers)
      .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(eq(contactListMembers.listId, listId));
    
    // Transform to include company as nested object for frontend compatibility
    return members.map(m => ({
      ...m,
      company: m.companyName ? {
        name: m.companyName,
        website: m.companyWebsite
      } : undefined,
      // Remove the flat fields as they're now nested
      companyName: undefined,
      companyWebsite: undefined
    }));
  }

  async addContactsToList(listId: number, contactIds: number[], source: string, addedBy: number, metadata?: any): Promise<{
    addedCount: number;
    duplicateCount: number;
    noEmailCount: number;
    otherListDuplicateCount: number;
  }> {
    if (contactIds.length === 0) {
      return { addedCount: 0, duplicateCount: 0, noEmailCount: 0, otherListDuplicateCount: 0 };
    }
    
    // 1. Fetch contact details to check for emails
    const contactDetails = await db.select({
      id: contacts.id,
      email: contacts.email
    })
      .from(contacts)
      .where(inArray(contacts.id, contactIds));
    
    // Count contacts without email
    const noEmailCount = contactDetails.filter(c => !c.email).length;
    const contactsWithEmail = contactDetails.filter(c => c.email);
    const contactIdsWithEmail = contactsWithEmail.map(c => c.id);
    
    // 2. Check which contacts are already in the list (duplicates)
    const existingMembers = await db.select({
      contactId: contactListMembers.contactId
    })
      .from(contactListMembers)
      .where(and(
        eq(contactListMembers.listId, listId),
        inArray(contactListMembers.contactId, contactIdsWithEmail)
      ));
    
    const existingContactIds = new Set(existingMembers.map(m => m.contactId));
    const duplicateCount = existingContactIds.size;
    
    // 3. Filter out duplicates
    let newContactIds = contactIdsWithEmail.filter(id => !existingContactIds.has(id));
    let otherListDuplicateCount = 0;
    
    // 4. Check for cross-list duplicates if the setting is enabled
    const [targetList] = await db.select({
      noDuplicatesWithOtherLists: contactLists.noDuplicatesWithOtherLists,
      userId: contactLists.userId
    })
      .from(contactLists)
      .where(eq(contactLists.id, listId));
    
    if (targetList?.noDuplicatesWithOtherLists && newContactIds.length > 0) {
      // Get emails of the remaining contacts
      const contactEmailMap = new Map<number, string>();
      contactsWithEmail.forEach(c => {
        if (c.email && newContactIds.includes(c.id)) {
          contactEmailMap.set(c.id, c.email.toLowerCase());
        }
      });
      
      // Get all emails from other lists belonging to this user
      const otherListEmails = await db.selectDistinct({
        email: contacts.email
      })
        .from(contactListMembers)
        .innerJoin(contactLists, eq(contactListMembers.listId, contactLists.id))
        .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
        .where(and(
          eq(contactLists.userId, targetList.userId),
          ne(contactLists.id, listId)
        ));
      
      const otherListEmailSet = new Set(
        otherListEmails
          .map(e => e.email?.toLowerCase())
          .filter((email): email is string => !!email)
      );
      
      // Filter out contacts whose emails exist in other lists
      const beforeFilterCount = newContactIds.length;
      newContactIds = newContactIds.filter(id => {
        const email = contactEmailMap.get(id);
        return !email || !otherListEmailSet.has(email);
      });
      otherListDuplicateCount = beforeFilterCount - newContactIds.length;
    }
    
    const addedCount = newContactIds.length;
    
    if (newContactIds.length > 0) {
      const values = newContactIds.map(contactId => ({
        listId,
        contactId,
        source,
        addedBy,
        sourceMetadata: metadata
      }));
      
      // Insert new contacts
      await db.insert(contactListMembers)
        .values(values)
        .onConflictDoNothing();
      
      // Update contact count
      const count = await this.getListMemberCount(listId);
      await db.update(contactLists)
        .set({ contactCount: count })
        .where(eq(contactLists.id, listId));
    }
    
    return {
      addedCount,
      duplicateCount,
      noEmailCount,
      otherListDuplicateCount
    };
  }

  async removeContactsFromList(listId: number, contactIds: number[]): Promise<void> {
    if (contactIds.length === 0) return;
    
    await db.delete(contactListMembers)
      .where(and(
        eq(contactListMembers.listId, listId),
        inArray(contactListMembers.contactId, contactIds)
      ));
    
    // Update contact count
    const count = await this.getListMemberCount(listId);
    await db.update(contactLists)
      .set({ contactCount: count })
      .where(eq(contactLists.id, listId));
  }

  async isContactInList(listId: number, contactId: number): Promise<boolean> {
    const [member] = await db.select()
      .from(contactListMembers)
      .where(and(
        eq(contactListMembers.listId, listId),
        eq(contactListMembers.contactId, contactId)
      ));
    return !!member;
  }

  async getListMemberCount(listId: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(contactListMembers)
      .where(eq(contactListMembers.listId, listId));
    return result?.count || 0;
  }

  // OAuth Token Methods with Encryption
  async getOAuthToken(userId: number, service: string): Promise<{ 
    accessToken: string; 
    refreshToken?: string; 
    expiresAt?: Date; 
    email?: string 
  } | null> {
    const [token] = await db.select()
      .from(oauthTokens)
      .where(and(
        eq(oauthTokens.userId, userId),
        eq(oauthTokens.service, service)
      ));
    
    if (!token) {
      return null;
    }

    try {
      // Decrypt the tokens
      const accessToken = decrypt(token.accessToken);
      const refreshToken = token.refreshToken ? decrypt(token.refreshToken) : undefined;
      
      return {
        accessToken,
        refreshToken,
        expiresAt: token.expiresAt || undefined,
        email: token.email || undefined
      };
    } catch (error) {
      console.error('Failed to decrypt OAuth token:', error);
      return null;
    }
  }

  async saveOAuthToken(userId: number, service: string, tokenData: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    email?: string;
    scopes?: string[];
    metadata?: any;
  }): Promise<void> {
    // Encrypt sensitive tokens
    const encryptedAccessToken = encrypt(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken ? encrypt(tokenData.refreshToken) : null;

    const tokenRecord = {
      userId,
      service,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokenData.expiresAt,
      email: tokenData.email,
      scopes: tokenData.scopes || [],
      metadata: tokenData.metadata || {},
      updatedAt: new Date()
    };

    // Upsert - update if exists, insert if not
    const [existing] = await db.select()
      .from(oauthTokens)
      .where(and(
        eq(oauthTokens.userId, userId),
        eq(oauthTokens.service, service)
      ));

    if (existing) {
      await db.update(oauthTokens)
        .set(tokenRecord)
        .where(and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.service, service)
        ));
    } else {
      await db.insert(oauthTokens).values(tokenRecord);
    }
  }

  async deleteOAuthToken(userId: number, service: string): Promise<void> {
    await db.delete(oauthTokens)
      .where(and(
        eq(oauthTokens.userId, userId),
        eq(oauthTokens.service, service)
      ));
  }

  async updateOAuthTokenExpiry(userId: number, service: string, expiresAt: Date): Promise<void> {
    await db.update(oauthTokens)
      .set({ 
        expiresAt,
        updatedAt: new Date()
      })
      .where(and(
        eq(oauthTokens.userId, userId),
        eq(oauthTokens.service, service)
      ));
  }

  // User Credits Implementation
  async getUserCredits(userId: number): Promise<{ balance: number; totalPurchased: number; totalUsed: number; lastUpdated?: Date } | null> {
    const [credit] = await db.select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId));
    
    if (!credit) {
      return null;
    }
    
    return {
      balance: credit.balance,
      totalPurchased: credit.totalPurchased,
      totalUsed: credit.totalUsed,
      lastUpdated: credit.lastUpdated || undefined
    };
  }

  async updateUserCredits(
    userId: number, 
    amount: number, 
    type: 'purchase' | 'usage' | 'refund' | 'bonus',
    description?: string
  ): Promise<{ balance: number }> {
    // Start transaction to ensure consistency
    return await db.transaction(async (tx) => {
      // Get current credits
      const [current] = await tx.select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId));
      
      const currentBalance = current?.balance || 0;
      const newBalance = currentBalance + amount;
      
      if (newBalance < 0) {
        throw new Error('Insufficient credits');
      }

      // Update or create credits record
      if (current) {
        await tx.update(userCredits)
          .set({
            balance: newBalance,
            totalPurchased: type === 'purchase' ? current.totalPurchased + amount : current.totalPurchased,
            totalUsed: type === 'usage' ? current.totalUsed + Math.abs(amount) : current.totalUsed,
            lastUpdated: new Date()
          })
          .where(eq(userCredits.userId, userId));
      } else {
        await tx.insert(userCredits)
          .values({
            userId,
            balance: newBalance,
            totalPurchased: type === 'purchase' ? amount : 0,
            totalUsed: type === 'usage' ? Math.abs(amount) : 0
          });
      }

      // Record transaction
      await tx.insert(creditTransactions)
        .values({
          userId,
          amount,
          type,
          description,
          balanceAfter: newBalance
        });

      return { balance: newBalance };
    });
  }

  async getUserCreditHistory(userId: number, limit: number = 50): Promise<any[]> {
    return await db.select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  }

  async awardOneTimeCredits(
    userId: number,
    amount: number,
    rewardKey: string,
    description?: string
  ): Promise<{ success: boolean; credited: boolean; newBalance: number; alreadyClaimed: boolean }> {
    try {
      return await db.transaction(async (tx) => {
        // Check if reward already claimed
        const [existing] = await tx.select()
          .from(creditTransactions)
          .where(and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.rewardKey, rewardKey)
          ));

        if (existing) {
          // Already claimed - get current balance
          const [credit] = await tx.select()
            .from(userCredits)
            .where(eq(userCredits.userId, userId));
          return {
            success: true,
            credited: false,
            newBalance: credit?.balance || 0,
            alreadyClaimed: true
          };
        }

        // Get current credits
        const [current] = await tx.select()
          .from(userCredits)
          .where(eq(userCredits.userId, userId));

        const currentBalance = current?.balance || 0;
        const newBalance = currentBalance + amount;

        // Update or create credits record
        if (current) {
          await tx.update(userCredits)
            .set({
              balance: newBalance,
              lastUpdated: new Date()
            })
            .where(eq(userCredits.userId, userId));
        } else {
          await tx.insert(userCredits)
            .values({
              userId,
              balance: newBalance,
              totalPurchased: 0,
              totalUsed: 0
            });
        }

        // Record transaction with rewardKey for idempotency
        await tx.insert(creditTransactions)
          .values({
            userId,
            amount,
            type: 'bonus',
            description: description || `Reward: ${rewardKey}`,
            rewardKey,
            balanceAfter: newBalance
          });

        return {
          success: true,
          credited: true,
          newBalance,
          alreadyClaimed: false
        };
      });
    } catch (error: any) {
      // Handle unique constraint violation (race condition protection)
      if (error.code === '23505' && error.constraint?.includes('reward_key')) {
        const [credit] = await db.select()
          .from(userCredits)
          .where(eq(userCredits.userId, userId));
        return {
          success: true,
          credited: false,
          newBalance: credit?.balance || 0,
          alreadyClaimed: true
        };
      }
      throw error;
    }
  }

  // Subscriptions Implementation
  async getUserSubscription(userId: number): Promise<any | null> {
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return subscription || null;
  }

  async updateUserSubscription(userId: number, data: any): Promise<any> {
    const [existing] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));

    if (existing) {
      const [updated] = await db.update(subscriptions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(subscriptions)
        .values({ ...data, userId })
        .returning();
      return created;
    }
  }

  async cancelUserSubscription(userId: number): Promise<void> {
    await db.update(subscriptions)
      .set({ 
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(subscriptions.userId, userId));
  }

  // User Notifications Implementation
  async getUserNotifications(userId: number, status?: string): Promise<any[]> {
    if (status) {
      return await db.select()
        .from(userNotifications)
        .where(and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.status, status)
        ))
        .orderBy(desc(userNotifications.createdAt));
    }
    
    return await db.select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt));
  }

  async createUserNotification(
    userId: number, 
    notification: { 
      type: string; 
      title: string; 
      message: string; 
      priority?: string; 
      metadata?: any 
    }
  ): Promise<any> {
    const [created] = await db.insert(userNotifications)
      .values({
        userId,
        ...notification,
        priority: notification.priority || 'normal'
      })
      .returning();
    return created;
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await db.update(userNotifications)
      .set({ 
        status: 'read',
        readAt: new Date()
      })
      .where(eq(userNotifications.id, notificationId));
  }

  async dismissNotification(notificationId: number): Promise<void> {
    await db.update(userNotifications)
      .set({ 
        status: 'dismissed',
        dismissedAt: new Date()
      })
      .where(eq(userNotifications.id, notificationId));
  }

  // User Guidance Progress Implementation
  async getUserGuidanceProgress(userId: number): Promise<UserGuidanceProgress | null> {
    const [progress] = await db.select()
      .from(userGuidanceProgress)
      .where(eq(userGuidanceProgress.userId, userId));
    return progress || null;
  }

  async updateUserGuidanceProgress(userId: number, data: Partial<InsertUserGuidanceProgress>): Promise<UserGuidanceProgress> {
    const existing = await this.getUserGuidanceProgress(userId);
    
    if (existing) {
      const [updated] = await db.update(userGuidanceProgress)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(userGuidanceProgress.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(userGuidanceProgress)
      .values({
        userId,
        completedQuests: data.completedQuests || [],
        completedChallenges: data.completedChallenges || {},
        currentQuestId: data.currentQuestId,
        currentChallengeIndex: data.currentChallengeIndex || 0,
        currentStepIndex: data.currentStepIndex || 0,
        settings: data.settings || {}
      })
      .returning();
    return created;
  }

  // Unified User Progress Implementation
  async getUserProgress(userId: number, namespace: string): Promise<UserProgress | null> {
    const [progress] = await db.select()
      .from(userProgress)
      .where(and(
        eq(userProgress.userId, userId),
        eq(userProgress.namespace, namespace)
      ));
    return progress || null;
  }

  async upsertUserProgress(
    userId: number, 
    namespace: string, 
    completedMilestones: string[], 
    metadata?: Record<string, any>
  ): Promise<UserProgress> {
    const existing = await this.getUserProgress(userId, namespace);
    
    if (existing) {
      const [updated] = await db.update(userProgress)
        .set({
          completedMilestones,
          metadata: metadata || existing.metadata || {},
          updatedAt: new Date()
        })
        .where(and(
          eq(userProgress.userId, userId),
          eq(userProgress.namespace, namespace)
        ))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(userProgress)
      .values({
        userId,
        namespace,
        completedMilestones,
        metadata: metadata || {}
      })
      .returning();
    return created;
  }

  // Access Applications Implementation
  async createAccessApplication(data: InsertAccessApplication): Promise<AccessApplication> {
    const [application] = await db.insert(accessApplications)
      .values({
        name: data.name,
        email: data.email,
        status: 'pending'
      })
      .returning();
    return application;
  }

  async getAccessApplicationByEmail(email: string): Promise<AccessApplication | undefined> {
    const [application] = await db.select()
      .from(accessApplications)
      .where(eq(accessApplications.email, email.toLowerCase()));
    return application;
  }

  async listAccessApplications(): Promise<AccessApplication[]> {
    return db.select()
      .from(accessApplications)
      .orderBy(desc(accessApplications.createdAt));
  }

  // Drip Email Engine Implementation
  async getEmailSequenceByName(name: string): Promise<EmailSequence | undefined> {
    const [sequence] = await db.select()
      .from(emailSequences)
      .where(eq(emailSequences.name, name));
    return sequence;
  }

  async getEmailSequenceEvents(sequenceId: number): Promise<EmailSequenceEvent[]> {
    return db.select()
      .from(emailSequenceEvents)
      .where(and(
        eq(emailSequenceEvents.sequenceId, sequenceId),
        eq(emailSequenceEvents.isActive, true)
      ))
      .orderBy(emailSequenceEvents.eventOrder);
  }

  async createEmailSend(data: InsertEmailSend): Promise<EmailSend> {
    const [send] = await db.insert(emailSends)
      .values({
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
        sequenceId: data.sequenceId,
        eventId: data.eventId,
        templateKey: data.templateKey,
        status: data.status || 'pending',
        scheduledFor: data.scheduledFor,
        metadata: data.metadata || {}
      })
      .returning();
    return send;
  }

  async getEmailSendsByRecipient(email: string): Promise<EmailSend[]> {
    return db.select()
      .from(emailSends)
      .where(eq(emailSends.recipientEmail, email.toLowerCase()))
      .orderBy(desc(emailSends.createdAt));
  }

  async getPendingEmailSends(limit: number = 50): Promise<EmailSend[]> {
    const now = new Date();
    return db.select()
      .from(emailSends)
      .where(and(
        eq(emailSends.status, 'scheduled'),
        lt(emailSends.scheduledFor, now)
      ))
      .orderBy(emailSends.scheduledFor)
      .limit(limit);
  }

  async updateEmailSendStatus(id: number, status: string, errorMessage?: string): Promise<EmailSend | undefined> {
    const [updated] = await db.update(emailSends)
      .set({
        status,
        errorMessage: errorMessage || null,
        retryCount: status === 'failed' ? sql`${emailSends.retryCount} + 1` : emailSends.retryCount,
        updatedAt: new Date()
      })
      .where(eq(emailSends.id, id))
      .returning();
    return updated;
  }

  async markEmailSendAsSent(id: number): Promise<EmailSend | undefined> {
    const [updated] = await db.update(emailSends)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(emailSends.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();