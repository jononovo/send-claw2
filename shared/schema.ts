import { pgTable, text, serial, integer, jsonb, timestamp, boolean, uuid, index, uniqueIndex, real } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firebaseUid: text("firebase_uid"), // Firebase UID for mapping
  createdAt: timestamp("created_at").defaultNow(),
  isGuest: boolean("is_guest").default(false),
  isAdmin: boolean("is_admin").default(false)
});

// User credits table (migrated from KV)
export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  balance: integer("balance").notNull().default(0),
  totalPurchased: integer("total_purchased").notNull().default(0),
  totalUsed: integer("total_used").notNull().default(0),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  uniqueIndex('idx_user_credits_user_id').on(table.userId)
]);

// Credit transactions for audit trail
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer("amount").notNull(), // Positive for additions, negative for usage
  type: text("type").notNull(), // 'purchase', 'usage', 'refund', 'bonus'
  description: text("description"),
  rewardKey: text("reward_key"), // Unique key for one-time rewards (e.g., "challenge:basic-search")
  metadata: jsonb("metadata").default({}), // Additional transaction details
  balanceAfter: integer("balance_after").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_credit_transactions_user_id').on(table.userId),
  index('idx_credit_transactions_type').on(table.type),
  index('idx_credit_transactions_created_at').on(table.createdAt),
  uniqueIndex('idx_credit_transactions_reward_key').on(table.userId, table.rewardKey)
]);

// Subscriptions table (migrated from KV)
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default('inactive'), // 'active', 'inactive', 'cancelled', 'past_due'
  planType: text("plan_type"), // 'basic', 'pro', 'enterprise'
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  uniqueIndex('idx_subscriptions_user_id').on(table.userId),
  index('idx_subscriptions_stripe_customer_id').on(table.stripeCustomerId),
  index('idx_subscriptions_status').on(table.status)
]);

// User Attribution - tracks where users came from (ad campaigns, organic, etc.)
export interface AttributionData {
  utm_source?: string;      // reddit, google, linkedin, organic
  utm_medium?: string;      // cpc, paid, social, email
  utm_campaign?: string;    // campaign ID or name
  utm_content?: string;     // ad content/name
  utm_term?: string;        // search term or ad group
  rdt_cid?: string;         // Reddit click ID
  gclid?: string;           // Google click ID
  li_fat_id?: string;       // LinkedIn click ID
  first_seen?: string;      // ISO timestamp
  landing_page?: string;    // First page visited
  referrer?: string;        // Document referrer
}

export interface ConversionEvent {
  event: string;            // 'access_code_requested', 'registration_complete', etc.
  timestamp: string;        // ISO timestamp
  metadata?: Record<string, any>;
}

export const userAttribution = pgTable("user_attribution", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: text("source"),                                    // Primary source: 'reddit', 'google', 'linkedin', 'organic'
  attributionData: jsonb("attribution_data").$type<AttributionData>().default({}),
  conversionEvents: jsonb("conversion_events").$type<ConversionEvent[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  uniqueIndex('idx_user_attribution_user_id').on(table.userId),
  index('idx_user_attribution_source').on(table.source)
]);

// User Onboarding Snapshot - IMMUTABLE record of exact user words at registration
// This table is APPEND-ONLY - records should NEVER be edited after creation
export interface OnboardingCompanyData {
  name?: string | null;
  website?: string | null;
  hasWebsite?: string | null;  // 'yes' or 'no' from questionnaire
  city?: string | null;
  country?: string | null;
  role?: string | null;  // 'owner', 'executive', 'manager', 'individual'
}

export interface OnboardingUserGoals {
  primaryGoals?: string[];  // ['sales', 'outreach', 'leads', 'curious'] from multi-select
  goal?: string | null;  // Additional goal context
  priorityRanking?: string[];  // Future: ranked priorities
  challenges?: string[];  // Future: pain points they mention
}

export interface OnboardingProductData {
  productUrl?: string | null;  // URL to main product/service page
  offeringType?: string | null;  // 'product', 'service', 'both'
  description?: string | null;
  customerLove?: string | null;
  hasFixedPricing?: string | null;  // 'yes', 'no', 'skip' from questionnaire
  packageName?: string | null;
  packageCost?: string | null;
  packageIncludes?: string | null;
  serviceDescription?: string | null;
  serviceCost?: string | null;
  serviceOther?: string | null;
}

export const userOnboardingSnapshot = pgTable("user_onboarding_snapshot", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // COMPANY - Business context (exact user words)
  company: jsonb("company").$type<OnboardingCompanyData>().default({}),
  
  // USER GOALS - "What brings you here?" selections
  userGoals: jsonb("user_goals").$type<OnboardingUserGoals>().default({}),
  
  // PRODUCT - What they sell and how they price it (exact user words)
  product: jsonb("product").$type<OnboardingProductData>().default({}),
  
  // Metadata
  source: text("source").default('onboarding'), // 'onboarding', 'profile-update', etc.
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow() // Same as capturedAt (immutable record)
}, (table) => [
  index('idx_user_onboarding_snapshot_user_id').on(table.userId),
  index('idx_user_onboarding_snapshot_captured_at').on(table.capturedAt)
]);

// User notifications (migrated from KV)  
export const userNotifications = pgTable("user_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // 'welcome', 'feature', 'credits_low', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default('unread'), // 'unread', 'read', 'dismissed'
  priority: text("priority").default('normal'), // 'low', 'normal', 'high'
  metadata: jsonb("metadata").default({}),
  readAt: timestamp("read_at", { withTimezone: true }),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_user_notifications_user_id').on(table.userId),
  index('idx_user_notifications_status').on(table.status),
  index('idx_user_notifications_created_at').on(table.createdAt)
]);

// User Guidance Progress - tracks quest/challenge completion for the guidance engine
export interface GuidanceProgressSettings {
  autoStartEnabled?: boolean;
  showCompletionCelebrations?: boolean;
}

export const userGuidanceProgress = pgTable("user_guidance_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  completedQuests: text("completed_quests").array().default([]),
  completedChallenges: jsonb("completed_challenges").$type<Record<string, string[]>>().default({}),
  currentQuestId: text("current_quest_id"),
  currentChallengeIndex: integer("current_challenge_index").default(0),
  currentStepIndex: integer("current_step_index").default(0),
  settings: jsonb("settings").$type<GuidanceProgressSettings>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  uniqueIndex('idx_user_guidance_progress_user_id').on(table.userId)
]);

// Guidance Videos - stores video recordings for challenge tutorials with background removal
export interface GuidanceVideoTimestamp {
  stepIndex: number;
  timestamp: number; // milliseconds from video start
  action: string;
}

export const guidanceVideos = pgTable("guidance_videos", {
  id: serial("id").primaryKey(),
  challengeId: text("challenge_id").notNull(),
  questId: text("quest_id").notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  rawPath: text("raw_path"), // Path to uploaded raw video
  processedPath: text("processed_path"), // Path to processed video (legacy, local filesystem)
  objectPath: text("object_path"), // Path in App Storage (e.g., guidance-videos/challenge-id.webm)
  timestamps: jsonb("timestamps").$type<GuidanceVideoTimestamp[]>().default([]),
  duration: real("duration"), // Duration in seconds
  fileSize: integer("file_size"), // Size in bytes
  errorMessage: text("error_message"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_guidance_videos_challenge').on(table.challengeId),
  index('idx_guidance_videos_quest').on(table.questId),
  index('idx_guidance_videos_status').on(table.status)
]);

// Unified User Progress - namespace-scoped progress for any feature (forms, challenges, etc.)
// Replaces feature-specific progress tables with a single unified approach
export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  namespace: text("namespace").notNull(), // e.g., "challenge", "form", "easter-egg"
  completedMilestones: text("completed_milestones").array().default([]), // e.g., ["onboarding-section-a", "basic-search"]
  metadata: jsonb("metadata").default({}), // Additional state (e.g., currentQuestId for guidance)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  uniqueIndex('idx_user_progress_user_namespace').on(table.userId, table.namespace),
  index('idx_user_progress_user_id').on(table.userId),
  index('idx_user_progress_namespace').on(table.namespace)
]);

