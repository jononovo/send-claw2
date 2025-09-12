import { Router } from 'express';
import { db } from '../../db';
import { 
  dailyOutreachBatches, 
  dailyOutreachItems, 
  userOutreachPreferences,
  dailyOutreachJobs,
  users,
  contacts,
  companies,
  communicationHistory
} from '@shared/schema';
import { eq, and, lte, sql, not, desc } from 'drizzle-orm';
import { persistentScheduler as outreachScheduler } from './services/persistent-scheduler';
import { batchGenerator } from './services/batch-generator';
import { sendGridService } from './services/sendgrid-service';
import type { Request, Response } from 'express';
import streakRoutes from './routes-streak';
import { requireAuth } from '../../utils/auth';

const router = Router();

// Mount streak routes
router.use('/', streakRoutes);

// Get user's outreach preferences
router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const [preferences] = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.userId, userId));
    
    if (!preferences) {
      // Return default preferences if none exist
      return res.json({
        enabled: false,
        scheduleDays: ['mon', 'tue', 'wed'],
        scheduleTime: '09:00',
        timezone: 'America/New_York',
        minContactsRequired: 5
      });
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching outreach preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user's outreach preferences
router.put('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { enabled, scheduleDays, scheduleTime, timezone, minContactsRequired, activeProductId, activeSenderProfileId, activeCustomerProfileId } = req.body;
    
    // Check if preferences exist
    const [existing] = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.userId, userId));
    
    let preferences;
    if (existing) {
      // Update existing preferences
      [preferences] = await db
        .update(userOutreachPreferences)
        .set({
          enabled,
          scheduleDays,
          scheduleTime,
          timezone,
          minContactsRequired,
          activeProductId,
          activeSenderProfileId,
          activeCustomerProfileId,
          updatedAt: new Date()
        })
        .where(eq(userOutreachPreferences.userId, userId))
        .returning();
    } else {
      // Create new preferences
      [preferences] = await db
        .insert(userOutreachPreferences)
        .values({
          userId,
          enabled,
          scheduleDays,
          scheduleTime,
          timezone,
          minContactsRequired,
          activeProductId,
          activeSenderProfileId,
          activeCustomerProfileId
        })
        .returning();
    }
    
    // Update scheduler
    if (enabled) {
      await outreachScheduler.updateUserPreferences(userId, preferences);
    } else {
      await outreachScheduler.disableUserOutreach(userId);
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Error updating outreach preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Preview email template
router.get('/preview', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Try to get the most recent batch for this user
    const [recentBatch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.userId, userId))
      .orderBy(dailyOutreachBatches.createdAt)
      .limit(1);
    
    let batch;
    if (recentBatch) {
      // Get batch items with contact and company details
      const items = await db
        .select({
          item: dailyOutreachItems,
          contact: contacts,
          company: companies
        })
        .from(dailyOutreachItems)
        .innerJoin(contacts, eq(dailyOutreachItems.contactId, contacts.id))
        .innerJoin(companies, eq(dailyOutreachItems.companyId, companies.id))
        .where(eq(dailyOutreachItems.batchId, recentBatch.id))
        .limit(5);
      
      batch = {
        ...recentBatch,
        items: items.map(({ item, contact, company }) => ({
          ...item,
          contact,
          company
        })),
        hasContacts: items.length > 0,
        companiesByType: [{ type: 'prospects', count: items.length }]
      };
    } else {
      // Generate a sample batch for preview
      batch = await batchGenerator.generateDailyBatch(userId);
    }
    
    // If still no batch, create a minimal sample
    if (!batch) {
      batch = {
        id: 0,
        userId,
        batchDate: new Date(),
        secureToken: 'preview-token',
        status: 'preview',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        items: [],
        hasContacts: true,
        companiesByType: [{ type: 'B2B prospects', count: 5 }]
      };
    }
    
    // Generate the email HTML using the SendGrid service
    const emailContent = sendGridService.buildContactsReadyEmail(batch);
    
    // Return HTML directly with proper content type
    res.setHeader('Content-Type', 'text/html');
    res.send(emailContent.html);
  } catch (error) {
    console.error('Error generating email preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Manual trigger for testing (only in development)
router.post('/trigger', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Manual trigger not allowed in production' });
    }
    
    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate batch
    const batch = await batchGenerator.generateDailyBatch(userId);
    
    if (!batch) {
      return res.json({ 
        success: false, 
        message: 'Not enough contacts available. Please add more contacts first.' 
      });
    }
    
    // Send email
    const sent = await sendGridService.sendDailyNudgeEmail(user, batch);
    
    if (sent) {
      // Update last nudge sent
      await db
        .update(userOutreachPreferences)
        .set({ lastNudgeSent: new Date() })
        .where(eq(userOutreachPreferences.userId, userId));
    }
    
    res.json({ 
      success: sent, 
      batchId: batch.id,
      secureToken: batch.secureToken,
      itemCount: batch.items.length,
      message: sent 
        ? 'Daily nudge email sent successfully' 
        : 'Failed to send email. Check SendGrid configuration.'
    });
  } catch (error) {
    console.error('Error triggering manual outreach:', error);
    res.status(500).json({ error: 'Failed to trigger outreach' });
  }
});

