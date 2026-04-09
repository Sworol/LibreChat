import mongoose from 'mongoose';
import type { Model, Types } from 'mongoose';
import type { IUser } from 'librechat-data-provider';
import type { IMembershipPlan } from '@librechat/data-schemas';

/** Membership tier type */
export type MembershipTier = 'free' | 'basic' | 'pro' | 'enterprise';

/** Rate limits per tier */
export const RATE_LIMITS: Record<MembershipTier, number> = {
  free: 1.0,
  basic: 1.0,
  pro: 0.9,
  enterprise: 0.8,
};

/** Default membership plan for new users */
export const DEFAULT_FREE_PLAN = {
  tier: 'free' as MembershipTier,
  name: 'Free User',
  price: 0,
  billingPeriod: 'lifetime' as const,
  benefits: ['basic_api'],
  creditAllowance: 0,
  discountMultiplier: 1.0,
  enabled: true,
};

/**
 * Get the user's current membership tier
 */
export async function getMembershipTier(userId: string): Promise<MembershipTier> {
  const User = mongoose.models.User as Model<IUser> & {
    findById: (id: string) => Promise<IUser | null>;
  };
  const user = await User.findById(userId).select('membership.tier').lean();
  return (user?.membership?.tier as MembershipTier) ?? 'free';
}

/**
 * Get membership status for a user
 */
export async function getMembershipStatus(userId: string): Promise<{
  tier: MembershipTier;
  expiryDate: Date | null;
  benefits: string[];
  isActive: boolean;
  discountMultiplier: number;
}> {
  const tier = await getMembershipTier(userId);
  const plan = await getMembershipPlan(tier);
  return {
    tier,
    expiryDate: null,
    benefits: plan?.benefits ?? DEFAULT_FREE_PLAN.benefits,
    isActive: true,
    discountMultiplier: plan?.discountMultiplier ?? 1.0,
  };
}

/**
 * Check if a user's membership is active (not expired)
 */
export async function isMembershipActive(userId: string): Promise<boolean> {
  const User = mongoose.models.User as Model<IUser> & {
    findById: (id: string) => Promise<IUser | null>;
  };
  const user = await User.findById(userId).select('membership.expiryDate').lean();
  if (!user?.membership?.expiryDate) {
    return true; // No expiry = always active
  }
  return new Date(user.membership.expiryDate) > new Date();
}

/**
 * Get the rate limit multiplier for a tier
 */
export function getRateLimitMultiplier(tier: MembershipTier): number {
  return RATE_LIMITS[tier] ?? 1.0;
}

/**
 * Get the discount multiplier for a tier
 */
export async function getDiscountMultiplier(userId: string): Promise<number> {
  const tier = await getMembershipTier(userId);
  const plan = await getMembershipPlan(tier);
  return plan?.discountMultiplier ?? 1.0;
}

/**
 * Get the membership plan for a tier
 */
export async function getMembershipPlan(
  tier: MembershipTier,
): Promise<IMembershipPlan | null> {
  const MembershipPlan = mongoose.models.MembershipPlan as Model<IMembershipPlan>;
  return MembershipPlan.findOne({ tier, enabled: true }).lean();
}

/**
 * Seed default membership plans
 */
export async function seedMembershipPlans(): Promise<void> {
  const MembershipPlan = mongoose.models.MembershipPlan as Model<IMembershipPlan>;

  const plans = [
    {
      ...DEFAULT_FREE_PLAN,
      tier: 'free',
    },
    {
      tier: 'basic' as MembershipTier,
      name: 'Basic Member',
      price: 990, // ¥9.9
      billingPeriod: 'monthly' as const,
      benefits: ['basic_api', 'no_ads'],
      creditAllowance: 10000,
      discountMultiplier: 1.0,
      enabled: true,
    },
    {
      tier: 'pro' as MembershipTier,
      name: 'Pro Member',
      price: 2990, // ¥29
      billingPeriod: 'monthly' as const,
      benefits: ['basic_api', 'no_ads', 'priority_queue'],
      creditAllowance: 50000,
      discountMultiplier: 0.9,
      enabled: true,
    },
    {
      tier: 'enterprise' as MembershipTier,
      name: 'Enterprise',
      price: 9900, // ¥99
      billingPeriod: 'monthly' as const,
      benefits: ['basic_api', 'no_ads', 'priority_queue', 'api_access'],
      creditAllowance: 200000,
      discountMultiplier: 0.8,
      enabled: true,
    },
  ];

  for (const plan of plans) {
    await MembershipPlan.findOneAndUpdate({ tier: plan.tier }, plan, { upsert: true });
  }
}

/**
 * Update user membership tier
 */
export async function updateUserMembership(
  userId: string | Types.ObjectId,
  tier: MembershipTier,
  expiryDate?: Date,
): Promise<void> {
  const User = mongoose.models.User as Model<IUser>;
  await User.findByIdAndUpdate(userId, {
    'membership.tier': tier,
    'membership.expiryDate': expiryDate ?? null,
  });
}
