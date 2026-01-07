import { Router, Request, Response, Application } from 'express';
import { db } from '../../db';
import { requireAdmin } from '../../utils/admin-auth';
import { users, companies, contacts, dailyOutreachBatches, dailyOutreachJobs, userOutreachPreferences, communicationHistory, emailTemplates, userAttribution } from '@shared/schema';
import { eq, desc, and, gte, lte, sql, count, inArray } from 'drizzle-orm';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { HealthMonitoringTestRunner } from '../health-monitoring/test-runner';
import { dripEmailEngine } from '../../email/drip-engine';
import { buildContactsReadyEmail } from '../daily-outreach/email-templates/contacts-ready';

const router = Router();

// Admin Dashboard - Get overview statistics
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const weekAgo = subDays(today, 7);
    const monthAgo = subDays(today, 30);

    // Get user statistics
    const userStats = await db
      .select({
        totalUsers: count(users.id),
        adminUsers: count(sql`CASE WHEN ${users.isAdmin} THEN 1 END`),
        guestUsers: count(sql`CASE WHEN ${users.isGuest} THEN 1 END`)
      })
      .from(users);

    // Get company and contact statistics
    const dataStats = await db
      .select({
        totalCompanies: count(companies.id)
      })
      .from(companies);

    const contactStats = await db
      .select({
        totalContacts: count(contacts.id),
        contactsWithEmail: count(sql`CASE WHEN ${contacts.email} IS NOT NULL THEN 1 END`)
      })
      .from(contacts);

    // Get outreach statistics for the past week
    const outreachStats = await db
      .select({
        totalBatches: count(dailyOutreachBatches.id)
      })
      .from(dailyOutreachBatches)
      .where(gte(dailyOutreachBatches.createdAt, weekAgo));

    // Get recent communication history
    const communicationStats = await db
      .select({
        emailsSentToday: count(sql`CASE WHEN ${communicationHistory.sentAt} >= ${startOfDay(today)} THEN 1 END`),
        emailsSentThisWeek: count(sql`CASE WHEN ${communicationHistory.sentAt} >= ${weekAgo} THEN 1 END`),
        emailsSentThisMonth: count(sql`CASE WHEN ${communicationHistory.sentAt} >= ${monthAgo} THEN 1 END`)
      })
      .from(communicationHistory)
      .where(eq(communicationHistory.channel, 'email'));

    // Get scheduled outreach jobs
    const scheduledJobs = await db
      .select({
        total: count(dailyOutreachJobs.id),
        scheduled: count(sql`CASE WHEN ${dailyOutreachJobs.status} = 'scheduled' THEN 1 END`),
        running: count(sql`CASE WHEN ${dailyOutreachJobs.status} = 'running' THEN 1 END`),
        completed: count(sql`CASE WHEN ${dailyOutreachJobs.status} = 'completed' THEN 1 END`),
        failed: count(sql`CASE WHEN ${dailyOutreachJobs.status} = 'failed' THEN 1 END`)
      })
      .from(dailyOutreachJobs);

    res.json({
      users: userStats[0],
      data: {
        companies: dataStats[0].totalCompanies,
        contacts: contactStats[0].totalContacts,
        contactsWithEmail: contactStats[0].contactsWithEmail
      },
      outreach: {
        batchesThisWeek: outreachStats[0].totalBatches,
        emailsSentToday: communicationStats[0].emailsSentToday,
        emailsSentThisWeek: communicationStats[0].emailsSentThisWeek,
        emailsSentThisMonth: communicationStats[0].emailsSentThisMonth
      },
      jobs: scheduledJobs[0]
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      error: 'Failed to fetch admin statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all users with admin status
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        isAdmin: users.isAdmin,
        isGuest: users.isGuest,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        const [companyCount] = await db
          .select({ count: count(companies.id) })
          .from(companies)
          .where(eq(companies.userId, user.id));

        const [contactCount] = await db
          .select({ count: count(contacts.id) })
          .from(contacts)
          .where(eq(contacts.userId, user.id));

        const [outreachPrefs] = await db
          .select()
          .from(userOutreachPreferences)
          .where(eq(userOutreachPreferences.userId, user.id));

        return {
          ...user,
          companies: companyCount.count,
          contacts: contactCount.count,
          outreachEnabled: outreachPrefs?.enabled || false
        };
      })
    );

    res.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Toggle admin status for a user
