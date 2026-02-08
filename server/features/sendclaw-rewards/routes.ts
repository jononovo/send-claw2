import { Router, Request, Response } from "express";
import { db } from "../../db";
import { dailyCheckins, socialShareRewards } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { CreditRewardService } from "../billing/rewards/service";
import { getTodayDate } from "../sendclaw-quota";

const router = Router();

router.get('/rewards/daily-checkin', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const today = getTodayDate();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const [todayCheckin] = await db.select().from(dailyCheckins)
      .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, today)))
      .limit(1);

    const [yesterdayCheckin] = await db.select().from(dailyCheckins)
      .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, yesterday)))
      .limit(1);

    const [lastCheckin] = await db.select().from(dailyCheckins)
      .where(eq(dailyCheckins.userId, userId))
      .orderBy(desc(dailyCheckins.date))
      .limit(1);

    const currentStreak = todayCheckin?.streakCount || yesterdayCheckin?.streakCount || 0;
    const canClaim = !todayCheckin;

    let potentialReward = 10;
    if (currentStreak >= 7) potentialReward = 20;
    else if (currentStreak >= 3) potentialReward = 15;

    res.json({
      canClaim,
      claimedToday: !!todayCheckin,
      currentStreak,
      potentialReward,
      lastClaimDate: lastCheckin?.date || null,
      todayCredits: todayCheckin?.creditsAwarded || 0
    });
  } catch (error) {
    console.error('[SendClaw] Daily checkin status error:', error);
    res.status(500).json({ error: 'Failed to get check-in status' });
  }
});

router.post('/rewards/daily-checkin', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const today = getTodayDate();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const [existingCheckin] = await db.select().from(dailyCheckins)
      .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, today)))
      .limit(1);

    if (existingCheckin) {
      res.status(400).json({ 
        error: 'Already claimed today',
        creditsAwarded: existingCheckin.creditsAwarded,
        streakCount: existingCheckin.streakCount
      });
      return;
    }

    const [yesterdayCheckin] = await db.select().from(dailyCheckins)
      .where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, yesterday)))
      .limit(1);

    const newStreak = yesterdayCheckin ? yesterdayCheckin.streakCount + 1 : 1;

    let creditsToAward = 10;
    if (newStreak >= 7) creditsToAward = 20;
    else if (newStreak >= 3) creditsToAward = 15;

    const rewardKey = `daily_checkin:${today}`;
    const rewardResult = await CreditRewardService.awardOneTimeCredits(
      userId,
      creditsToAward,
      rewardKey,
      `Daily check-in (Day ${newStreak} streak)`
    );

    if (!rewardResult.credited) {
      res.status(400).json({ error: 'Already claimed this reward' });
      return;
    }

    await db.insert(dailyCheckins).values({
      userId,
      date: today,
      creditsAwarded: creditsToAward,
      streakCount: newStreak
    });

    console.log(`[SendClaw] Daily check-in: user ${userId} claimed ${creditsToAward} credits (streak: ${newStreak})`);

    res.json({
      success: true,
      creditsAwarded: creditsToAward,
      streakCount: newStreak,
      newBalance: rewardResult.newBalance,
      message: newStreak >= 7 
        ? 'Max streak bonus! Keep it up!' 
        : newStreak >= 3 
          ? 'Streak bonus active!' 
          : 'Come back tomorrow to build your streak!'
    });
  } catch (error) {
    console.error('[SendClaw] Daily checkin claim error:', error);
    res.status(500).json({ error: 'Failed to claim daily check-in' });
  }
});

router.get('/rewards/share', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const userShares = await db.select().from(socialShareRewards)
      .where(eq(socialShareRewards.userId, userId))
      .orderBy(desc(socialShareRewards.createdAt));

    const platforms = ['twitter', 'linkedin', 'facebook'] as const;
    const platformCredits = { twitter: 50, linkedin: 50, facebook: 30 };
    
    const availablePlatforms = platforms.filter(p => 
      !userShares.some(s => s.platform === p && s.status !== 'rejected')
    );

    res.json({
      shares: userShares.map(s => ({
        platform: s.platform,
        postUrl: s.postUrl,
        status: s.status,
        creditsAwarded: s.creditsAwarded,
        createdAt: s.createdAt
      })),
      availablePlatforms: availablePlatforms.map(p => ({
        platform: p,
        credits: platformCredits[p]
      })),
      totalEarned: userShares.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.creditsAwarded, 0)
    });
  } catch (error) {
    console.error('[SendClaw] Share status error:', error);
    res.status(500).json({ error: 'Failed to get share status' });
  }
});

router.post('/rewards/share', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'User ID not found' });
      return;
    }

    const { platform, postUrl } = req.body;

    const validPlatforms = ['twitter', 'linkedin', 'facebook'];
    if (!platform || !validPlatforms.includes(platform)) {
      res.status(400).json({ error: 'Invalid platform. Must be twitter, linkedin, or facebook' });
      return;
    }

    if (!postUrl || typeof postUrl !== 'string') {
      res.status(400).json({ error: 'Post URL is required' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(postUrl);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const platformDomains: Record<string, string[]> = {
      twitter: ['twitter.com', 'x.com'],
      linkedin: ['linkedin.com', 'www.linkedin.com'],
      facebook: ['facebook.com', 'www.facebook.com', 'fb.com']
    };

    const hostname = parsedUrl.hostname.toLowerCase();
    const isValidDomain = platformDomains[platform].some(d => 
      hostname === d || hostname === `www.${d}` || hostname.endsWith(`.${d}`)
    );
    if (!isValidDomain) {
      res.status(400).json({ error: `URL must be from ${platform}` });
      return;
    }

    if (parsedUrl.protocol !== 'https:') {
      res.status(400).json({ error: 'URL must use HTTPS' });
      return;
    }

    const [existingShare] = await db.select().from(socialShareRewards)
      .where(and(
        eq(socialShareRewards.userId, userId),
        eq(socialShareRewards.platform, platform)
      ))
      .limit(1);

    if (existingShare) {
      if (existingShare.status === 'rejected') {
        await db.update(socialShareRewards)
          .set({ postUrl, status: 'pending', reviewedAt: null })
          .where(eq(socialShareRewards.id, existingShare.id));
        
        res.json({ success: true, status: 'pending', message: 'Resubmitted for review' });
        return;
      }
      res.status(400).json({ 
        error: 'Already submitted for this platform',
        status: existingShare.status
      });
      return;
    }

    const platformCredits: Record<string, number> = { twitter: 50, linkedin: 50, facebook: 30 };
    const creditsToAward = platformCredits[platform];

    const status = 'approved';
    
    const rewardKey = `share:${platform}`;
    const rewardResult = await CreditRewardService.awardOneTimeCredits(
      userId,
      creditsToAward,
      rewardKey,
      `Social share reward (${platform})`
    );

    await db.insert(socialShareRewards).values({
      userId,
      platform: platform as 'twitter' | 'linkedin' | 'facebook',
      postUrl,
      status,
      creditsAwarded: rewardResult.credited ? creditsToAward : 0,
      reviewedAt: new Date()
    });

    console.log(`[SendClaw] Social share: user ${userId} earned ${creditsToAward} credits for ${platform} share`);

    res.json({
      success: true,
      status,
      creditsAwarded: rewardResult.credited ? creditsToAward : 0,
      newBalance: rewardResult.newBalance,
      message: 'Thanks for sharing! Credits added to your account.'
    });
  } catch (error) {
    console.error('[SendClaw] Share submit error:', error);
    res.status(500).json({ error: 'Failed to submit share' });
  }
});

export { router as rewardsRouter };