// OAuth tokens with encryption for sensitive data
export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  service: text("service").notNull(), // 'gmail', 'outlook', etc.
  email: text("email"), // The email address associated with the token
  accessToken: text("access_token").notNull(), // Encrypted
  refreshToken: text("refresh_token"), // Encrypted
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  scopes: jsonb("scopes").$type<string[]>().default([]),
  metadata: jsonb("metadata").default({}), // Additional service-specific data
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  uniqueIndex('idx_oauth_tokens_user_service').on(table.userId, table.service),
  index('idx_oauth_tokens_user_id').on(table.userId),
  index('idx_oauth_tokens_service').on(table.service),
]);

export const searchLists = pgTable("search_lists", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),  
  listId: integer("list_id").notNull(),
  prompt: text("prompt").notNull(),
  resultCount: integer("result_count").notNull(),
  customSearchTargets: jsonb("custom_search_targets").default('[]'),
  totalContacts: integer("total_contacts"),
  totalEmails: integer("total_emails"),
  searchDurationSeconds: integer("search_duration_seconds"),
  sourceBreakdown: jsonb("source_breakdown").$type<{ Perplexity: number; Apollo: number; Hunter: number }>(),
  reportCompanies: jsonb("report_companies").$type<Array<{ id: number; name: string; contacts?: Array<{ id: number; name?: string; role?: string; email?: string; probability?: number }> }>>(),
  searchType: text("search_type").default('normal').$type<'normal' | 'super'>(),
  superSearchData: jsonb("super_search_data").$type<{
    plan: {
      queryType: 'company' | 'contact';
      targetCount: number;
      standardFields: string[];
      customFields: { key: string; label: string }[];
      searchStrategy: string;
    };
    results: Array<{
      type: 'company' | 'contact';
      name: string;
      [key: string]: any;
    }>;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_search_lists_user_id').on(table.userId),
  index('idx_search_lists_list_id').on(table.listId),
]);

export const companies = pgTable("companies", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  slug: text("slug"),
  listId: integer("list_id"),  
  description: text("description"),
  age: integer("age"),
  size: integer("size"),
  website: text("website"),
  alternativeProfileUrl: text("alternative_profile_url"), 
  defaultContactEmail: text("default_contact_email"), 
  ranking: integer("website_ranking"),
  linkedinProminence: integer("linkedin_prominence"),
  customerCount: integer("customer_count"),
  rating: integer("rating"),
  services: jsonb("services").$type<string[]>().default([]),
  validationPoints: jsonb("validation_points").$type<string[]>().default([]),
  differentiation: jsonb("differentiation").$type<string[]>().default([]),
  totalScore: integer("total_score"),
  snapshot: jsonb("snapshot"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  superSearchNote: text("super_search_note"),
  superSearchResearch: text("super_search_research"),
  superSearchMeta: jsonb("super_search_meta").$type<Record<string, any>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_companies_user_id').on(table.userId),
  index('idx_companies_list_id').on(table.listId),
  index('idx_companies_name').on(table.name),
  index('idx_companies_slug').on(table.slug),
]);

export const contacts = pgTable("contacts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: integer("company_id"),
  name: text("name").notNull(),
  slug: text("slug"),
  role: text("role"),
  email: text("email"),
  alternativeEmails: jsonb("alternative_emails").$type<string[]>().default([]),
  probability: integer("probability"),
  linkedinUrl: text("linkedin_url"),
  twitterHandle: text("twitter_handle"),
  phoneNumber: text("phone_number"),
  companyPhoneNumber: text("company_phone_number"),
  department: text("department"),
  location: text("location"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  verificationSource: text("verification_source"),
  lastEnriched: timestamp("last_enriched", { withTimezone: true }),
  nameConfidenceScore: integer("name_confidence_score"), 
  userFeedbackScore: integer("user_feedback_score"), 
  feedbackCount: integer("feedback_count").default(0), 
  lastValidated: timestamp("last_validated", { withTimezone: true }), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedSearches: jsonb("completed_searches").$type<string[]>().default([]),
  // CRM tracking fields
  contactStatus: text("contact_status").default('uncontacted'), // 'uncontacted', 'contacted', 'replied', 'qualified', 'unqualified'
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  lastContactChannel: text("last_contact_channel"), // 'email', 'sms', 'phone'
  totalCommunications: integer("total_communications").default(0),
  totalReplies: integer("total_replies").default(0),
  lastThreadId: text("last_thread_id"), // Most recent conversation thread
  // ICP feedback fields
  feedbackType: text("feedback_type"), // 'excellent' | 'terrible'
  ispContext: text("isp_context"), // User's explanation of why ideal/not ideal
  feedbackAt: timestamp("feedback_at", { withTimezone: true }),
  // Apollo mobile phone webhook fields
  apolloPersonId: text("apollo_person_id"), // Apollo's person ID for webhook correlation
  mobilePhoneStatus: text("mobile_phone_status"), // 'pending' | 'found' | 'not_found' | null
  mobilePhoneRequestedAt: timestamp("mobile_phone_requested_at", { withTimezone: true }),
  // Super Search fields
  superSearchNote: text("super_search_note"),
  superSearchResearch: text("super_search_research"),
  superSearchMeta: jsonb("super_search_meta").$type<Record<string, any>>()
}, (table) => [
  index('idx_contacts_company_id').on(table.companyId),
  index('idx_contacts_user_id').on(table.userId),
  index('idx_contacts_email').on(table.email),
  index('idx_contacts_slug').on(table.slug),
]);

/* 
// ====================================================
// INACTIVE FEATURE - CONTACT FEEDBACK (NOT CURRENTLY PUSHED)
// ====================================================
// Uncomment when contact rating functionality is activated

export const contactFeedback = pgTable("contact_feedback", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  contactId: integer("contact_id").notNull(),
  feedbackType: text("feedback_type").notNull(), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_contact_feedback_contact_id').on(table.contactId),
]);
*/



export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  description: text("description"),
  category: text("category").default('general'),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  settings: jsonb("settings").$type<UserSettings>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Type for user settings stored in JSONB column
export interface UserSettings {
  themePreference?: 'light' | 'dark' | 'system';
  accessCode?: string; // The access code used during registration (e.g., 'quack', 'charlie')
  // Future settings can be added here without migrations
}

