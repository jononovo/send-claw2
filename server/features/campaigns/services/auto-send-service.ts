import { db } from '../../../db';
import { 
  campaigns, 
  emailTemplates, 
  contactListMembers, 
  contacts, 
  companies,
  communicationHistory,
  users,
  emailSuppressions
} from '@shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';
import { resolveAllMergeFields } from '../../../lib/merge-field-resolver.js';
import { generateEmailContent } from '../../../email-content-generation/service.js';

class AutoSendCampaignService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Process campaigns that don't require human review
   * This will be called by the scheduler to automatically send emails (AI-generated or template-based)
   */
  async processAutoSendCampaigns() {
    try {
      console.log('[AutoSendCampaign] Starting auto-send campaign processing');
      
      // Find all active campaigns that don't require human review
      // They can either have a template (merge_field mode) or use AI generation
      const autoSendCampaigns = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.status, 'active'),
            eq(campaigns.requiresHumanReview, false)
          )
        );
      
      console.log(`[AutoSendCampaign] Found ${autoSendCampaigns.length} auto-send campaigns`);
      
      for (const campaign of autoSendCampaigns) {
        await this.processCampaign(campaign);
      }
      
    } catch (error) {
      console.error('[AutoSendCampaign] Error processing auto-send campaigns:', error);
      throw error;
    }
  }

  /**
   * Process a single campaign - send emails based on daily limits and scheduling
   */
  async processCampaign(campaign: any) {
    try {
      console.log(`[AutoSendCampaign] Processing campaign ${campaign.id}: ${campaign.name} (${campaign.generationType || 'merge_field'} mode)`);
      
      // Get the email template for merge_field mode
      let template = null;
      if (campaign.generationType === 'merge_field' || !campaign.generationType) {
        // Default to merge_field for backward compatibility
        if (!campaign.emailTemplateId) {
          console.error(`[AutoSendCampaign] Campaign ${campaign.id} in merge_field mode has no template`);
          return;
        }
        
        const [templateResult] = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, campaign.emailTemplateId));
        
        if (!templateResult) {
          console.error(`[AutoSendCampaign] Template ${campaign.emailTemplateId} not found`);
          return;
        }
        template = templateResult;
      } else if (campaign.generationType === 'ai_unique') {
        // For AI unique mode, we'll generate emails individually
        if (!campaign.prompt) {
          console.error(`[AutoSendCampaign] Campaign ${campaign.id} in AI mode has no prompt`);
          return;
        }
      }
      
      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, campaign.userId));
      
      if (!user) {
        console.error(`[AutoSendCampaign] User ${campaign.userId} not found`);
        return;
      }
      
      // Get today's email count for this campaign
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(communicationHistory)
        .where(
          and(
            eq(communicationHistory.userId, campaign.userId),
            eq(communicationHistory.campaignId, campaign.id),
            sql`${communicationHistory.sentAt} >= ${todayStart}`
          )
        );
      
      const sentToday = countResult?.count || 0;
      const maxPerDay = campaign.maxEmailsPerDay || 20;
      const remainingToday = Math.max(0, maxPerDay - sentToday);
      
      if (remainingToday === 0) {
        console.log(`[AutoSendCampaign] Campaign ${campaign.id} reached daily limit (${maxPerDay})`);
        return;
      }
      
      console.log(`[AutoSendCampaign] Campaign ${campaign.id}: ${sentToday}/${maxPerDay} sent today, sending up to ${remainingToday} more`);
      
      // Get contacts from the campaign's list who haven't been contacted yet
      const uncontactedRecipients = await this.getUncontactedRecipients(
        campaign.contactListId,
        campaign.userId,
        campaign.id,
        remainingToday
      );
      
      console.log(`[AutoSendCampaign] Found ${uncontactedRecipients.length} uncontacted recipients`);
      
      // Send emails with spacing based on campaign settings
      const delayBetweenEmails = (campaign.delayBetweenEmails || 30) * 1000; // Convert to milliseconds
      
      for (let i = 0; i < uncontactedRecipients.length; i++) {
        const recipient = uncontactedRecipients[i];
        
        // Add delay between emails (except for the first one)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
        }
        
        // Send email based on generation type
        if (campaign.generationType === 'ai_unique') {
          await this.sendAIGeneratedEmail(
            recipient.contact,
            recipient.company,
            user,
            campaign
          );
        } else {
          await this.sendTemplateEmail(
            template,
            recipient.contact,
            recipient.company,
            user,
            campaign
          );
        }
      }
      
      console.log(`[AutoSendCampaign] Sent ${uncontactedRecipients.length} emails for campaign ${campaign.id}`);
      
    } catch (error) {
      console.error(`[AutoSendCampaign] Error processing campaign ${campaign.id}:`, error);
    }
  }

  /**
   * Get uncontacted recipients from a campaign's list
   */
  async getUncontactedRecipients(
    listId: number,
    userId: number,
    campaignId: number,
    limit: number
  ) {
    // Get contacts from the list who haven't been contacted in this campaign
    // and whose email is not in the global suppression list
    const recipients = await db
      .select({
        contact: contacts,
        company: companies
      })
      .from(contactListMembers)
      .innerJoin(contacts, eq(contacts.id, contactListMembers.contactId))
      .innerJoin(companies, eq(companies.id, contacts.companyId))
      .leftJoin(
        communicationHistory,
        and(
          eq(communicationHistory.contactId, contacts.id),
          eq(communicationHistory.campaignId, campaignId)
        )
      )
      .leftJoin(
        emailSuppressions,
        eq(emailSuppressions.email, contacts.email)
      )
      .where(
        and(
          eq(contactListMembers.listId, listId),
          sql`${communicationHistory.id} IS NULL`,
          sql`${contacts.email} IS NOT NULL AND ${contacts.email} != ''`,
          sql`${emailSuppressions.id} IS NULL`
        )
      )
      .limit(limit);
    
    return recipients;
  }

  /**
   * Send an AI-generated unique email for each recipient
   */
  async sendAIGeneratedEmail(
    contact: any,
    company: any,
    user: any,
    campaign: any
  ) {
    try {
      // Generate unique email content for this contact
      const emailContent = await generateEmailContent({
        emailPrompt: campaign.prompt || '',
        contact,
        company,
        userId: user.id,
        tone: campaign.tone || 'casual',
        offerStrategy: campaign.offerType || 'none',
        generateTemplate: false // We want personalized content, not a template
      });
      
      // Send via SendGrid
      const msg = {
        to: contact.email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'outreach@5ducks.com',
          name: user.username || '5Ducks'
        },
        subject: emailContent.subject,
        html: emailContent.content,
        text: emailContent.content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: campaign.trackEmails || true }
        },
        customArgs: {
          campaignId: campaign.id.toString(),
          contactId: contact.id.toString(),
          userId: user.id.toString()
        }
      };
      
      if (campaign.unsubscribeLink) {
        // Add unsubscribe link if enabled
        msg.html += `<br><br><p style="font-size: 12px; color: #666;">
          <a href="${process.env.APP_URL || 'https://app.5ducks.com'}/unsubscribe?token=${Buffer.from(`${contact.id}:${campaign.id}`).toString('base64')}">
            Unsubscribe from these emails
          </a>
        </p>`;
      }
      
      await sgMail.send(msg);
      
      // Record in communication history
      await db.insert(communicationHistory).values({
        userId: user.id,
        contactId: contact.id,
        companyId: company.id,
        channel: 'email',
        direction: 'outbound',
        subject: emailContent.subject,
        content: emailContent.content,
        status: 'sent',
        sentAt: new Date(),
        campaignId: campaign.id,
        metadata: {
          from: msg.from.email,
          to: contact.email,
          campaignName: campaign.name,
          generationType: 'ai_unique'
        }
      });
      
      // Update contact status
      await db
        .update(contacts)
        .set({
          contactStatus: 'contacted',
          totalCommunications: sql`COALESCE(${contacts.totalCommunications}, 0) + 1`,
          lastContactedAt: new Date()
        })
        .where(eq(contacts.id, contact.id));
      
      console.log(`[AutoSendCampaign] AI-generated email sent to ${contact.email} for campaign ${campaign.name}`);
      
    } catch (error) {
      console.error(`[AutoSendCampaign] Error sending AI email to ${contact.email}:`, error);
      
      // Record the error in communication history
      await db.insert(communicationHistory).values({
        userId: user.id,
        contactId: contact.id,
        companyId: company.id,
        channel: 'email',
        direction: 'outbound',
        subject: campaign.subject || 'Email',
        content: campaign.prompt || '',
        status: 'failed',
        campaignId: campaign.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          from: process.env.SENDGRID_FROM_EMAIL || 'outreach@5ducks.com',
          to: contact.email,
          error: error instanceof Error ? error.message : 'Unknown error',
          generationType: 'ai_unique'
        }
      });
    }
  }

  /**
   * Send a template-based email with merge fields resolved
   */
  async sendTemplateEmail(
    template: any,
    contact: any,
    company: any,
    user: any,
    campaign: any
  ) {
    try {
      // Prepare merge field context
      // Note: senderNames removed - sender fields are no longer merge fields
      const mergeContext = {
        contact,
        company,
        user
      };
      
      // Resolve merge fields in subject and body
      const resolvedSubject = resolveAllMergeFields(template.subject || '', mergeContext);
      const resolvedBody = resolveAllMergeFields(template.body || '', mergeContext);
      
      // Send via SendGrid
      const msg = {
        to: contact.email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'outreach@5ducks.com',
          name: user.username || '5Ducks'
        },
        subject: resolvedSubject,
        html: resolvedBody,
        text: resolvedBody.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: campaign.trackEmails || true }
        },
        customArgs: {
          campaignId: campaign.id.toString(),
          contactId: contact.id.toString(),
          userId: user.id.toString()
        }
      };
      
      if (campaign.unsubscribeLink) {
        // Add unsubscribe link if enabled
        msg.html += `<br><br><p style="font-size: 12px; color: #666;">
          <a href="${process.env.APP_URL || 'https://app.5ducks.com'}/unsubscribe?token=${Buffer.from(`${contact.id}:${campaign.id}`).toString('base64')}">
            Unsubscribe from these emails
          </a>
        </p>`;
      }
      
      await sgMail.send(msg);
      
      // Record in communication history
      await db.insert(communicationHistory).values({
        userId: user.id,
        contactId: contact.id,
        companyId: company.id,
        channel: 'email',
        direction: 'outbound',
        subject: resolvedSubject,
        content: resolvedBody,
        status: 'sent',
        sentAt: new Date(),
        campaignId: campaign.id,
        templateId: template.id,
        metadata: {
          from: msg.from.email,
          to: contact.email,
          campaignName: campaign.name,
          templateName: template.name
        }
      });
      
      // Update contact status
      await db
        .update(contacts)
        .set({
          contactStatus: 'contacted',
          totalCommunications: sql`COALESCE(${contacts.totalCommunications}, 0) + 1`,
          lastContactedAt: new Date()
        })
        .where(eq(contacts.id, contact.id));
      
      console.log(`[AutoSendCampaign] Email sent to ${contact.email} for campaign ${campaign.name}`);
      
    } catch (error) {
      console.error(`[AutoSendCampaign] Error sending email to ${contact.email}:`, error);
      
      // Record the error in communication history
      await db.insert(communicationHistory).values({
        userId: user.id,
        contactId: contact.id,
        companyId: company.id,
        channel: 'email',
        direction: 'outbound',
        subject: template.subject,
        content: template.body,
        status: 'failed',
        campaignId: campaign.id,
        templateId: template.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          from: process.env.SENDGRID_FROM_EMAIL || 'outreach@5ducks.com',
          to: contact.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
}

export const autoSendCampaignService = new AutoSendCampaignService();