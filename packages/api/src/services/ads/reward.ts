import mongoose from 'mongoose';
import { logger } from '@librechat/data-schemas';

/** Ad reward configuration */
export const AD_CONFIG = {
  /** Credits awarded per ad watch */
  creditsPerWatch: 50,
  /** Maximum ad watches per user per day */
  maxWatchesPerDay: 10,
  /** Cooldown between ad watches (seconds) */
  cooldownSeconds: 300, // 5 minutes
} as const;

interface AdWatchRecord {
  adId: string;
  userId: string;
  watchedAt: Date;
}

/** In-memory store for ad watch records (use Redis in production) */
const adWatchHistory: AdWatchRecord[] = [];

/**
 * Validate ad ID format and check if already used
 */
function validateAdId(adId: string, userId: string): { valid: boolean; reason?: string } {
  if (!adId || typeof adId !== 'string') {
    return { valid: false, reason: 'Invalid adId format' };
  }
  // Check format: should start with 'ad_' prefix (from /reward endpoint)
  if (!adId.startsWith('ad_')) {
    return { valid: false, reason: 'Invalid adId format' };
  }
  // Check if already redeemed by this user
  const alreadyUsed = adWatchHistory.some(
    (r) => r.userId === userId && r.adId === adId,
  );
  if (alreadyUsed) {
    return { valid: false, reason: 'Ad already redeemed' };
  }
  return { valid: true };
}

/**
 * Check if user can watch an ad (rate limiting)
 */
export async function canWatchAd(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Count today's watches
  const todayWatches = adWatchHistory.filter(
    (r) => r.userId === userId && r.watchedAt >= todayStart,
  ).length;

  if (todayWatches >= AD_CONFIG.maxWatchesPerDay) {
    return { allowed: false, reason: 'Daily limit reached' };
  }

  // Check cooldown
  const lastWatch = adWatchHistory
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())[0];

  if (lastWatch) {
    const secondsSinceLastWatch = (now.getTime() - lastWatch.watchedAt.getTime()) / 1000;
    if (secondsSinceLastWatch < AD_CONFIG.cooldownSeconds) {
      return {
        allowed: false,
        reason: `Cooldown active, try again in ${Math.ceil(AD_CONFIG.cooldownSeconds - secondsSinceLastWatch)} seconds`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Grant credits after verified ad watch
 */
export async function grantAdCredits(userId: string, adId: string): Promise<{
  success: boolean;
  credits: number;
  newBalance: number;
  error?: string;
}> {
  // Validate adId first
  const adValidation = validateAdId(adId, userId);
  if (!adValidation.valid) {
    logger.warn(`[Ads] Ad reward denied for user ${userId}: ${adValidation.reason}`);
    return { success: false, credits: 0, newBalance: 0, error: adValidation.reason };
  }

  // Check rate limiting
  const { canWatch, reason } = await canWatchAd(userId);
  if (!canWatch) {
    logger.warn(`[Ads] Ad reward denied for user ${userId}: ${reason}`);
    return { success: false, credits: 0, newBalance: 0, error: reason };
  }

  // Use MongoDB transaction for atomicity
  const mongoSession = await mongoose.startSession();
  try {
    mongoSession.startTransaction();

    const Transaction = mongoose.models.Transaction;
    const transaction = new Transaction({
      user: userId,
      tokenType: 'recharge',
      context: 'ad_reward',
      rawAmount: AD_CONFIG.creditsPerWatch,
    });
    transaction.tokenValue = AD_CONFIG.creditsPerWatch;
    transaction.rate = 1;
    await transaction.save({ session: mongoSession });

    const Balance = mongoose.models.Balance;
    const updated = await Balance.findOneAndUpdate(
      { user: userId },
      { $inc: { tokenCredits: AD_CONFIG.creditsPerWatch } },
      { new: true, session: mongoSession },
    ).lean();

    // Record this watch (within transaction for consistency)
    adWatchHistory.push({ userId, adId, watchedAt: new Date() });

    await mongoSession.commitTransaction();

    logger.info(`[Ads] Granted ${AD_CONFIG.creditsPerWatch} credits to user ${userId} for ad ${adId}`);

    return {
      success: true,
      credits: AD_CONFIG.creditsPerWatch,
      newBalance: updated?.tokenCredits ?? 0,
    };
  } catch (error) {
    await mongoSession.abortTransaction();
    logger.error('[Ads] Transaction failed:', error);
    return { success: false, credits: 0, newBalance: 0, error: 'Transaction failed' };
  } finally {
    mongoSession.endSession();
  }
}

/**
 * Get ad eligibility status for a user
 */
export async function getAdStatus(userId: string): Promise<{
  canWatch: boolean;
  watchesToday: number;
  maxWatches: number;
  cooldownSeconds: number;
}> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayWatches = adWatchHistory.filter(
    (r) => r.userId === userId && r.watchedAt >= todayStart,
  ).length;

  const { allowed } = await canWatchAd(userId);

  return {
    canWatch: allowed,
    watchesToday: todayWatches,
    maxWatches: AD_CONFIG.maxWatchesPerDay,
    cooldownSeconds: AD_CONFIG.cooldownSeconds,
  };
}