router.post('/users/:userId/toggle-admin', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Prevent self-demotion
    if (userId === (req.user as any).id) {
      return res.status(400).json({
        error: 'Cannot modify your own admin status'
      });
    }

    // Get current status
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle admin status
    const newAdminStatus = !(user as any).isAdmin;
    
    await db
      .update(users)
      .set({ isAdmin: newAdminStatus })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      userId,
      isAdmin: newAdminStatus,
      message: newAdminStatus ? 'User promoted to admin' : 'Admin privileges revoked'
    });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({
      error: 'Failed to update admin status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get outreach jobs status
router.get('/outreach/jobs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const jobs = await db
      .select({
        id: dailyOutreachJobs.id,
        userId: dailyOutreachJobs.userId,
        status: dailyOutreachJobs.status,
        nextRunAt: dailyOutreachJobs.nextRunAt,
        lastRunAt: dailyOutreachJobs.lastRunAt,
        lastError: dailyOutreachJobs.lastError,
        retryCount: dailyOutreachJobs.retryCount,
        updatedAt: dailyOutreachJobs.updatedAt
      })
      .from(dailyOutreachJobs)
      .orderBy(desc(dailyOutreachJobs.nextRunAt));

    // Get user info for each job
    const jobsWithUsers = await Promise.all(
      jobs.map(async (job) => {
        const [user] = await db
          .select({
            username: users.username,
            email: users.email
          })
          .from(users)
          .where(eq(users.id, job.userId));

        const [prefs] = await db
          .select()
          .from(userOutreachPreferences)
          .where(eq(userOutreachPreferences.userId, job.userId));

        return {
          ...job,
          user: user || { username: 'Unknown', email: 'unknown@example.com' },
          preferences: prefs
        };
      })
    );

    res.json(jobsWithUsers);
  } catch (error) {
    console.error('Error fetching outreach jobs:', error);
    res.status(500).json({
      error: 'Failed to fetch outreach jobs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Manually trigger outreach for a user
router.post('/outreach/trigger/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Import the batch generator
    const { batchGenerator } = await import('../daily-outreach/services/batch-generator');
    
    // Generate batch for the user
    const batch = await batchGenerator.generateDailyBatch(userId);
    
    if (!batch) {
      return res.status(400).json({
        error: 'Failed to generate batch',
        message: 'User may not have enough contacts'
      });
    }

    // Get user for email notification
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (user) {
      // Send notification email via drip engine
      const appUrl = process.env.APP_URL || 'https://5ducks.ai';
      const emailContent = buildContactsReadyEmail(batch, appUrl);
      await dripEmailEngine.sendImmediate(user.email, emailContent, '5Ducks Daily');
    }

    res.json({
      success: true,
      batch: {
        id: batch.id,
        userId: batch.userId,
        itemCount: batch.items.length,
        token: batch.secureToken
      },
      message: `Outreach batch generated successfully for user ${userId}`
    });
  } catch (error) {
    console.error('Error triggering outreach:', error);
    res.status(500).json({
      error: 'Failed to trigger outreach',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run system tests
router.post('/test/run-all', requireAdmin, async (req: Request, res: Response) => {
  try {
    const results = await HealthMonitoringTestRunner.runAllTests();
    res.json(results);
  } catch (error) {
    console.error('Admin test runner error:', error);
    res.status(500).json({
      error: 'Test runner failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Run "+5 More" extension test specifically
router.post('/test/extension', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { TestRunner } = await import('../../lib/test-runner');
    const testRunner = new TestRunner();
    
    // Run the backend search tests which includes the extension test
    const backendResults = await testRunner.runBackendSearchTest();
    
    // Find the extension test specifically
    const extensionTest = backendResults.subTests?.find(t => t.name === 'Search Extension (+5 More)');
    
    // Calculate overall status based on extension test
    let overallStatus = 'failed';
    let message = 'Extension test not found';
    
    if (extensionTest) {
      overallStatus = extensionTest.status;
      message = extensionTest.message;
    }
    
    // Format response similar to full test run
    const response = {
      timestamp: new Date().toISOString(),
      duration: backendResults.duration,
      overallStatus: overallStatus,
      message: message,
      summary: {
        total: 1,
        passed: extensionTest?.status === 'passed' ? 1 : 0,
        failed: extensionTest?.status === 'failed' ? 1 : 0,
        warnings: extensionTest?.status === 'warning' ? 1 : 0
      },
      tests: [{
        name: 'Search Extension (+5 More)',
        status: extensionTest?.status || 'failed',
        message: extensionTest?.message || 'Test not found',
        duration: backendResults.duration,
        subTests: extensionTest ? [{
          name: 'Extension Details',
          status: extensionTest.status,
          message: extensionTest.message,
          data: extensionTest.data
        }] : []
      }]
    };
    
    res.json(response);
  } catch (error) {
    console.error('Extension test runner error:', error);
    res.status(500).json({
      error: 'Extension test failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Test email sending
router.post('/test/email', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { toEmail, subject, content } = req.body;
    
    if (!toEmail || !subject || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'toEmail, subject, and content are required'
      });
    }
    
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(400).json({
        error: 'SendGrid not configured',
        message: 'SENDGRID_API_KEY environment variable is not set'
      });
    }

    // Send test email using drip engine
    const sent = await dripEmailEngine.sendImmediate(toEmail, {
      subject: subject,
      html: `<p>${content.replace(/\n/g, '<br>')}</p>`,
      text: content
    }, 'Admin Test');

    if (sent) {
      res.json({
        success: true,
        message: `Test email sent to ${toEmail}`
      });
    } else {
      res.status(500).json({
        error: 'Failed to send test email',
        message: 'Email sending returned false'
      });
    }
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error.response?.body || null
    });
  }
});

// Get recent batches
router.get('/outreach/batches', requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const batches = await db
      .select()
      .from(dailyOutreachBatches)
      .orderBy(desc(dailyOutreachBatches.createdAt))
      .limit(limit);

    // Get user info for each batch
    const batchesWithUsers = await Promise.all(
      batches.map(async (batch) => {
        const [user] = await db
          .select({
            username: users.username,
            email: users.email
          })
          .from(users)
          .where(eq(users.id, batch.userId));

        return {
          ...batch,
          user: user || { username: 'Unknown', email: 'unknown@example.com' }
        };
      })
    );

    res.json(batchesWithUsers);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      error: 'Failed to fetch batches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============= EMAIL TEMPLATE MANAGEMENT =============

// Get all email templates (admin view - shows all templates with user info)
router.get('/templates', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('Admin fetching all email templates');
    
    // Get all templates with user information
    const templates = await db
      .select({
        id: emailTemplates.id,
        userId: emailTemplates.userId,
        name: emailTemplates.name,
        subject: emailTemplates.subject,
        content: emailTemplates.content,
        description: emailTemplates.description,
        category: emailTemplates.category,
        isDefault: emailTemplates.isDefault,
        createdAt: emailTemplates.createdAt,
        updatedAt: emailTemplates.updatedAt,
        username: users.username,
        email: users.email
      })
      .from(emailTemplates)
      .leftJoin(users, eq(emailTemplates.userId, users.id))
      .orderBy(desc(emailTemplates.isDefault), desc(emailTemplates.createdAt));

    // Format response with user info
    const formattedTemplates = templates.map(t => ({
      id: t.id,
      userId: t.userId,
      name: t.name,
      subject: t.subject,
      content: t.content,
      description: t.description,
      category: t.category,
      isDefault: t.isDefault,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      user: t.username ? { username: t.username, email: t.email } : null
    }));

    console.log(`Found ${formattedTemplates.length} templates`);
    res.json(formattedTemplates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      error: 'Failed to fetch templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new email template (admin can create default templates)
router.post('/templates', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, subject, content, description, category, isDefault } = req.body;
    const adminUserId = (req.user as any)?.id;

    console.log('Admin creating template:', { name, category, isDefault });

    if (!name || !subject || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, subject, and content are required'
      });
    }

    const [template] = await db
      .insert(emailTemplates)
      .values({
        userId: adminUserId, // Admin's user ID
        name,
        subject,
        content,
        description: description || null,
        category: category || 'general',
        isDefault: isDefault || false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log('Created template:', { id: template.id, name: template.name, isDefault: template.isDefault });
    res.json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      error: 'Failed to create template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update email template (admin can update any template)
router.patch('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const updates = req.body;

    console.log('Admin updating template:', { id: templateId, updates });

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.userId; // Don't change ownership
    delete updates.createdAt;
    
    // Set updatedAt
    updates.updatedAt = new Date();

    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set(updates)
      .where(eq(emailTemplates.id, templateId))
      .returning();

    if (!updatedTemplate) {
      return res.status(404).json({
        error: 'Template not found',
        message: `No template found with ID ${templateId}`
      });
    }

    console.log('Updated template:', { id: updatedTemplate.id, name: updatedTemplate.name });
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      error: 'Failed to update template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete email template (admin can delete any template)
router.delete('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);

    console.log('Admin deleting template:', { id: templateId });

    const [deletedTemplate] = await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, templateId))
      .returning();

    if (!deletedTemplate) {
      return res.status(404).json({
        error: 'Template not found',
        message: `No template found with ID ${templateId}`
      });
    }

    console.log('Deleted template:', { id: deletedTemplate.id, name: deletedTemplate.name });
    res.json({ message: 'Template deleted successfully', template: deletedTemplate });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      error: 'Failed to delete template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Attribution stats for ads dashboard
router.get('/attribution', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Get all attribution records
    const allAttribution = await db
      .select({
        id: userAttribution.id,
        userId: userAttribution.userId,
        source: userAttribution.source,
        attributionData: userAttribution.attributionData,
        conversionEvents: userAttribution.conversionEvents,
        createdAt: userAttribution.createdAt
      })
      .from(userAttribution)
      .orderBy(desc(userAttribution.createdAt));

    // Get source breakdown
    const sourceBreakdown = await db
      .select({
        source: userAttribution.source,
        count: count(userAttribution.id)
      })
      .from(userAttribution)
      .groupBy(userAttribution.source);

    // Get users with their emails for the attribution records
    const userIds = allAttribution.map(a => a.userId).filter((id): id is number => id !== null && id !== undefined);
    const userEmails: Record<number, string> = {};
    
    if (userIds.length > 0) {
      const usersData = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.id, userIds));
      
      usersData.forEach(u => {
        if (u.email) userEmails[u.id] = u.email;
      });
    }

    // Enrich attribution with user emails
    const enrichedAttribution = allAttribution.map(a => ({
      ...a,
      userEmail: a.userId ? userEmails[a.userId] || null : null
    }));

    // Build source breakdown with initial empty object
    const sourceBreakdownMap: Record<string, number> = {};
    for (const item of sourceBreakdown) {
      sourceBreakdownMap[item.source || 'unknown'] = Number(item.count);
    }

    res.json({
      totalTracked: allAttribution.length,
      sourceBreakdown: sourceBreakdownMap,
      recentAttributions: enrichedAttribution.slice(0, 50)
    });
  } catch (error) {
    console.error('Error fetching attribution stats:', error);
    res.status(500).json({
      error: 'Failed to fetch attribution statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export function registerAdminRoutes(app: Application) {
  app.use('/api/admin', router);
}