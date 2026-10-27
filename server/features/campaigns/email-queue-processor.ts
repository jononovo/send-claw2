import { storage } from "../../storage";
import { db } from "../../db";
import { campaignRecipients, campaigns, communicationHistory, contacts } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { generateEmailContent } from "../email-generation/generator";
import type { Campaign, CampaignRecipient } from "@shared/schema";
import sgMail from '@sendgrid/mail';
import { GmailOAuthService } from '../../gmail-api-service/oauth/service';
import { TokenService } from '../billing/tokens/service';
import { resolveAllMergeFields, buildMergeContext } from '../../lib/merge-field-resolver';

const BATCH_SIZE = 20; // Process 20 recipients at a time
const PROCESSING_INTERVAL = 30000; // Check every 30 seconds (reduced from 10s for efficiency)
const SENDING_INTERVAL = 20000; // Check for emails to send every 20 seconds (reduced from 5s for efficiency)

// Initialize SendGrid (optional, not default)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export class EmailQueueProcessor {
  private isProcessing = false;
  private isSending = false;
  private intervalId: NodeJS.Timeout | null = null;
  private sendingIntervalId: NodeJS.Timeout | null = null;
  private processingCampaigns = new Set<number>();

  /**
   * Check if current time is within autopilot time window
   */
  private isWithinAutopilotWindow(campaign: any): boolean {
    // If autopilot is not enabled, always allow sending
    if (!campaign.autopilotEnabled) {
      return true;
    }

    // If no autopilot settings, allow sending (backward compatibility)
    if (!campaign.autopilotSettings || !campaign.autopilotSettings.days) {
      return true;
    }

    const now = new Date();
    const timezone = campaign.timezone || 'America/New_York';
    
    // Convert current time to campaign timezone
    // Using toLocaleString to get the time in the campaign's timezone
    const campaignTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[campaignTime.getDay()];
    const currentHour = campaignTime.getHours();
    const currentMinute = campaignTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Check if today is enabled
    const daySettings = campaign.autopilotSettings.days[currentDay];
    if (!daySettings || !daySettings.enabled) {
      console.log(`[EmailQueueProcessor] Campaign ${campaign.id}: Autopilot not enabled for ${currentDay}`);
      return false;
    }

    // Parse start and end times
    const [startHour, startMinute] = daySettings.startTime.split(':').map(Number);
    const [endHour, endMinute] = daySettings.endTime.split(':').map(Number);
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    // Check if current time is within window
    const withinWindow = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    
    if (!withinWindow) {
      console.log(`[EmailQueueProcessor] Campaign ${campaign.id}: Outside autopilot window for ${currentDay} (${daySettings.startTime}-${daySettings.endTime})`);
    }
    
    return withinWindow;
  }

  /**
   * Check if campaign has reached daily email limit
   */
  private async hasReachedDailyLimit(campaign: any): Promise<boolean> {
    // If autopilot is not enabled, no daily limit
    if (!campaign.autopilotEnabled) {
      return false;
    }

    // If no max emails per day set, no limit
    if (!campaign.maxEmailsPerDay || campaign.maxEmailsPerDay <= 0) {
      return false;
    }

    const timezone = campaign.timezone || 'America/New_York';
    const now = new Date();
    
    // Get the current date in the campaign's timezone
    // We'll use a simple approach: get the offset and adjust
    // For a more robust solution, consider using a library like date-fns-tz
    const nowString = now.toLocaleString("en-US", { timeZone: timezone });
    const campaignDate = new Date(nowString);
    
    // Create start of day in the campaign's timezone
    const year = campaignDate.getFullYear();
    const month = campaignDate.getMonth();
    const day = campaignDate.getDate();
    
    // Create a new date at start of day
    const startOfDayLocal = new Date(year, month, day, 0, 0, 0, 0);
    
    // For the database query, we'll use the start of today in the server's timezone
    // Since we're comparing UTC timestamps in the DB, we need to be careful
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    
    // Use todayUTC for the SQL query
    const utcStartOfDay = todayUTC;

    // Count emails sent today for this campaign
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaignRecipients)
      .where(
        and(
          eq(campaignRecipients.campaignId, campaign.id),
          eq(campaignRecipients.status, 'sent'),
          sql`${campaignRecipients.updatedAt} >= ${utcStartOfDay}`
        )
      );

    const sentToday = result?.count || 0;
    const hasReachedLimit = sentToday >= campaign.maxEmailsPerDay;
    
    if (hasReachedLimit) {
      console.log(`[EmailQueueProcessor] Campaign ${campaign.id}: Daily limit reached (${sentToday}/${campaign.maxEmailsPerDay})`);
    } else {
      console.log(`[EmailQueueProcessor] Campaign ${campaign.id}: Daily progress (${sentToday}/${campaign.maxEmailsPerDay})`);
    }
    
    return hasReachedLimit;
  }

  /**
   * Start the queue processor
   */
  start(): void {
    if (this.intervalId) {
      console.log("[EmailQueueProcessor] Already running");
      return;
    }

    console.log("[EmailQueueProcessor] Starting email queue processor");
    
    // Start generation processor
    this.intervalId = setInterval(() => {
      this.processNextBatch().catch(error => {
        console.error("[EmailQueueProcessor] Error processing batch:", error);
      });
    }, PROCESSING_INTERVAL);

    // Start sending processor
    this.sendingIntervalId = setInterval(() => {
      this.processScheduledEmails().catch(error => {
        console.error("[EmailQueueProcessor] Error sending emails:", error);
      });
    }, SENDING_INTERVAL);

    // Process immediately on start
    this.processNextBatch();
    this.processScheduledEmails();
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.sendingIntervalId) {
      clearInterval(this.sendingIntervalId);
      this.sendingIntervalId = null;
    }
    console.log("[EmailQueueProcessor] Stopped");
  }

  /**
   * Process the next batch of queued recipients
   */
  async processNextBatch(): Promise<void> {
    if (this.isProcessing) {
      console.log("[EmailQueueProcessor] Already processing, skipping this cycle");
      return;
    }

    this.isProcessing = true;
    
    try {
      // Find campaigns with queued recipients
      const campaignsWithQueued = await db
        .select({
          campaignId: campaignRecipients.campaignId,
          count: sql<number>`count(*)::int`
        })
        .from(campaignRecipients)
        .where(eq(campaignRecipients.status, 'queued'))
        .groupBy(campaignRecipients.campaignId)
        .limit(1);

      if (campaignsWithQueued.length === 0) {
        console.log("[EmailQueueProcessor] No queued recipients found");
        return;
      }

      const campaignToProcess = campaignsWithQueued[0];
      
      // Skip if already processing this campaign
      if (this.processingCampaigns.has(campaignToProcess.campaignId)) {
        console.log(`[EmailQueueProcessor] Campaign ${campaignToProcess.campaignId} already being processed`);
        return;
      }

      console.log(`[EmailQueueProcessor] Processing campaign ${campaignToProcess.campaignId} with ${campaignToProcess.count} queued recipients`);
      this.processingCampaigns.add(campaignToProcess.campaignId);

      try {
        // Get the campaign details
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignToProcess.campaignId))
          .limit(1);

        if (!campaign) {
          console.error(`[EmailQueueProcessor] Campaign ${campaignToProcess.campaignId} not found`);
          return;
        }

        // Get next batch of queued recipients
        const recipients = await db
          .select()
          .from(campaignRecipients)
          .where(
            and(
              eq(campaignRecipients.campaignId, campaignToProcess.campaignId),
              eq(campaignRecipients.status, 'queued')
            )
          )
          .limit(BATCH_SIZE);

        if (recipients.length === 0) {
          console.log(`[EmailQueueProcessor] No recipients to process for campaign ${campaignToProcess.campaignId}`);
          return;
        }

        console.log(`[EmailQueueProcessor] Processing batch of ${recipients.length} recipients`);

        // Mark recipients as generating
        const recipientIds = recipients.map(r => r.id);
        await db
          .update(campaignRecipients)
          .set({ 
            status: 'generating',
            updatedAt: new Date()
          })
          .where(
            and(
              eq(campaignRecipients.campaignId, campaignToProcess.campaignId),
              inArray(campaignRecipients.id, recipientIds)
            )
          );

        // Process each recipient
        const results = await Promise.allSettled(
          recipients.map(recipient => this.generateEmailForRecipient(campaign, recipient))
        );

        // Update statuses based on results
        const successful: number[] = [];
        const failed: number[] = [];

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successful.push(recipients[index].id);
          } else {
            failed.push(recipients[index].id);
            console.error(`[EmailQueueProcessor] Failed to generate email for recipient ${recipients[index].id}:`, result.reason);
          }
        });

        // Update successful recipients based on human review requirement
        if (successful.length > 0) {
          // Check if campaign requires human review
          const targetStatus = campaign.requiresHumanReview ? 'in_review' : 'scheduled';
          
          await db
            .update(campaignRecipients)
            .set({ 
              status: targetStatus,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(campaignRecipients.campaignId, campaignToProcess.campaignId),
                inArray(campaignRecipients.id, successful)
              )
            );
          console.log(`[EmailQueueProcessor] Generated emails for ${successful.length} recipients (status: ${targetStatus})`);
        }

        // Update failed recipients
        if (failed.length > 0) {
          await db
            .update(campaignRecipients)
            .set({ 
              status: 'failed_generation',
              errorMessage: 'Email generation failed',
              updatedAt: new Date()
            })
            .where(
              and(
                eq(campaignRecipients.campaignId, campaignToProcess.campaignId),
                inArray(campaignRecipients.id, failed)
              )
            );
          console.log(`[EmailQueueProcessor] Failed to generate emails for ${failed.length} recipients`);
        }

      } finally {
        this.processingCampaigns.delete(campaignToProcess.campaignId);
      }

    } catch (error) {
      console.error("[EmailQueueProcessor] Error in processNextBatch:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate email content for a single recipient
   */
  private async generateEmailForRecipient(
    campaign: Campaign,
    recipient: CampaignRecipient
  ): Promise<void> {
    try {
      let emailContent: string;
      let emailSubject: string;

      // Check if campaign uses AI mode or template mode
      if (campaign.generationType === 'ai' && campaign.prompt) {
        // AI mode: generate content using the prompt with merge fields
        const mergeFields = {
          first_name: recipient.recipientFirstName || '',
          last_name: recipient.recipientLastName || '',
          contact_company_name: recipient.recipientCompany || '',
          contact_email: recipient.recipientEmail
        };

        // Look up sender profile for AI context
        let senderProfileContext = undefined;
        if (campaign.senderProfileId) {
          const senderProfile = await storage.getSenderProfile(campaign.senderProfileId, campaign.userId);
          if (senderProfile) {
            senderProfileContext = {
              displayName: senderProfile.displayName || undefined,
              companyName: senderProfile.companyName || undefined,
              title: senderProfile.title || undefined,
              email: senderProfile.email || undefined
            };
          }
        }

        // Look up contact for recipient context (role/title and company description)
        let recipientContext = undefined;
        if (recipient.contactId) {
          const contact = await storage.getContact(recipient.contactId, campaign.userId);
          if (contact) {
            let companyDescription = undefined;
            
            // Look up company for description if contact has companyId
            if (contact.companyId) {
              const company = await storage.getCompany(contact.companyId, campaign.userId);
              if (company?.description) {
                companyDescription = company.description;
              }
            }
            
            // Only create context if we have role or company description
            if (contact.role || companyDescription) {
              recipientContext = {
                role: contact.role || undefined,
                companyDescription: companyDescription
              };
            }
          }
        }

        const generated = await generateEmailContent({
          prompt: campaign.prompt,
          mergeFields,
          campaignName: campaign.name,
          senderProfile: senderProfileContext,
          recipientContext: recipientContext
        });

        emailContent = generated.body;
        emailSubject = generated.subject;

      } else {
        // Template mode: use the campaign's template with merge field replacement
        emailContent = this.replaceMergeFields(
          campaign.body || '',
          {
            first_name: recipient.recipientFirstName || '',
            last_name: recipient.recipientLastName || '',
            contact_company_name: recipient.recipientCompany || '',
            contact_email: recipient.recipientEmail
          }
        );

        emailSubject = this.replaceMergeFields(
          campaign.subject || '',
          {
            first_name: recipient.recipientFirstName || '',
            last_name: recipient.recipientLastName || '',
            contact_company_name: recipient.recipientCompany || '',
            contact_email: recipient.recipientEmail
          }
        );
      }

      // Save generated content to recipient record
      await db
        .update(campaignRecipients)
        .set({
          emailContent,
          emailSubject,
          updatedAt: new Date()
        })
        .where(eq(campaignRecipients.id, recipient.id));

    } catch (error) {
      console.error(`[EmailQueueProcessor] Error generating email for recipient ${recipient.id}:`, error);
      throw error;
    }
  }

  /**
   * Replace merge fields in template content
   */
  private replaceMergeFields(template: string, fields: Record<string, string>): string {
    let result = template;
    
    // Replace {{field_name}} patterns
    Object.entries(fields).forEach(([key, value]) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(pattern, value);
    });

    return result;
  }

  /**
   * Approve a batch of emails for sending
   */
  async approveBatch(campaignId: number, recipientIds: number[]): Promise<void> {
    await db
      .update(campaignRecipients)
      .set({
        status: 'scheduled',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.status, 'in_review'),
          inArray(campaignRecipients.id, recipientIds)
        )
      );

    console.log(`[EmailQueueProcessor] Approved ${recipientIds.length} emails for sending`);
  }

  /**
   * Reject a batch of emails (mark for regeneration)
   */
  async rejectBatch(campaignId: number, recipientIds: number[]): Promise<void> {
    await db
      .update(campaignRecipients)
      .set({
        status: 'queued', // Back to queue for regeneration
        emailContent: null,
        emailSubject: null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.status, 'in_review'),
          inArray(campaignRecipients.id, recipientIds)
        )
      );

    console.log(`[EmailQueueProcessor] Rejected ${recipientIds.length} emails for regeneration`);
  }

  /**
   * Process scheduled emails for sending
   */
  async processScheduledEmails(): Promise<void> {
    if (this.isSending) {
      console.log('[EmailQueueProcessor] RACE-CHECK: Already sending, skipping cycle');
      return;
    }

    this.isSending = true;
    const processId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const instanceId = `instance-${processId}`;
    console.log(`[EmailQueueProcessor] PROCESS-START: ${processId} at ${new Date().toISOString()}`);

    try {
      // First, clean up stale locks (older than 5 minutes)
      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
      await db
        .update(campaignRecipients)
        .set({
          status: 'scheduled',
          lockedBy: null,
          lockedAt: null
        })
        .where(
          and(
            eq(campaignRecipients.status, 'sending'),
            sql`${campaignRecipients.lockedAt} < ${staleThreshold}`
          )
        );
      
      // Atomically claim recipients for sending using SELECT FOR UPDATE SKIP LOCKED
      const claimedRecipients = await db.transaction(async (tx) => {
        // Select and lock recipients atomically
        const toClaimQuery = sql<{
          id: number;
          campaign_id: number;
          contact_id: number | null;
          recipient_email: string;
          recipient_first_name: string | null;
          recipient_last_name: string | null;
          recipient_company: string | null;
          email_subject: string | null;
          email_content: string | null;
          user_id: number;
          sender_profile_id: number | null;
          delay_between_emails: number | null;
          autopilot_enabled: boolean | null;
          autopilot_settings: any;
          max_emails_per_day: number | null;
          timezone: string | null;
        }>`
          SELECT 
            cr.id,
            cr.campaign_id,
            cr.contact_id,
            cr.recipient_email,
            cr.recipient_first_name,
            cr.recipient_last_name,
            cr.recipient_company,
            cr.email_subject,
            cr.email_content,
            c.user_id,
            c.sender_profile_id,
            c.delay_between_emails,
            c.autopilot_enabled,
            c.autopilot_settings,
            c.max_emails_per_day,
            c.timezone
          FROM campaign_recipients cr
          INNER JOIN campaigns c ON cr.campaign_id = c.id
          WHERE cr.status = 'scheduled'
            AND c.status = 'active'
            AND (cr.locked_by IS NULL OR cr.locked_at < ${staleThreshold})
          LIMIT 10
          FOR UPDATE OF cr SKIP LOCKED
        `;
        
        const result = await tx.execute(toClaimQuery);
        const toClaim = result.rows as any[];
        
        if (toClaim.length === 0) {
          return [];
        }
        
        // Mark claimed recipients as being sent with lock info
        const claimedIds = toClaim.map((r: any) => r.id as number);
        await tx.execute(sql`
          UPDATE campaign_recipients
          SET status = 'sending',
              locked_by = ${instanceId},
              locked_at = ${new Date()}
          WHERE id = ANY(ARRAY[${sql.raw(claimedIds.join(','))}]::int[])
        `);
        
        console.log(`[EmailQueueProcessor] ATOMICALLY-CLAIMED: ${toClaim.length} recipients with instanceId ${instanceId}`);
        
        // Transform to expected format
        return toClaim.map((r: any) => ({
          id: r.id as number,
          campaignId: r.campaign_id as number,
          contactId: r.contact_id as number | null,
          userId: r.user_id as number,
          senderProfileId: r.sender_profile_id as number | null,
          recipientEmail: r.recipient_email as string,
          recipientFirstName: r.recipient_first_name as string | null,
          recipientLastName: r.recipient_last_name as string | null,
          recipientCompany: r.recipient_company as string | null,
          emailSubject: r.email_subject as string | null,
          emailContent: r.email_content as string | null,
          delayBetweenEmails: r.delay_between_emails as number | null,
          autopilotEnabled: r.autopilot_enabled as boolean | null,
          autopilotSettings: r.autopilot_settings,
          maxEmailsPerDay: r.max_emails_per_day as number | null,
          timezone: r.timezone as string | null
        }));
      });
      
      const scheduledRecipients = claimedRecipients;

      if (scheduledRecipients.length === 0) {
        return;
      }

      console.log(`[EmailQueueProcessor] Processing ${scheduledRecipients.length} scheduled emails`);

      // Group recipients by user to check their Gmail auth status
      const recipientsByUser = scheduledRecipients.reduce((acc, recipient) => {
        if (!acc[recipient.userId]) {
          acc[recipient.userId] = [];
        }
        acc[recipient.userId].push(recipient);
        return acc;
      }, {} as Record<number, typeof scheduledRecipients>);

      // Process each user's recipients
      for (const [userId, allUserRecipients] of Object.entries(recipientsByUser)) {
        const userIdNum = parseInt(userId);
        
        // Check if user has Gmail connected
        const hasGmailAuth = await TokenService.hasValidGmailAuth(userIdNum);
        
        if (!hasGmailAuth) {
          console.log(`[EmailQueueProcessor] User ${userIdNum} doesn't have Gmail connected, marking emails for manual send`);
          
          // Mark these emails as requiring manual send
          await db
            .update(campaignRecipients)
            .set({
              status: 'manual_send_required',
              errorMessage: 'Gmail not connected - manual send required',
              updatedAt: new Date()
            })
            .where(
              inArray(campaignRecipients.id, allUserRecipients.map(r => r.id))
            );
          
          continue;
        }

        // Group recipients by campaign to check autopilot settings per campaign
        const recipientsByCampaign = allUserRecipients.reduce((acc, recipient) => {
          if (!acc[recipient.campaignId]) {
            acc[recipient.campaignId] = [];
          }
          acc[recipient.campaignId].push(recipient);
          return acc;
        }, {} as Record<number, typeof allUserRecipients>);

        // Process each campaign's recipients separately
        for (const [campaignId, userRecipients] of Object.entries(recipientsByCampaign)) {
          const campaignIdNum = parseInt(campaignId);
          const firstRecipient = userRecipients[0];
          
          // Create a campaign object with the autopilot settings
          const campaignSettings = {
            id: campaignIdNum,
            autopilotEnabled: firstRecipient.autopilotEnabled,
            autopilotSettings: firstRecipient.autopilotSettings,
            maxEmailsPerDay: firstRecipient.maxEmailsPerDay,
            timezone: firstRecipient.timezone
          };

          // Check if we're within autopilot time window
          if (!this.isWithinAutopilotWindow(campaignSettings)) {
            console.log(`[EmailQueueProcessor] Campaign ${campaignIdNum}: Outside autopilot window, skipping batch`);
            continue; // Skip this campaign's recipients for now
          }

          // We'll check daily limits inside the loop for each email
          let recipientsToProcess = userRecipients;

          // Continue with the existing processing logic for this campaign's recipients
          
          // Get user info for sending
          const user = await storage.getUserById(userIdNum);
          if (!user) {
            console.error(`[EmailQueueProcessor] User ${userIdNum} not found`);
            continue;
          }

          // Get the sender profile for the campaign (if specified)
          let senderProfile = null;
          const campaignSenderProfileId = userRecipients[0].senderProfileId; // All recipients in this group have same campaign
          
          if (campaignSenderProfileId) {
            senderProfile = await storage.getSenderProfile(campaignSenderProfileId, userIdNum);
            if (!senderProfile) {
              console.warn(`[EmailQueueProcessor] Sender profile ${campaignSenderProfileId} not found, using default`);
            }
          }
          
          // If no sender profile, try to get the default one for the user
          if (!senderProfile) {
            const userProfiles = await storage.listSenderProfiles(userIdNum);
            senderProfile = userProfiles.find(p => p.isDefault) || userProfiles[0];
          }
          
          // Process each email for this user SEQUENTIALLY with delays
          const results: Array<{ success: boolean; recipientId?: number; error?: any }> = [];
          
          // Get delay setting (default to 30 seconds if not set, convert minutes to milliseconds)
          const delayBetweenEmails = (userRecipients[0].delayBetweenEmails || 0.5) * 60 * 1000;
          console.log(`[EmailQueueProcessor] Using delay of ${delayBetweenEmails / 1000} seconds between emails`);
        
          // Query the database ONCE to get baseline count of emails sent today
          let baselineSentToday = 0;
          if (campaignSettings.maxEmailsPerDay && campaignSettings.maxEmailsPerDay > 0) {
            const todayUTC = new Date();
            todayUTC.setUTCHours(0, 0, 0, 0);
            
            const [result] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(campaignRecipients)
              .where(
                and(
                  eq(campaignRecipients.campaignId, campaignIdNum),
                  eq(campaignRecipients.status, 'sent'),
                  sql`${campaignRecipients.updatedAt} >= ${todayUTC}`
                )
              );
            
            baselineSentToday = result?.count || 0;
            console.log(`[EmailQueueProcessor] Campaign ${campaignIdNum}: Starting with ${baselineSentToday}/${campaignSettings.maxEmailsPerDay} emails already sent today`);
          }
        
          // Track emails sent in this batch to add to baseline count
          let emailsSentInThisBatch = 0;
        
          for (let i = 0; i < recipientsToProcess.length; i++) {
            const recipient = recipientsToProcess[i];
            
            // Check daily limit BEFORE sending each email (using baseline + batch counter)
            if (campaignSettings.maxEmailsPerDay && campaignSettings.maxEmailsPerDay > 0) {
              const totalSentToday = baselineSentToday + emailsSentInThisBatch;
              
              if (totalSentToday >= campaignSettings.maxEmailsPerDay) {
                console.log(`[EmailQueueProcessor] Campaign ${campaignIdNum}: Daily limit reached (${totalSentToday}/${campaignSettings.maxEmailsPerDay}). Stopping batch processing.`);
                console.log(`[EmailQueueProcessor] ${recipientsToProcess.length - i} emails remaining in scheduled status for next processing cycle.`);
                break; // Exit the loop, leaving remaining emails in 'scheduled' status
              }
              
              const remainingAllowance = campaignSettings.maxEmailsPerDay - totalSentToday;
              console.log(`[EmailQueueProcessor] Campaign ${campaignIdNum}: Sending email ${i + 1}/${recipientsToProcess.length}. Daily progress: ${totalSentToday}/${campaignSettings.maxEmailsPerDay}, remaining today: ${remainingAllowance}`);
            }
            
            try {
              // Build merge context for this recipient
              const recipientData = {
              email: recipient.recipientEmail,
              firstName: recipient.recipientFirstName || undefined,
              lastName: recipient.recipientLastName || undefined,
              name: `${recipient.recipientFirstName || ''} ${recipient.recipientLastName || ''}`.trim() || undefined,
              company: recipient.recipientCompany || undefined,
              title: undefined // Not available in current schema
            };
            
            // Use sender profile data or fall back to user data
            let senderData;
            if (senderProfile) {
              // Parse the display name to get first and last name
              const senderNameParts = senderProfile.displayName?.split(' ') || [];
              senderData = {
                email: senderProfile.email,
                firstName: senderNameParts[0] || undefined,
                lastName: senderNameParts.slice(1).join(' ') || undefined,
                name: senderProfile.displayName || undefined,
                company: senderProfile.companyName || undefined
              };
            } else {
              // Fallback to parsing username if no sender profile
              const senderNameParts = user.username?.split(' ') || [];
              senderData = {
                email: user.email,
                firstName: senderNameParts[0] || undefined,
                lastName: senderNameParts.slice(1).join(' ') || undefined,
                name: user.username || undefined,
                company: undefined // No default company
              };
            }
            
            // Build the merge context
            const mergeContext = buildMergeContext(recipientData, senderData);
            
            // Resolve merge fields in both subject and content
            const resolvedSubject = resolveAllMergeFields(
              recipient.emailSubject || 'No subject',
              mergeContext
            );
            const resolvedContent = resolveAllMergeFields(
              recipient.emailContent || 'No content',
              mergeContext
            );
            
            // Debug log: Track each send attempt
            console.log(`[EmailQueueProcessor] SENDING: Campaign ${recipient.campaignId}, Email ${i + 1}/${recipientsToProcess.length} to ${recipient.recipientEmail}`);
            
            // Send email via Gmail with resolved content and custom sender name
            const gmailResult = await GmailOAuthService.sendEmail(
              userIdNum,
              user.email,
              recipient.recipientEmail,
              resolvedSubject,
              resolvedContent,
              senderProfile?.displayName  // Pass custom sender display name if available
            );

            // Log Gmail success with message ID for tracking
            console.log(`[EmailQueueProcessor] GMAIL-SUCCESS: Campaign ${recipient.campaignId}, Recipient ${recipient.recipientEmail}, MessageId: ${gmailResult?.messageId || 'N/A'}`);

            // Always log to communication history (not conditional on contactId)
            // This is critical for preventing duplicates and maintaining audit trail
            try {
              // Debug: Ensure userIdNum is valid
              console.log(`[EmailQueueProcessor] DEBUG: userIdNum=${userIdNum}, type=${typeof userIdNum}, recipient.userId=${recipient.userId}`);
              
              // Use recipient.userId if userIdNum is somehow undefined
              const effectiveUserId = userIdNum || recipient.userId;

              const [recipientContact] = recipient.contactId
                ? await db.select({ companyId: contacts.companyId }).from(contacts).where(eq(contacts.id, recipient.contactId)).limit(1)
                : [];

              await db.insert(communicationHistory).values({
                userId: effectiveUserId,
                contactId: recipient.contactId || 1,  // Default to 1 if no contactId (temporary workaround)
                companyId: recipientContact?.companyId ?? 1,  // 1 only when the recipient has no contact or company (column is NOT NULL)
                campaignId: recipient.campaignId,
                channel: 'email',
                direction: 'outbound',
                status: 'sent',
                subject: resolvedSubject,
                content: resolvedContent?.substring(0, 500) || 'Campaign email', // Store first 500 chars for reference
                contentPreview: resolvedContent?.substring(0, 200) || 'Campaign email',
                sentAt: new Date(),
                metadata: {
                  gmailMessageId: gmailResult?.messageId || null,
                  gmailThreadId: gmailResult?.threadId || null,
                  recipientEmail: recipient.recipientEmail || null,
                  recipientName: `${recipient.recipientFirstName || ''} ${recipient.recipientLastName || ''}`.trim() || null,
                  recipientCompany: recipient.recipientCompany || null,
                  campaignRecipientId: recipient.id || null,
                  sentBy: 'EmailQueueProcessor',
                  processId: processId
                },
                createdAt: new Date(),
                updatedAt: new Date()
              });
              console.log(`[EmailQueueProcessor] HISTORY-LOGGED: Campaign ${recipient.campaignId}, Recipient ${recipient.recipientEmail}`);
            } catch (historyError) {
              // Log error but don't fail the send - email was already sent successfully
              console.error(`[EmailQueueProcessor] WARNING: Failed to log to communication_history for ${recipient.recipientEmail}:`, historyError);
            }

            // Update status to sent and clear lock
            await db
              .update(campaignRecipients)
              .set({
                status: 'sent',
                sentAt: new Date(),
                updatedAt: new Date(),
                lockedBy: null,
                lockedAt: null
              })
              .where(eq(campaignRecipients.id, recipient.id));

            console.log(`[EmailQueueProcessor] SEND-COMPLETE: Campaign ${recipient.campaignId}, Recipient ${recipient.recipientEmail} marked as sent`);
            results.push({ success: true, recipientId: recipient.id });
            
            // Increment the batch counter for daily limit tracking
            emailsSentInThisBatch++;
            
            // Add delay between emails (except after the last one)
            if (i < recipientsToProcess.length - 1 && delayBetweenEmails > 0) {
              console.log(`[EmailQueueProcessor] Email sent. Waiting ${delayBetweenEmails / 1000} seconds before next email...`);
              await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
            }
            
            } catch (error: any) {
              console.error(`[EmailQueueProcessor] Failed to send email to ${recipient.recipientEmail}:`, error);
              
              // Check if it's an auth error
              if (error.status === 401) {
                // Mark as manual send required and clear lock
                await db
                  .update(campaignRecipients)
                  .set({
                    status: 'manual_send_required',
                    errorMessage: 'Gmail authentication expired - manual send required',
                    updatedAt: new Date(),
                    lockedBy: null,
                    lockedAt: null
                  })
                  .where(eq(campaignRecipients.id, recipient.id));
              } else {
                // Update status to failed_send and clear lock
                await db
                  .update(campaignRecipients)
                  .set({
                    status: 'failed_send',
                    errorMessage: error instanceof Error ? error.message : 'Send failed',
                    updatedAt: new Date(),
                    lockedBy: null,
                    lockedAt: null
                  })
                  .where(eq(campaignRecipients.id, recipient.id));
              }
              
              results.push({ success: false, recipientId: recipient.id, error });
            }
          }

          // Log results for this campaign
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          if (successful > 0) {
            console.log(`[EmailQueueProcessor] Successfully sent ${successful} emails for user ${userIdNum}`);
            
            // Check if all emails in the campaign have been sent
            const campaignStats = await db
              .select({
                totalRecipients: sql<number>`count(*)::int`,
                sentCount: sql<number>`sum(case when status = 'sent' then 1 else 0 end)::int`,
                failedCount: sql<number>`sum(case when status in ('failed_send', 'failed_generation', 'manual_send_required') then 1 else 0 end)::int`
              })
              .from(campaignRecipients)
              .where(eq(campaignRecipients.campaignId, campaignIdNum));
            
            if (campaignStats[0]) {
              const { totalRecipients, sentCount, failedCount } = campaignStats[0];
              const processedCount = sentCount + failedCount;
              
              // If all recipients have been processed (either sent or failed)
              if (processedCount >= totalRecipients) {
                console.log(`[EmailQueueProcessor] Campaign ${campaignIdNum} completed: ${sentCount} sent, ${failedCount} failed out of ${totalRecipients} total`);
                
                // Mark the campaign as completed
                await db
                  .update(campaigns)
                  .set({
                    status: 'completed',
                    updatedAt: new Date()
                  })
                  .where(eq(campaigns.id, campaignIdNum));
                
                console.log(`[EmailQueueProcessor] Campaign ${campaignIdNum} marked as completed`);
              }
            }
          }
          if (failed > 0) {
            console.log(`[EmailQueueProcessor] Failed to send ${failed} emails for user ${userIdNum}`);
          }
        }
      }

    } catch (error) {
      console.error("[EmailQueueProcessor] Error in processScheduledEmails:", error);
    } finally {
      this.isSending = false;
    }
  }
}

// Create singleton instance
export const emailQueueProcessor = new EmailQueueProcessor();