// Send test email endpoint
router.post('/send-test-email', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      return res.json({ 
        success: false, 
        message: 'SendGrid is not configured. Please add SENDGRID_API_KEY to environment variables.' 
      });
    }
    
    // Try to get the most recent batch for the user (for testing with real data)
    const [recentBatch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.userId, userId))
      .orderBy(desc(dailyOutreachBatches.createdAt))
      .limit(1);
    
    // Create a sample batch if no real batch exists
    let testBatch: any = recentBatch;
    
    if (!testBatch) {
      // Create a minimal test batch structure for the email
      testBatch = {
        id: 0,
        userId,
        batchDate: new Date(),
        secureToken: 'test-email-token',
        status: 'test',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        items: [],
        hasContacts: true,
        companiesByType: [{ type: 'Test prospects', count: 5 }]
      };
    } else {
      // Add required properties for existing batch
      testBatch = {
        ...testBatch,
        items: [],
        hasContacts: true,
        companiesByType: [{ type: 'B2B prospects', count: 5 }]
      };
    }
    
    // Send test email
    const sent = await sendGridService.sendDailyNudgeEmail(user, testBatch);
    
    res.json({ 
      success: sent, 
      message: sent 
        ? `Test email sent successfully to ${user.email}` 
        : 'Failed to send test email. Please check SendGrid configuration.'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send test email',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get batch by secure token (no auth required - token is the auth)
router.get('/batch/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    // Find batch by secure token
    const [batch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.secureToken, token));
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found or expired' });
    }
    
    // Check if expired
    if (new Date() > new Date(batch.expiresAt)) {
      await db
        .update(dailyOutreachBatches)
        .set({ status: 'expired' })
        .where(eq(dailyOutreachBatches.id, batch.id));
      
      return res.status(410).json({ error: 'This link has expired' });
    }
    
    // Get batch items with contact and company details
    const items = await db
      .select({
        item: dailyOutreachItems,
        contact: contacts,
        company: companies
      })
      .from(dailyOutreachItems)
      .innerJoin(contacts, eq(dailyOutreachItems.contactId, contacts.id))
      .innerJoin(companies, eq(dailyOutreachItems.companyId, companies.id))
      .where(eq(dailyOutreachItems.batchId, batch.id));
    
    res.json({
      batch,
      items: items.map(({ item, contact, company }) => ({
        ...item,
        contact,
        company
      }))
    });
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// Update outreach item (edit email content)
router.put('/batch/:token/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { token, itemId } = req.params;
    const { emailSubject, emailBody } = req.body;
    
    // Verify batch exists and is valid
    const [batch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.secureToken, token));
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    if (new Date() > new Date(batch.expiresAt)) {
      return res.status(410).json({ error: 'This link has expired' });
    }
    
    // Verify item belongs to this batch
    const [item] = await db
      .select()
      .from(dailyOutreachItems)
      .where(
        and(
          eq(dailyOutreachItems.id, parseInt(itemId)),
          eq(dailyOutreachItems.batchId, batch.id)
        )
      );
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Update the item
    const [updated] = await db
      .update(dailyOutreachItems)
      .set({
        emailSubject,
        emailBody,
        editedContent: JSON.stringify({ subject: emailSubject, body: emailBody }),
        status: 'edited'
      })
      .where(eq(dailyOutreachItems.id, parseInt(itemId)))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating outreach item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Mark item as sent
router.post('/batch/:token/item/:itemId/sent', async (req: Request, res: Response) => {
  try {
    const { token, itemId } = req.params;
    
    // Verify batch
    const [batch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.secureToken, token));
    
    if (!batch || new Date() > new Date(batch.expiresAt)) {
      return res.status(404).json({ error: 'Invalid or expired batch' });
    }
    
    // Get the full item details before updating
    const [itemDetails] = await db
      .select()
      .from(dailyOutreachItems)
      .where(
        and(
          eq(dailyOutreachItems.id, parseInt(itemId)),
          eq(dailyOutreachItems.batchId, batch.id)
        )
      );
    
    if (!itemDetails) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (itemDetails.status === 'sent') {
      return res.status(400).json({ error: 'Item already sent' });
    }
    
    const sentAt = new Date();
    
    // Execute all critical operations in a single transaction
    const transactionResult = await db.transaction(async (tx) => {
      // 1. First, try to update the item status atomically (prevents double-send)
      const updateResult = await tx
        .update(dailyOutreachItems)
        .set({
          status: 'sent',
          sentAt
        })
        .where(
          and(
            eq(dailyOutreachItems.id, parseInt(itemId)),
            eq(dailyOutreachItems.batchId, batch.id),
            not(eq(dailyOutreachItems.status, 'sent'))  // Prevent double-send
          )
        )
        .returning();
      
      const initialUpdate = Array.isArray(updateResult) ? updateResult[0] : updateResult;
      
      if (!initialUpdate) {
        throw new Error('Item already sent or not found');
      }
      
      // Re-read item inside transaction for fresh data
      const [currentItem] = await tx
        .select()
        .from(dailyOutreachItems)
        .where(eq(dailyOutreachItems.id, parseInt(itemId)));
      
      // Get contact details
      const [contact] = await tx
        .select()
        .from(contacts)
        .where(eq(contacts.id, currentItem.contactId));
      
      if (!contact) {
        throw new Error('Contact not found');
      }
      
      // Determine final content (use edited content if available)
      let finalContent = currentItem.emailBody;
      let finalSubject = currentItem.emailSubject;
      
      if (currentItem.editedContent) {
        try {
          const edited = JSON.parse(currentItem.editedContent);
          finalSubject = edited.subject || finalSubject;
          finalContent = edited.body || finalContent;
        } catch (e) {
          console.error('Error parsing edited content:', e);
        }
      }
      
      // 2. Save to communicationHistory
      const communicationResult = await tx.insert(communicationHistory).values({
        userId: batch.userId,
        contactId: currentItem.contactId,
        companyId: currentItem.companyId,
        channel: 'email',
        direction: 'outbound',
        subject: finalSubject,
        content: finalContent,
        contentPreview: finalContent.substring(0, 200),
        sentAt,
        status: 'sent',
        metadata: {
          source: 'daily_outreach',
          batchId: batch.id,
          itemId: currentItem.id,
          tone: currentItem.emailTone
        }
      }).returning();
      
      const communication = Array.isArray(communicationResult) ? communicationResult[0] : communicationResult;
      
      if (!communication) {
        throw new Error('Failed to create communication record');
      }
      
      // 3. Update contact status with atomic increment
      const contactUpdateResult = await tx
        .update(contacts)
        .set({
          contactStatus: 'contacted',
          lastContactedAt: sentAt,
          totalCommunications: sql`COALESCE(${contacts.totalCommunications}, 0) + 1`
        })
        .where(eq(contacts.id, currentItem.contactId))
        .returning();
      
      const contactUpdated = Array.isArray(contactUpdateResult) ? contactUpdateResult[0] : contactUpdateResult;
      
      if (!contactUpdated) {
        throw new Error('Failed to update contact');
      }
      
      // 4. Update dailyOutreachItem with communication link
      const finalUpdateResult = await tx
        .update(dailyOutreachItems)
        .set({
          communicationId: communication.id  // Link to CRM record
        })
        .where(
          and(
            eq(dailyOutreachItems.id, parseInt(itemId)),
            eq(dailyOutreachItems.batchId, batch.id)
          )
        )
        .returning();
      
      const updatedItem = Array.isArray(finalUpdateResult) ? finalUpdateResult[0] : finalUpdateResult;
      
      if (!updatedItem) {
        throw new Error('Failed to update item with communication link');
      }
      
      return { communication, updatedItem };
    });
    
    // Update batch status (outside transaction - this is housekeeping)
    const pendingItems = await db
      .select()
      .from(dailyOutreachItems)
      .where(
        and(
          eq(dailyOutreachItems.batchId, batch.id),
          eq(dailyOutreachItems.status, 'pending')
        )
      );
    
    if (pendingItems.length === 0) {
      await db
        .update(dailyOutreachBatches)
        .set({ status: 'complete' })
        .where(eq(dailyOutreachBatches.id, batch.id));
    } else if (batch.status === 'pending') {
      await db
        .update(dailyOutreachBatches)
        .set({ status: 'partial' })
        .where(eq(dailyOutreachBatches.id, batch.id));
    }
    
    res.json({ success: true, item: transactionResult.updatedItem });
  } catch (error) {
    console.error('Error marking item as sent:', error);
    res.status(500).json({ error: 'Failed to mark as sent' });
  }
});