// Email sending preferences for fallback system
export const userEmailPreferences = pgTable("user_email_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  preferredMethod: text("preferred_method").default('smart-default'), // 'smart-default' | 'gmail' | 'outlook' | 'default-app' | 'ask-always'
  hasSeenFirstTimeModal: boolean("has_seen_first_time_modal").default(false),
  hasSeenIOSNotification: boolean("has_seen_ios_notification").default(false),
  hasSeenAndroidNotification: boolean("has_seen_android_notification").default(false),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  lastUsedMethod: text("last_used_method"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Search jobs for persistent and resilient search execution
export const searchJobs = pgTable("search_jobs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: uuid("job_id").notNull().unique().defaultRandom(),
  query: text("query").notNull(),
  searchType: text("search_type").notNull().default('companies'), // 'companies', 'contacts', 'emails', 'contact-only', 'email-single', 'individual'
  contactSearchConfig: jsonb("contact_search_config").default('{}'),
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  progress: jsonb("progress").default('{}'), // {phase, completed, total, message}
  results: jsonb("results"), // companies and contacts data
  resultCount: integer("result_count").default(0),
  error: text("error"),
  source: text("source").notNull().default('frontend'), // 'frontend', 'api', 'cron'
  metadata: jsonb("metadata").default('{}'), // additional data like sessionId, listId
  priority: integer("priority").default(0), // higher priority jobs get processed first
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }) // for automatic cleanup
}, (table) => [
  index('idx_search_jobs_user_id').on(table.userId),
  index('idx_search_jobs_job_id').on(table.jobId),
  index('idx_search_jobs_status').on(table.status),
  index('idx_search_jobs_created_at').on(table.createdAt),
  index('idx_search_jobs_priority_status').on(table.priority, table.status)
]);



// N8N Workflow tables have been removed

const searchListSchema = z.object({
  listId: z.number().min(1001),
  prompt: z.string().min(1, "Search prompt is required"),
  resultCount: z.number().min(0),
  customSearchTargets: z.array(z.string()).nullable(),
  totalContacts: z.number().nullable().optional(),
  totalEmails: z.number().nullable().optional(),
  searchDurationSeconds: z.number().nullable().optional(),
  sourceBreakdown: z.object({
    Perplexity: z.number(),
    Apollo: z.number(),
    Hunter: z.number()
  }).nullable().optional()
});

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  slug: z.string().nullable().optional(),
  listId: z.number().nullable(),
  description: z.string().nullable(),
  age: z.number().nullable(),
  size: z.number().nullable(),
  website: z.string().nullable(),
  alternativeProfileUrl: z.string().nullable(),
  defaultContactEmail: z.string().email().nullable(),
  ranking: z.number().nullable(),
  linkedinProminence: z.number().nullable(),
  customerCount: z.number().nullable(),
  rating: z.number().nullable(),
  services: z.array(z.string()).nullable(),
  validationPoints: z.array(z.string()).nullable(),
  differentiation: z.array(z.string()).nullable(),
  totalScore: z.number().nullable(),
  snapshot: z.record(z.unknown()).nullable(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  superSearchNote: z.string().nullable().optional(),
  superSearchResearch: z.string().nullable().optional(),
  superSearchMeta: z.record(z.unknown()).nullable().optional()
});

const contactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  slug: z.string().nullable().optional(),
  companyId: z.number(),
  role: z.string().nullable(),
  email: z.string().email().nullable(),
  probability: z.number().min(1).max(100).nullable(),
  linkedinUrl: z.string().url().nullable(),
  twitterHandle: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  companyPhoneNumber: z.string().nullable(),
  department: z.string().nullable(),
  location: z.string().nullable(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  verificationSource: z.string().nullable(),
  nameConfidenceScore: z.number().min(0).max(100).nullable(),
  userFeedbackScore: z.number().min(0).max(100).nullable(),
  feedbackCount: z.number().min(0).nullable(),
  alternativeEmails: z.array(z.string()).optional(),
  completedSearches: z.array(z.string()).optional(),
  // Apollo mobile phone webhook fields
  apolloPersonId: z.string().nullable().optional(),
  mobilePhoneStatus: z.enum(['pending', 'found', 'not_found']).nullable().optional(),
  mobilePhoneRequestedAt: z.date().nullable().optional(),
  // Super Search fields
  superSearchNote: z.string().nullable().optional(),
  superSearchResearch: z.string().nullable().optional(),
  superSearchMeta: z.record(z.unknown()).nullable().optional()
});

/* INACTIVE FEATURE SCHEMA - CONTACT FEEDBACK
const contactFeedbackSchema = z.object({
  contactId: z.number(),
  feedbackType: z.enum(['excellent', 'ok', 'terrible'])
});
*/





const emailTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  description: z.string().optional(),
  category: z.string().default('general')
});

// Zod schema for user settings
export const userSettingsSchema = z.object({
  themePreference: z.enum(['light', 'dark', 'system']).optional()
});

const userPreferencesSchema = z.object({
  userId: z.number(),
  settings: userSettingsSchema.optional()
});

const userEmailPreferencesSchema = z.object({
  preferredMethod: z.enum(['smart-default', 'gmail', 'outlook', 'default-app', 'ask-always']).default('smart-default'),
  hasSeenFirstTimeModal: z.boolean().default(false),
  hasSeenIOSNotification: z.boolean().default(false),
  hasSeenAndroidNotification: z.boolean().default(false),
  successCount: z.number().default(0),
  failureCount: z.number().default(0),
  lastUsedMethod: z.string().optional()
});

const searchJobSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  searchType: z.enum(['companies', 'contacts', 'emails', 'email-single', 'individual', 'individual_search']).default('companies'),
  contactSearchConfig: z.record(z.any()).optional(),
  source: z.enum(['frontend', 'api', 'cron']).default('frontend'),
  metadata: z.record(z.any()).optional(),
  priority: z.number().int().min(0).default(0),
  maxRetries: z.number().int().min(0).default(3)
});



// N8N Workflow schemas have been removed

export const insertSearchListSchema = searchListSchema.extend({
  userId: z.number()
});
export const insertCompanySchema = companySchema;
export const insertContactSchema = contactSchema;
export const insertEmailTemplateSchema = emailTemplateSchema.extend({
  userId: z.number()
});
export const insertUserPreferencesSchema = userPreferencesSchema;
export const insertUserEmailPreferencesSchema = userEmailPreferencesSchema.extend({
  userId: z.number()
});

export type SearchList = typeof searchLists.$inferSelect;
export type InsertSearchList = z.infer<typeof insertSearchListSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserEmailPreferences = typeof userEmailPreferences.$inferSelect;
export type InsertUserEmailPreferences = z.infer<typeof insertUserEmailPreferencesSchema>;

// User Guidance Progress types (legacy - being replaced by unified userProgress)
export type UserGuidanceProgress = typeof userGuidanceProgress.$inferSelect;
export type InsertUserGuidanceProgress = {
  userId: number;
  completedQuests?: string[];
  completedChallenges?: Record<string, string[]>;
  currentQuestId?: string | null;
  currentChallengeIndex?: number;
  currentStepIndex?: number;
  settings?: GuidanceProgressSettings;
};

// Unified User Progress types
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = {
  userId: number;
  namespace: string;
  completedMilestones?: string[];
  metadata?: Record<string, any>;
};

// N8N workflow types have been removed

// Add user schema and type
export const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isGuest: z.boolean().optional()
});

export const insertUserSchema = userSchema;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// User Attribution types
export type UserAttribution = typeof userAttribution.$inferSelect;
export type InsertUserAttribution = {
  userId: number;
  source?: string;
  attributionData?: AttributionData;
  conversionEvents?: ConversionEvent[];
};

// User Onboarding Snapshot schema and types
export const onboardingCompanySchema = z.object({
  name: z.string().optional(),
  website: z.string().optional(),
  hasWebsite: z.boolean().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  userRole: z.string().optional()
});

export const onboardingUserGoalsSchema = z.object({
  primaryGoals: z.array(z.string()).optional(),
  priorityRanking: z.array(z.string()).optional(),
  challenges: z.array(z.string()).optional()
});

