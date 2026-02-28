import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../../utils/admin-auth';
import { db } from '../../../db';
import { bots, handles, securityBulkSignupAlerts, securityIpBlocks, securityRules, insertSecurityRuleSchema } from '@shared/schema';
import { eq, desc, inArray, sql, and, gte } from 'drizzle-orm';
import { bulkSignupDetector } from './detector';
import { logSecurityEvent } from '../../../sendclaw/common';

const IP_BLOCK_DAYS = 14;

const router = Router();

router.get('/bulk-signups', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];
    if (status && ['pending', 'approved', 'ignored'].includes(status)) {
      conditions.push(eq(securityBulkSignupAlerts.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(securityBulkSignupAlerts)
      .where(whereClause);

    const alerts = await db
      .select()
      .from(securityBulkSignupAlerts)
      .where(whereClause)
      .orderBy(desc(securityBulkSignupAlerts.createdAt))
      .limit(pageSize)
      .offset(offset);

    res.json({
      items: alerts,
      total: Number(total),
      page,
      pageSize
    });
  } catch (error) {
    console.error('[BulkSignup] List alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.get('/bulk-signups/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [alert] = await db
      .select()
      .from(securityBulkSignupAlerts)
      .where(eq(securityBulkSignupAlerts.id, id))
      .limit(1);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const botIds = alert.botIds as string[];
    let botDetails: any[] = [];
    if (botIds.length > 0) {
      botDetails = await db
        .select({
          id: bots.id,
          name: bots.name,
          senderName: bots.senderName,
          address: bots.address,
          registrationIp: bots.registrationIp,
          status: bots.status,
          verified: bots.verified,
          flagCount: bots.flagCount,
          userId: bots.userId,
          claimedAt: bots.claimedAt,
          createdAt: bots.createdAt
        })
        .from(bots)
        .where(inArray(bots.id, botIds))
        .orderBy(bots.createdAt);
    }

    const relatedBlocks = await db
      .select()
      .from(securityIpBlocks)
      .where(eq(securityIpBlocks.alertId, alert.id));

    res.json({ alert, bots: botDetails, ipBlocks: relatedBlocks });
  } catch (error) {
    console.error('[BulkSignup] Get alert error:', error);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

router.post('/bulk-signups/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.query.token as string;

    const [alert] = await db
      .select()
      .from(securityBulkSignupAlerts)
      .where(eq(securityBulkSignupAlerts.id, id))
      .limit(1);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const isAdmin = req.isAuthenticated?.() && (req.user as any)?.isAdmin;
    if (!isAdmin && alert.approvalToken !== token) {
      res.status(403).json({ error: 'Invalid approval token' });
      return;
    }

    if (alert.status !== 'pending') {
      res.status(400).json({ error: `Alert already ${alert.status}` });
      return;
    }

    const botIds = alert.botIds as string[];
    const ipList = alert.ipList as string[];

    if (botIds.length > 0) {
      await db.update(bots)
        .set({ status: 'suspended', verified: false })
        .where(inArray(bots.id, botIds));

      await db.delete(handles)
        .where(inArray(handles.botId, botIds));
    }

    const blockedUntil = new Date(Date.now() + IP_BLOCK_DAYS * 24 * 60 * 60 * 1000);
    for (const ip of ipList) {
      const [existingBlock] = await db
        .select({ id: securityIpBlocks.id })
        .from(securityIpBlocks)
        .where(and(
          eq(securityIpBlocks.ip, ip),
          gte(securityIpBlocks.blockedUntil, new Date())
        ))
        .limit(1);

      if (existingBlock) {
        await db.update(securityIpBlocks)
          .set({ blockedUntil, reason: `Bulk signup alert: ${alert.namePrefix}`, alertId: alert.id })
          .where(eq(securityIpBlocks.id, existingBlock.id));
      } else {
        await db.insert(securityIpBlocks).values({
          ip,
          blockedUntil,
          reason: `Bulk signup alert: ${alert.namePrefix}`,
          alertId: alert.id
        });
      }
    }

    await db.update(securityBulkSignupAlerts)
      .set({ status: 'approved', resolvedAt: new Date() })
      .where(eq(securityBulkSignupAlerts.id, id));

    await logSecurityEvent('bulk_signup_approved', null, null, null, {
      alertId: alert.id,
      botsRemoved: botIds.length,
      ipsBlocked: ipList.length,
      blockDays: IP_BLOCK_DAYS
    });

    console.log(`[BulkSignup] Alert ${id} approved: ${botIds.length} bots suspended, ${ipList.length} IPs blocked for ${IP_BLOCK_DAYS} days`);

    const isApiRequest = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');
    if (isApiRequest || isAdmin) {
      res.json({
        success: true,
        message: `${botIds.length} bots suspended, ${ipList.length} IPs blocked for ${IP_BLOCK_DAYS} days`
      });
    } else {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Bulk Signup Alert — Approved</title>
        <style>body{font-family:-apple-system,sans-serif;max-width:600px;margin:60px auto;padding:20px;text-align:center;}
        .success{background:#d4edda;border:1px solid #c3e6cb;border-radius:12px;padding:30px;margin:20px 0;}
        h1{color:#155724;}</style></head>
        <body><div class="success"><h1>✅ Approved</h1>
        <p><strong>${botIds.length}</strong> bots have been suspended.</p>
        <p><strong>${ipList.length}</strong> IPs blocked for ${IP_BLOCK_DAYS} days.</p>
        <p style="color:#666;margin-top:20px;">You can close this tab.</p></div></body></html>
      `);
    }
  } catch (error) {
    console.error('[BulkSignup] Approve error:', error);
    res.status(500).json({ error: 'Failed to approve alert' });
  }
});

router.post('/bulk-signups/:id/ignore', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [alert] = await db
      .select({ id: securityBulkSignupAlerts.id, status: securityBulkSignupAlerts.status })
      .from(securityBulkSignupAlerts)
      .where(eq(securityBulkSignupAlerts.id, id))
      .limit(1);

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    if (alert.status !== 'pending') {
      res.status(400).json({ error: `Alert already ${alert.status}` });
      return;
    }

    await db.update(securityBulkSignupAlerts)
      .set({ status: 'ignored', resolvedAt: new Date() })
      .where(eq(securityBulkSignupAlerts.id, id));

    await logSecurityEvent('bulk_signup_ignored', null, null, null, { alertId: alert.id });

    console.log(`[BulkSignup] Alert ${id} ignored`);

    res.json({ success: true, message: 'Alert ignored' });
  } catch (error) {
    console.error('[BulkSignup] Ignore error:', error);
    res.status(500).json({ error: 'Failed to ignore alert' });
  }
});

router.post('/bulk-signups/force-scan', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { date } = req.body || {};
    await bulkSignupDetector.forceRun(date);
    res.json({ success: true, message: date ? `Bulk signup scan completed for ${date}` : 'Bulk signup scan completed' });
  } catch (error) {
    console.error('[BulkSignup] Force scan error:', error);
    res.status(500).json({ error: 'Failed to run scan' });
  }
});

router.get('/bulk-signups/rules', requireAdmin, async (req: Request, res: Response) => {
  try {
    const rules = await db
      .select()
      .from(securityRules)
      .orderBy(desc(securityRules.createdAt));

    res.json({ items: rules });
  } catch (error) {
    console.error('[SecurityRules] List error:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

router.post('/bulk-signups/rules', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = insertSecurityRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid rule data', details: parsed.error.errors });
      return;
    }

    const [rule] = await db.insert(securityRules).values(parsed.data).returning();

    await logSecurityEvent('security_rule_created', null, null, null, {
      ruleId: rule.id,
      type: rule.type,
      value: rule.value,
      label: rule.label
    });

    console.log(`[SecurityRules] Rule created: ${rule.label} (${rule.type}: ${rule.value})`);
    res.status(201).json(rule);
  } catch (error) {
    console.error('[SecurityRules] Create error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

router.patch('/bulk-signups/rules/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid rule ID' });
      return;
    }

    const { enabled, message, label } = req.body;
    const updates: Record<string, any> = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (typeof message === 'string') updates.message = message;
    if (typeof label === 'string') updates.label = label;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    const [updated] = await db
      .update(securityRules)
      .set(updates)
      .where(eq(securityRules.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    await logSecurityEvent('security_rule_updated', null, null, null, {
      ruleId: id,
      updates
    });

    res.json(updated);
  } catch (error) {
    console.error('[SecurityRules] Update error:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

router.delete('/bulk-signups/rules/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid rule ID' });
      return;
    }

    const [deleted] = await db
      .delete(securityRules)
      .where(eq(securityRules.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    await logSecurityEvent('security_rule_deleted', null, null, null, {
      ruleId: id,
      type: deleted.type,
      value: deleted.value,
      label: deleted.label
    });

    console.log(`[SecurityRules] Rule deleted: ${deleted.label} (${deleted.type}: ${deleted.value})`);
    res.json({ success: true });
  } catch (error) {
    console.error('[SecurityRules] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

export default router;