// Skip an item
router.post('/batch/:token/item/:itemId/skip', async (req: Request, res: Response) => {
  try {
    const { token, itemId } = req.params;
    
    // Verify batch
    const [batch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.secureToken, token));
    
    if (!batch || new Date() > new Date(batch.expiresAt)) {
      return res.status(404).json({ error: 'Invalid or expired batch' });
    }
    
    // Update item status
    const [updated] = await db
      .update(dailyOutreachItems)
      .set({ status: 'skipped' })
      .where(
        and(
          eq(dailyOutreachItems.id, parseInt(itemId)),
          eq(dailyOutreachItems.batchId, batch.id)
        )
      )
      .returning();
    
    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error skipping item:', error);
    res.status(500).json({ error: 'Failed to skip item' });
  }
});

// Admin endpoint to test retry logic (dev only)
router.post('/admin/simulate-failure/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    const userId = parseInt(req.params.userId);
    const { retryCount = 0 } = req.body;
    
    // Update job to simulate failure
    const result = await db
      .update(dailyOutreachJobs)
      .set({
        status: 'failed',
        lastError: 'Simulated failure for testing',
        retryCount: retryCount,
        nextRetryAt: new Date(Date.now() + 60 * 1000), // Retry in 1 minute
        updatedAt: new Date()
      })
      .where(eq(dailyOutreachJobs.userId, userId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'No job found for user' });
    }
    
    res.json({ 
      message: 'Job marked as failed for testing',
      job: result[0]
    });
  } catch (error) {
    console.error('Error simulating failure:', error);
    res.status(500).json({ error: 'Failed to simulate failure' });
  }
});