export const onboardingProductSchema = z.object({
  productUrl: z.string().optional(),
  offeringType: z.enum(['product', 'service', 'both']).optional(),
  description: z.string().optional(),
  customerLove: z.string().optional(),
  pricingModel: z.enum(['fixed', 'variable', 'not_set']).optional(),
  packageName: z.string().optional(),
  packageCost: z.string().optional(),
  packageIncludes: z.string().optional(),
  serviceDescription: z.string().optional(),
  serviceCost: z.string().optional(),
  serviceNotes: z.string().optional()
});

export const insertUserOnboardingSnapshotSchema = z.object({
  userId: z.number(),
  company: onboardingCompanySchema.optional(),
  userGoals: onboardingUserGoalsSchema.optional(),
  product: onboardingProductSchema.optional(),
  source: z.string().default('onboarding')
});

export type UserOnboardingSnapshot = typeof userOnboardingSnapshot.$inferSelect;
export type InsertUserOnboardingSnapshot = z.infer<typeof insertUserOnboardingSnapshotSchema>;

// Legacy type stubs for components that still import them
export type SearchSection = { id: string; title: string; content: string };

/* 
// ====================================================
// INACTIVE FEATURE - EMAIL CONVERSATIONS & WEBHOOKS (NOT CURRENTLY PUSHED)
// ====================================================
// Uncomment when email conversation tracking and webhook logging is activated

export const emailThreads = pgTable("email_threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  subject: text("subject").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isArchived: boolean("is_archived").default(false)
});

export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => emailThreads.id),
  from: text("from").notNull(),
  fromEmail: text("from_email").notNull(),
  to: text("to").notNull(),
  toEmail: text("to_email").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isRead: boolean("is_read").default(false),
  direction: text("direction").notNull() // "outbound" or "inbound"
});

export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull(),
  searchId: text("search_id"),
  source: text("source").notNull(),  // Format: "provider-operation" (e.g. "n8n-send", "n8n-receive")
  method: text("method"),
  url: text("url"),
  headers: jsonb("headers").default({}),
  body: jsonb("body").default({}),
  status: text("status").default("pending"), // pending, success, error
  statusCode: integer("status_code"),
  processingDetails: jsonb("processing_details").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
*/

// Daily Outreach Tables
export const dailyOutreachBatches = pgTable("daily_outreach_batches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  batchDate: timestamp("batch_date", { withTimezone: true }).notNull(),
  secureToken: uuid("secure_token").defaultRandom().notNull(),
  status: text("status").default("pending"), // "pending", "partial", "complete", "expired"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
}, (table) => [
  index('idx_outreach_batch_user_id').on(table.userId),
  index('idx_outreach_batch_token').on(table.secureToken),
  index('idx_outreach_batch_date').on(table.batchDate),
]);

export const dailyOutreachItems = pgTable("daily_outreach_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => dailyOutreachBatches.id, { onDelete: 'cascade' }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  communicationId: integer("communication_id").references(() => communicationHistory.id, { onDelete: 'set null' }), // Link to CRM record when sent
  emailSubject: text("email_subject").notNull(),
  emailBody: text("email_body").notNull(),
  emailTone: text("email_tone").notNull(),
  status: text("status").default("pending"), // "pending", "sent", "skipped", "edited"
  sentAt: timestamp("sent_at", { withTimezone: true }),
  editedContent: text("edited_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_outreach_item_batch_id').on(table.batchId),
  index('idx_outreach_item_contact_id').on(table.contactId),
  index('idx_outreach_item_communication_id').on(table.communicationId),
]);

// CRM Communications History Table
export const communicationHistory = pgTable("communication_history", {
  // Core identification
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  // Channel & type
  channel: text("channel").notNull().default('email'), // 'email', 'sms', 'phone', 'linkedin', 'whatsapp'
  direction: text("direction").notNull().default('outbound'), // 'outbound', 'inbound'
  
  // Content
  subject: text("subject"), // Email subject, SMS first line, call topic
  content: text("content").notNull(), // Full message content
  contentPreview: text("content_preview"), // First 200 chars for list views
  
  // Status tracking
  status: text("status").notNull().default('pending'),
  // Email: 'pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'replied', 'unsubscribed'
  // SMS: 'pending', 'sent', 'delivered', 'failed', 'replied'
  // Phone: 'scheduled', 'completed', 'no_answer', 'voicemail', 'busy'
  
  // Threading (critical for email replies)
  threadId: text("thread_id"), // Gmail threadId or generated UUID
  parentId: integer("parent_id"),
  inReplyTo: text("in_reply_to"), // Email Message-ID for standard threading
  references: text("references"), // Email References header chain
  
  // Timestamps
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  
  // Attribution
  campaignId: integer("campaign_id"), // Future campaigns
  batchId: integer("batch_id").references(() => dailyOutreachBatches.id, { onDelete: 'set null' }),
  templateId: integer("template_id").references(() => emailTemplates.id, { onDelete: 'set null' }),
  
  // Enhanced metadata
  metadata: jsonb("metadata").default({}),
  // Structure:
  // {
  //   from: string,
  //   to: string,
  //   cc: string[],
  //   bcc: string[],
  //   replyTo: string,
  //   messageId: string,
  //   gmailThreadId: string,
  //   gmailHistoryId: string,
  //   tone: string,
  //   offerStrategy: string,
  //   sourceTable: 'manual_outreach' | 'daily_outreach',
  //   originalId: number, // ID from source table
  //   headers: object
  // }
  
  // Engagement metrics
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  clickedLinks: jsonb("clicked_links").$type<string[]>().default([]),
  
  // Error handling
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Audit
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  // Standard indexes
  index('idx_comm_contact_id').on(table.contactId),
  index('idx_comm_company_id').on(table.companyId),
  index('idx_comm_user_id').on(table.userId),
  index('idx_comm_channel').on(table.channel),
  index('idx_comm_status').on(table.status),
  index('idx_comm_thread_id').on(table.threadId),
  index('idx_comm_sent_at').on(table.sentAt),
  index('idx_comm_created_at').on(table.createdAt),
  // Composite index for contact history queries
  index('idx_comm_contact_sent').on(table.contactId, table.sentAt),
]);

export const userOutreachPreferences = pgTable("user_outreach_preferences", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  // Campaign activation status - true means the user has explicitly started their campaign
  // Note: Campaign only runs when enabled=true AND all components configured (product, sender, customer)
  enabled: boolean("enabled").default(true), // TODO: Consider renaming to 'isCampaignActive' for clarity
  scheduleDays: text("schedule_days").array().default(['mon', 'tue', 'wed']),
  scheduleTime: text("schedule_time").default('09:00'), // Store as string for simplicity
  timezone: text("timezone").default('America/New_York'),
  minContactsRequired: integer("min_contacts_required").default(5),
  activeProductId: integer("active_product_id").references(() => strategicProfiles.id, { onDelete: 'set null' }),
  activeSenderProfileId: integer("active_sender_profile_id").references(() => senderProfiles.id, { onDelete: 'set null' }),
  activeCustomerProfileId: integer("active_customer_profile_id").references(() => customerProfiles.id, { onDelete: 'set null' }),
  // Vacation mode fields
  vacationMode: boolean("vacation_mode").default(false),
  vacationStartDate: timestamp("vacation_start_date", { withTimezone: true }),
  vacationEndDate: timestamp("vacation_end_date", { withTimezone: true }),
  lastNudgeSent: timestamp("last_nudge_sent", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_outreach_pref_enabled').on(table.enabled),
]);