// Admin endpoint to get batch processing stats (dev only)
router.get('/admin/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }
    
    // Get job statistics
    const stats = await db
      .select({
        status: dailyOutreachJobs.status,
        count: sql<number>`COUNT(*)::int`
      })
      .from(dailyOutreachJobs)
      .groupBy(dailyOutreachJobs.status);
    
    // Get retry distribution
    const retryStats = await db
      .select({
        retryCount: dailyOutreachJobs.retryCount,
        count: sql<number>`COUNT(*)::int`
      })
      .from(dailyOutreachJobs)
      .where(eq(dailyOutreachJobs.status, 'failed'))
      .groupBy(dailyOutreachJobs.retryCount);
    
    // Get upcoming jobs
    const upcomingJobs = await db
      .select({
        id: dailyOutreachJobs.id,
        userId: dailyOutreachJobs.userId,
        nextRunAt: dailyOutreachJobs.nextRunAt,
        status: dailyOutreachJobs.status,
        retryCount: dailyOutreachJobs.retryCount
      })
      .from(dailyOutreachJobs)
      .where(lte(dailyOutreachJobs.nextRunAt, new Date(Date.now() + 60 * 60 * 1000))) // Next hour
      .orderBy(dailyOutreachJobs.nextRunAt)
      .limit(10);
    
    res.json({
      config: {
        POLL_INTERVAL_MS: parseInt(process.env.OUTREACH_POLL_INTERVAL || '30000'),
        BATCH_SIZE: parseInt(process.env.OUTREACH_BATCH_SIZE || '15'),
        MAX_CONCURRENT: parseInt(process.env.OUTREACH_MAX_CONCURRENT || '10'),
        MAX_RETRIES: parseInt(process.env.OUTREACH_MAX_RETRIES || '3')
      },
      jobStats: stats,
      retryDistribution: retryStats,
      upcomingJobs: upcomingJobs
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get job status for a specific user
router.get('/job-status/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const [job] = await db
      .select()
      .from(dailyOutreachJobs)
      .where(eq(dailyOutreachJobs.userId, userId));
    
    if (!job) {
      return res.json({ 
        enabled: false, 
        message: 'No scheduled job found' 
      });
    }
    
    res.json({
      enabled: true,
      status: job.status,
      nextRunAt: job.nextRunAt,
      lastRunAt: job.lastRunAt,
      lastError: job.lastError,
      retryCount: job.retryCount,
      nextRetryAt: job.nextRetryAt
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

export default router;