// Daily outreach job persistence table
export const dailyOutreachJobs = pgTable("daily_outreach_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  status: text("status").default("scheduled"), // "scheduled", "running", "completed", "failed"
  lastError: text("last_error"),
  retryCount: integer("retry_count").default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_jobs_next_run').on(table.nextRunAt),
  index('idx_jobs_user_status').on(table.userId, table.status),
  index('idx_jobs_retry').on(table.nextRetryAt, table.retryCount),
]);

// Daily outreach job execution logs for audit trail
export const dailyOutreachJobLogs = pgTable("daily_outreach_job_logs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => dailyOutreachJobs.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // "success", "failed", "skipped"
  batchId: integer("batch_id").references(() => dailyOutreachBatches.id, { onDelete: 'set null' }),
  processingTimeMs: integer("processing_time_ms"),
  contactsProcessed: integer("contacts_processed"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_job_logs_job_id').on(table.jobId),
  index('idx_job_logs_user_id').on(table.userId),
  index('idx_job_logs_executed_at').on(table.executedAt),
]);

// Strategic onboarding tables
// Sender Profiles for Campaigns
export const senderProfiles = pgTable("sender_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  title: text("title"), // For honorifics like Dr., Mr., Ms.
  companyPosition: text("company_position"), // For role/designation like CEO, Engineer
  companyName: text("company_name"),
  companyWebsite: text("company_website"),
  isDefault: boolean("is_default").default(false),
  source: text("source").default("manual"), // 'registered' | 'gmail' | 'manual'
  gmailAccountEmail: text("gmail_account_email"), // Email of connected Gmail account
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Target Customer Profiles for Campaigns
export const customerProfiles = pgTable("customer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text("label").notNull(), // e.g., "Small Business Owners"
  targetDescription: text("target_description"), // Full description of target customer
  industries: text("industries").array(), // Array of industries
  roles: text("roles").array(), // Array of job roles/titles
  locations: text("locations").array(), // Array of geographical locations
  companySizes: text("company_sizes").array(), // Array of company size ranges
  techStack: text("tech_stack").array(), // Array of technologies they use
  notes: text("notes"), // Additional notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});


// Campaign Tables
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"), // draft, active, paused, completed, scheduled
  subject: text("subject"),
  body: text("body"),
  prompt: text("prompt"),
  contactListId: integer("contact_list_id").references(() => contactLists.id, { onDelete: 'set null' }),
  senderProfileId: integer("sender_profile_id").references(() => senderProfiles.id, { onDelete: 'set null' }),
  strategicProfileId: integer("strategic_profile_id").references(() => strategicProfiles.id, { onDelete: 'set null' }), // Reference to product/service info
  targetCustomerProfileId: integer("target_customer_profile_id").references(() => customerProfiles.id, { onDelete: 'set null' }),
  // Email generation settings
  tone: text("tone"),
  offerType: text("offer_type"),
  productId: integer("product_id"),
  // Scheduling settings
  sendTimePreference: text("send_time_preference"), // immediate, scheduled, draft
  scheduleDate: timestamp("schedule_date"),
  scheduleTime: text("schedule_time"), // e.g., "09:00"
  timezone: text("timezone").default("America/New_York"),
  // Autopilot settings
  autopilotEnabled: boolean("autopilot_enabled").default(false),
  autopilotSettings: jsonb("autopilot_settings"), // JSON object with detailed autopilot config
  maxEmailsPerDay: integer("max_emails_per_day").default(20),
  delayBetweenEmails: integer("delay_between_emails").default(30), // minutes
  // Human Review settings
  requiresHumanReview: boolean("requires_human_review").default(true), // true = notification/review flow, false = auto-send
  emailTemplateId: integer("email_template_id").references(() => emailTemplates.id, { onDelete: 'set null' }), // template for auto-send campaigns
  // Generation type settings
  generationType: text("generation_type").default("merge_field"), // 'ai_unique' = generate unique email per recipient, 'merge_field' = use template with merge fields
  // Tracking settings
  trackEmails: boolean("track_emails").default(true),
  unsubscribeLink: boolean("unsubscribe_link").default(true),
  // Original fields
  startDate: timestamp("start_date").notNull().defaultNow(), // Always required, defaults to now
  endDate: timestamp("end_date"),
  durationDays: integer("duration_days").notNull().default(14), // Default 2 weeks
  dailyLeadTarget: integer("daily_lead_target").notNull().default(5),
  totalLeadsGenerated: integer("total_leads_generated").notNull().default(0),
  responseRate: real("response_rate").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const strategicProfiles = pgTable("strategic_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  businessType: text("business_type").notNull(), // "product" or "service"
  businessDescription: text("business_description").notNull(),
  uniqueAttributes: text("unique_attributes").array(),
  targetCustomers: text("target_customers").notNull(),
  marketNiche: text("market_niche"), // "niche" or "broad"
  // Enhanced product profile fields
  productService: text("product_service"), // What they sell
  customerFeedback: text("customer_feedback"), // What customers say
  website: text("website"), // Company website
  businessLocation: text("business_location"), // Where they're located
  primaryCustomerType: text("primary_customer_type"), // Who they sell to
  primarySalesChannel: text("primary_sales_channel"), // How they find customers
  primaryBusinessGoal: text("primary_business_goal"), // Main business objective
  // Strategy fields for cold email outreach
  strategyHighLevelBoundary: text("strategy_high_level_boundary"), // "3-4 star family-friendly hotels in coastal SE US"
  exampleSprintPlanningPrompt: text("example_sprint_planning_prompt"), // "family-friendly hotels on space coast, florida"
  exampleDailySearchQuery: text("example_daily_search_query"), // "family-friendly hotels in cocoa beach"
  productAnalysisSummary: text("product_analysis_summary"), // AI-generated product profile summary
  reportSalesContextGuidance: text("report_sales_context_guidance"), // AI-generated context for cold email approach
  reportSalesTargetingGuidance: text("report_sales_targeting_guidance"), // AI-generated targeting recommendations
  productOfferStrategies: text("product_offer_strategies"), // JSON array of 6 offer strategies
  dailySearchQueries: text("daily_search_queries"), // JSON array of 8 daily search queries from strategy
  strategicPlan: jsonb("strategic_plan").default({}),
  searchPrompts: text("search_prompts").array(),
  status: text("status").default("in_progress"), // "in_progress", "completed"
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const onboardingChats = pgTable("onboarding_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  profileId: integer("profile_id").notNull().references(() => strategicProfiles.id, { onDelete: 'cascade' }),
  messages: jsonb("messages").default([]),
  currentStep: text("current_step").default("business_description"),
  isComplete: boolean("is_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

/* 
// ====================================================
// INACTIVE FEATURE - PROSPECT DELIVERIES (NOT CURRENTLY PUSHED)
// ====================================================
// Uncomment when scheduled prospect delivery functionality is activated

export const prospectDeliveries = pgTable("prospect_deliveries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profileId: integer("profile_id").notNull().references(() => strategicProfiles.id),
  searchPrompt: text("search_prompt").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  status: text("status").default("scheduled"), // "scheduled", "delivered", "failed"
  prospectCount: integer("prospect_count").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
*/

// Define Schema for webhook logs
// Email conversation schemas
export const emailThreadSchema = z.object({
  contactId: z.number(),
  subject: z.string().min(1, "Subject is required"),
  isArchived: z.boolean().default(false)
});

export const emailMessageSchema = z.object({
  threadId: z.number(),
  from: z.string().min(1, "Sender name is required"),
  fromEmail: z.string().email("Invalid from email"),
  to: z.string().min(1, "Recipient name is required"),
  toEmail: z.string().email("Invalid to email"),
  content: z.string().min(1, "Message content is required"),
  isRead: z.boolean().default(false),
  direction: z.enum(["outbound", "inbound"])
});

export const webhookLogSchema = z.object({
  requestId: z.string(),
  searchId: z.string().optional(),
  source: z.string(),
  method: z.string().optional(),
  url: z.string().optional(),
  headers: z.record(z.string()).optional(),
  body: z.record(z.unknown()).optional(),
  status: z.enum(["pending", "success", "error"]).default("pending"),
  statusCode: z.number().optional(),
  processingDetails: z.record(z.unknown()).optional()
});

export const insertEmailThreadSchema = emailThreadSchema.extend({
  userId: z.number()
});

export const insertEmailMessageSchema = emailMessageSchema;

export const insertWebhookLogSchema = webhookLogSchema;

// Daily Outreach schemas
export const dailyOutreachBatchSchema = z.object({
  batchDate: z.string(),
  status: z.enum(["pending", "partial", "complete", "expired"]).default("pending"),
  expiresAt: z.string()
});

export const dailyOutreachItemSchema = z.object({
  batchId: z.number(),
  contactId: z.number(),
  companyId: z.number(),
  emailSubject: z.string().min(1, "Email subject is required"),
  emailBody: z.string().min(1, "Email body is required"),
  emailTone: z.string(),
  status: z.enum(["pending", "sent", "skipped", "edited"]).default("pending"),
  sentAt: z.string().optional(),
  editedContent: z.string().optional()
});

export const userOutreachPreferencesSchema = z.object({
  enabled: z.boolean().default(true),
  scheduleDays: z.array(z.string()).default(['mon', 'tue', 'wed']),
  scheduleTime: z.string().default('09:00'),
  timezone: z.string().default('America/New_York'),
  minContactsRequired: z.number().default(5),
  activeProductId: z.number().optional(),
  activeSenderProfileId: z.number().optional(),
  activeCustomerProfileId: z.number().optional(),
  vacationMode: z.boolean().default(false),
  vacationStartDate: z.string().optional(),
  vacationEndDate: z.string().optional(),
  lastNudgeSent: z.string().optional()
});

// Strategic onboarding schemas
// Sender Profile schemas
export const senderProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  companyPosition: z.string().optional(),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  isDefault: z.boolean().default(false),
  source: z.enum(['registered', 'gmail', 'manual']).default('manual'),
  gmailAccountEmail: z.string().optional()
});

// Target Customer Profile schemas
export const targetCustomerProfileSchema = z.object({
  label: z.string().min(1, "Label is required"),
  targetDescription: z.string().optional(),
  industries: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  companySizes: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  notes: z.string().optional()
});

export const strategicProfileSchema = z.object({
  title: z.string().min(1, "Title is required"),
  businessType: z.enum(["product", "service"]),
  businessDescription: z.string().min(1, "Business description is required"),
  uniqueAttributes: z.array(z.string()).optional(),
  targetCustomers: z.string().min(1, "Target customers description is required"),
  marketNiche: z.enum(["niche", "broad"]).optional(),
  // Enhanced product profile fields
  productService: z.string().optional(),
  customerFeedback: z.string().optional(),
  website: z.string().optional(),
  businessLocation: z.string().optional(),
  primaryCustomerType: z.string().optional(),
  primarySalesChannel: z.string().optional(),
  primaryBusinessGoal: z.string().optional(),
  // Strategy fields for cold email outreach
  strategyHighLevelBoundary: z.string().optional(),
  exampleSprintPlanningPrompt: z.string().optional(),
  exampleDailySearchQuery: z.string().optional(),
  productAnalysisSummary: z.string().optional(),
  reportSalesContextGuidance: z.string().optional(),
  reportSalesTargetingGuidance: z.string().optional(),
  dailySearchQueries: z.string().optional(),
  strategicPlan: z.record(z.unknown()).optional(),
  searchPrompts: z.array(z.string()).optional(),
  status: z.enum(["in_progress", "completed"]).default("in_progress")
});

export const onboardingChatSchema = z.object({
  profileId: z.number(),
  messages: z.array(z.object({
    id: z.string(),
    content: z.string(),
    role: z.enum(["user", "assistant"]),
    timestamp: z.string()
  })).optional(),
  currentStep: z.string().default("business_description"),
  isComplete: z.boolean().default(false)
});

/* INACTIVE FEATURE SCHEMA - PROSPECT DELIVERIES
export const prospectDeliverySchema = z.object({
  profileId: z.number(),
  searchPrompt: z.string().min(1, "Search prompt is required"),
  deliveryDate: z.string(), // ISO string
  status: z.enum(["scheduled", "delivered", "failed"]).default("scheduled"),
  prospectCount: z.number().default(0)
});

export const insertProspectDeliverySchema = prospectDeliverySchema.extend({
  userId: z.number()
});
*/

export const insertDailyOutreachBatchSchema = dailyOutreachBatchSchema.extend({
  userId: z.number()
});

export const insertDailyOutreachItemSchema = dailyOutreachItemSchema;

export const insertUserOutreachPreferencesSchema = userOutreachPreferencesSchema.extend({
  userId: z.number()
});

export const insertSenderProfileSchema = senderProfileSchema.extend({
  userId: z.number()
});

export const insertTargetCustomerProfileSchema = targetCustomerProfileSchema.extend({
  userId: z.number()
});

export const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  status: z.enum(["draft", "active", "paused", "completed", "scheduled"]).default("draft"),
  subject: z.string().optional(),
  body: z.string().optional(),
  prompt: z.string().optional(),
  contactListId: z.number().optional(),
  senderProfileId: z.number().optional(),
  productId: z.number().optional(),
  strategicProfileId: z.number().optional(),
  targetCustomerProfileId: z.number().optional(),
  // Email generation settings
  tone: z.string().optional(),
  offerType: z.string().optional(),
  generationType: z.string().optional(),
  // Scheduling settings
  sendTimePreference: z.string().optional(),
  scheduleDate: z.coerce.date().optional(),
  scheduleTime: z.string().optional(),
  timezone: z.string().default("America/New_York"),
  startDate: z.coerce.date().optional(), // Will be set by backend if not provided
  endDate: z.coerce.date().optional(), // Will be calculated by backend if not provided
  // Autopilot settings
  autopilotEnabled: z.boolean().default(false),
  autopilotSettings: z.record(z.unknown()).optional(),
  maxEmailsPerDay: z.number().default(20),
  delayBetweenEmails: z.number().default(30),
  // Human Review settings
  requiresHumanReview: z.boolean().default(true),
  emailTemplateId: z.number().optional(),
  // Tracking settings
  trackEmails: z.boolean().default(true),
  unsubscribeLink: z.boolean().default(true),
  // Original fields
  durationDays: z.number().default(14),
  dailyLeadTarget: z.number().default(5)
});

export const insertCampaignSchema = campaignSchema.extend({
  userId: z.number()
});

export const updateCampaignSchema = campaignSchema.partial();

export const insertStrategicProfileSchema = strategicProfileSchema.extend({
  userId: z.number()
});

export const insertOnboardingChatSchema = onboardingChatSchema.extend({
  userId: z.number()
});

/* INACTIVE FEATURE TYPES - EMAIL CONVERSATIONS, WEBHOOKS & PROSPECT DELIVERIES
export type EmailThread = typeof emailThreads.$inferSelect;
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type ProspectDelivery = typeof prospectDeliveries.$inferSelect;
export type InsertProspectDelivery = z.infer<typeof insertProspectDeliverySchema>;
*/

// Strategic onboarding types
export type DailyOutreachBatch = typeof dailyOutreachBatches.$inferSelect;
export type InsertDailyOutreachBatch = z.infer<typeof insertDailyOutreachBatchSchema>;
export type DailyOutreachItem = typeof dailyOutreachItems.$inferSelect;
export type InsertDailyOutreachItem = z.infer<typeof insertDailyOutreachItemSchema>;
export type UserOutreachPreferences = typeof userOutreachPreferences.$inferSelect;
export type InsertUserOutreachPreferences = z.infer<typeof insertUserOutreachPreferencesSchema>;

export type SenderProfile = typeof senderProfiles.$inferSelect;
export type InsertSenderProfile = z.infer<typeof insertSenderProfileSchema>;
export type TargetCustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertTargetCustomerProfile = z.infer<typeof insertTargetCustomerProfileSchema>;
export type StrategicProfile = typeof strategicProfiles.$inferSelect;
export type InsertStrategicProfile = z.infer<typeof insertStrategicProfileSchema>;
export type OnboardingChat = typeof onboardingChats.$inferSelect;
export type InsertOnboardingChat = z.infer<typeof insertOnboardingChatSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

// Contact Lists tables
export const contactLists = pgTable("contact_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  contactCount: integer("contact_count").notNull().default(0),
  noDuplicatesWithOtherLists: boolean("no_duplicates_with_other_lists").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const contactListMembers = pgTable("contact_list_members", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => contactLists.id, { onDelete: 'cascade' }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  addedAt: timestamp("added_at").defaultNow(),
  addedBy: integer("added_by").references(() => users.id, { onDelete: 'set null' }),
  source: text("source").notNull().default('manual'), // 'manual', 'search_list', 'company', 'bulk'
  sourceMetadata: jsonb("source_metadata")
}, (table) => [
  index('idx_contact_list_members_list_id').on(table.listId),
  index('idx_contact_list_members_contact_id').on(table.contactId),
  uniqueIndex('idx_contact_list_unique').on(table.listId, table.contactId)
]);

// Campaign recipients - Track individual email recipient activity
export const campaignRecipients = pgTable("campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: 'set null' }),
  recipientEmail: text("recipient_email").notNull(),
  recipientFirstName: text("recipient_first_name"),
  recipientLastName: text("recipient_last_name"),
  recipientCompany: text("recipient_company"),
  status: text("status").notNull().default('queued'), // queued, generating, in_review, scheduled, sending, sent, failed_generation, failed_send, bounced
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  repliedAt: timestamp("replied_at"),
  bouncedAt: timestamp("bounced_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  emailContent: text("email_content"),
  emailSubject: text("email_subject"),
  sendgridMessageId: text("sendgrid_message_id"),
  errorMessage: text("error_message"),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  // Lock columns to prevent duplicate processing
  lockedBy: text("locked_by"),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index('idx_campaign_recipients_campaign_id').on(table.campaignId),
  index('idx_campaign_recipients_contact_id').on(table.contactId),
  index('idx_campaign_recipients_email').on(table.recipientEmail),
  index('idx_campaign_recipients_status').on(table.status),
  uniqueIndex('idx_campaign_recipient_unique').on(table.campaignId, table.recipientEmail)
]);

// Search queue tables
export const searchQueues = pgTable("search_queues", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: 'set null' }),
  status: text("status").notNull().default('paused'), // 'active', 'paused', 'completed'
  autoRunEnabled: boolean("auto_run_enabled").default(false),
  autoRunThreshold: integer("auto_run_threshold").default(50), // Run when campaign has < X contacts
  delayBetweenSearches: integer("delay_between_searches").default(30), // Seconds between searches
  resultsPerSearch: integer("results_per_search").default(100),
  continueOnFailure: boolean("continue_on_failure").default(true),
  removeCompletedSearches: boolean("remove_completed_searches").default(false),
  notifyOnComplete: boolean("notify_on_complete").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index('idx_search_queues_user_id').on(table.userId),
  index('idx_search_queues_campaign_id').on(table.campaignId),
  index('idx_search_queues_status').on(table.status)
]);

export const searchQueueItems = pgTable("search_queue_items", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").notNull().references(() => searchQueues.id, { onDelete: 'cascade' }),
  prompt: text("prompt").notNull(),
  order: integer("order").notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'
  searchJobId: integer("search_job_id").references(() => searchJobs.id, { onDelete: 'set null' }),
  listId: integer("list_id").references(() => searchLists.id, { onDelete: 'set null' }),
  resultCount: integer("result_count"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index('idx_search_queue_items_queue_id').on(table.queueId),
  index('idx_search_queue_items_status').on(table.status),
  index('idx_search_queue_items_order').on(table.order),
  uniqueIndex('idx_search_queue_item_order').on(table.queueId, table.order)
]);

// Contact list schemas
const contactListSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional()
});

const contactListMemberSchema = z.object({
  listId: z.number(),
  contactId: z.number(),
  source: z.enum(['manual', 'search_list', 'company', 'bulk']).default('manual'),
  sourceMetadata: z.record(z.unknown()).optional()
});

export const insertContactListSchema = contactListSchema.extend({
  userId: z.number(),
  contactCount: z.number().default(0),
  isDefault: z.boolean().default(false)
});

export const insertContactListMemberSchema = contactListMemberSchema.extend({
  addedBy: z.number().optional()
});

// Contact list types
export type ContactList = typeof contactLists.$inferSelect;
export type InsertContactList = z.infer<typeof insertContactListSchema>;
export type ContactListMember = typeof contactListMembers.$inferSelect;
export type InsertContactListMember = z.infer<typeof insertContactListMemberSchema>;

// Campaign recipient schema
const campaignRecipientSchema = z.object({
  campaignId: z.number(),
  contactId: z.number().optional().nullable(),
  recipientEmail: z.string().email(),
  recipientFirstName: z.string().optional().nullable(),
  recipientLastName: z.string().optional().nullable(),
  recipientCompany: z.string().optional().nullable(),
  status: z.enum(['pending', 'sent', 'bounced', 'failed']).default('pending'),
  emailContent: z.string().optional().nullable(),
  emailSubject: z.string().optional().nullable(),
  sendgridMessageId: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable()
});

export const insertCampaignRecipientSchema = campaignRecipientSchema;

// Campaign recipient types
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertCampaignRecipient = z.infer<typeof insertCampaignRecipientSchema>;

// Search jobs types
export type SearchJob = typeof searchJobs.$inferSelect;
export type InsertSearchJob = z.infer<typeof searchJobSchema> & { userId: number };

// Search queue schemas
const searchQueueSchema = z.object({
  name: z.string().min(1, "Queue name is required"),
  campaignId: z.number().optional().nullable(),
  status: z.enum(['active', 'paused', 'completed']).default('paused'),
  autoRunEnabled: z.boolean().default(false),
  autoRunThreshold: z.number().default(50),
  delayBetweenSearches: z.number().default(30),
  resultsPerSearch: z.number().default(100),
  continueOnFailure: z.boolean().default(true),
  removeCompletedSearches: z.boolean().default(false),
  notifyOnComplete: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional()
});

export const insertSearchQueueSchema = searchQueueSchema.extend({
  userId: z.number()
});

const searchQueueItemSchema = z.object({
  queueId: z.number(),
  prompt: z.string().min(1, "Search prompt is required"),
  order: z.number(),
  status: z.enum(['pending', 'running', 'completed', 'failed']).default('pending'),
  searchJobId: z.number().optional().nullable(),
  listId: z.number().optional().nullable(),
  resultCount: z.number().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
  startedAt: z.date().optional().nullable(),
  completedAt: z.date().optional().nullable(),
  metadata: z.record(z.unknown()).optional()
});

export const insertSearchQueueItemSchema = searchQueueItemSchema;

// Search queue types
export type SearchQueue = typeof searchQueues.$inferSelect;
export type InsertSearchQueue = z.infer<typeof insertSearchQueueSchema>;
export type SearchQueueItem = typeof searchQueueItems.$inferSelect;
export type InsertSearchQueueItem = z.infer<typeof insertSearchQueueItemSchema>;

// OAuth token schemas and types
export const insertOAuthTokenSchema = z.object({
  userId: z.number(),
  service: z.string(),
  email: z.string().email().optional(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  scopes: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional()
});

export type OAuthToken = typeof oauthTokens.$inferSelect;
export type InsertOAuthToken = z.infer<typeof insertOAuthTokenSchema>;

// Access Applications - for stealth landing page code requests (NOT linked to users)
export const accessApplications = pgTable("access_applications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'approved', 'rejected'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_access_applications_email').on(table.email),
  index('idx_access_applications_status').on(table.status),
]);

export const insertAccessApplicationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
});

export type AccessApplication = typeof accessApplications.$inferSelect;
export type InsertAccessApplication = z.infer<typeof insertAccessApplicationSchema>;

// ==========================================
// DRIP EMAIL ENGINE
// ==========================================

// Email Sequences - Define drip campaigns
export const emailSequences = pgTable("email_sequences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Access Application Sequence"
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_email_sequences_active').on(table.isActive)
]);

// Email Sequence Events - Individual emails in a sequence
export const emailSequenceEvents = pgTable("email_sequence_events", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull().references(() => emailSequences.id, { onDelete: 'cascade' }),
  templateKey: text("template_key").notNull(), // e.g., "access_confirmation", "fast_track", "welcome_code"
  eventOrder: integer("event_order").notNull(), // Order in sequence (1, 2, 3...)
  delayHours: integer("delay_hours").notNull().default(0), // Hours after previous event (0 = immediate)
  delayType: text("delay_type").notNull().default('hours'), // 'hours', 'working_days'
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").default({}), // Additional config like subject line overrides
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_email_sequence_events_sequence').on(table.sequenceId),
  index('idx_email_sequence_events_template').on(table.templateKey),
  index('idx_email_sequence_events_order').on(table.sequenceId, table.eventOrder)
]);

// Email Sends - Track all emails sent (ledger)
export const emailSends = pgTable("email_sends", {
  id: serial("id").primaryKey(),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  sequenceId: integer("sequence_id").references(() => emailSequences.id),
  eventId: integer("event_id").references(() => emailSequenceEvents.id),
  templateKey: text("template_key").notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'scheduled', 'sent', 'failed', 'cancelled'
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }), // When to send
  sentAt: timestamp("sent_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  metadata: jsonb("metadata").default({}), // Template variables, tracking info, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_email_sends_recipient').on(table.recipientEmail),
  index('idx_email_sends_status').on(table.status),
  index('idx_email_sends_scheduled').on(table.scheduledFor),
  index('idx_email_sends_sequence').on(table.sequenceId),
  index('idx_email_sends_pending').on(table.status, table.scheduledFor)
]);

// Drip email schemas and types
export const insertEmailSequenceSchema = z.object({
  name: z.string().min(1, "Sequence name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
});

export const insertEmailSequenceEventSchema = z.object({
  sequenceId: z.number(),
  templateKey: z.string().min(1, "Template key is required"),
  eventOrder: z.number().min(1),
  delayHours: z.number().min(0).default(0),
  delayType: z.enum(['hours', 'working_days']).default('hours'),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional()
});

export const insertEmailSendSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  sequenceId: z.number().optional(),
  eventId: z.number().optional(),
  templateKey: z.string(),
  status: z.enum(['pending', 'scheduled', 'sent', 'failed', 'cancelled']).default('pending'),
  scheduledFor: z.date().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = z.infer<typeof insertEmailSequenceSchema>;
export type EmailSequenceEvent = typeof emailSequenceEvents.$inferSelect;
export type InsertEmailSequenceEvent = z.infer<typeof insertEmailSequenceEventSchema>;
export type EmailSend = typeof emailSends.$inferSelect;
export type InsertEmailSend = z.infer<typeof insertEmailSendSchema>;

// Site statistics - tracks global site metrics like player count
export const siteStats = pgTable("site_stats", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: integer("value").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Backward compatibility exports
export const targetCustomerProfiles = customerProfiles;

// Guidance Video schemas and types
export const insertGuidanceVideoSchema = z.object({
  challengeId: z.string().min(1, "Challenge ID is required"),
  questId: z.string().min(1, "Quest ID is required"),
  rawPath: z.string().optional(),
  timestamps: z.array(z.object({
    stepIndex: z.number(),
    timestamp: z.number(),
    action: z.string()
  })).default([]),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  createdBy: z.number().optional()
});

export type GuidanceVideo = typeof guidanceVideos.$inferSelect;
export type InsertGuidanceVideo = z.infer<typeof insertGuidanceVideoSchema>;

// Pricing Promos - manages dynamic pricing configurations and promotions
export const pricingPromos = pgTable("pricing_promos", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // URL parameter code (e.g., "spring-sale", "egg")
  name: text("name").notNull(), // Display name for admin
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0), // Higher = takes precedence
  
  // Schedule configuration
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  daysOfWeek: jsonb("days_of_week").$type<number[]>().default([]), // 0=Sun, 1=Mon, etc. Empty = all days
  
  // Plan visibility
  showFreeTrial: boolean("show_free_trial").notNull().default(true),
  showDuckling: boolean("show_duckling").notNull().default(true),
  showMamaDuck: boolean("show_mama_duck").notNull().default(true),
  
  // Price overrides (null = use default)
  ducklingPrice: real("duckling_price"),
  ducklingCredits: integer("duckling_credits"),
  ducklingBonus: integer("duckling_bonus"),
  mamaDuckPrice: real("mama_duck_price"),
  mamaDuckCredits: integer("mama_duck_credits"),
  mamaDuckBonus: integer("mama_duck_bonus"),
  freeTrialCredits: integer("free_trial_credits"),
  
  // Stripe price IDs for this promo (null = use default)
  ducklingStripePriceId: text("duckling_stripe_price_id"),
  mamaDuckStripePriceId: text("mama_duck_stripe_price_id"),
  
  // Tracking
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_pricing_promos_code').on(table.code),
  index('idx_pricing_promos_active').on(table.isActive),
  index('idx_pricing_promos_priority').on(table.priority)
]);

export const insertPricingPromoSchema = z.object({
  code: z.string().min(1, "Promo code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).default([]),
  showFreeTrial: z.boolean().default(true),
  showDuckling: z.boolean().default(true),
  showMamaDuck: z.boolean().default(true),
  ducklingPrice: z.number().optional(),
  ducklingCredits: z.number().optional(),
  ducklingBonus: z.number().optional(),
  mamaDuckPrice: z.number().optional(),
  mamaDuckCredits: z.number().optional(),
  mamaDuckBonus: z.number().optional(),
  freeTrialCredits: z.number().optional(),
  ducklingStripePriceId: z.string().optional(),
  mamaDuckStripePriceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type PricingPromo = typeof pricingPromos.$inferSelect;
export type InsertPricingPromo = z.infer<typeof insertPricingPromoSchema>;

