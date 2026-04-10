import { getMembershipStatus, getMembershipTier, getDiscountMultiplier, RATE_LIMITS } from '../membership';

jest.mock('@librechat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    models: {
      User: {
        findById: jest.fn(),
      },
      MembershipPlan: {
        findOne: jest.fn(),
      },
    },
  };
});

describe('Membership Service', () => {
  const testUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RATE_LIMITS', () => {
    it('should have correct rate limits for each tier', () => {
      expect(RATE_LIMITS.free).toBe(1.0);
      expect(RATE_LIMITS.basic).toBe(1.0);
      expect(RATE_LIMITS.pro).toBe(0.9);
      expect(RATE_LIMITS.enterprise).toBe(0.8);
    });
  });

  describe('getMembershipStatus', () => {
    it('should return status object with required fields', async () => {
      const status = await getMembershipStatus(testUserId);
      expect(status).toHaveProperty('tier');
      expect(status).toHaveProperty('isActive');
      expect(status).toHaveProperty('discountMultiplier');
      expect(status).toHaveProperty('benefits');
    });
  });

  describe('getMembershipTier', () => {
    it('should return free tier when no membership found', async () => {
      const tier = await getMembershipTier(testUserId);
      expect(tier).toBe('free');
    });
  });

  describe('getDiscountMultiplier', () => {
    it('should return 1.0 for free tier', async () => {
      const multiplier = await getDiscountMultiplier('free');
      expect(multiplier).toBe(1.0);
    });

    it('should return 0.9 for pro tier', async () => {
      const multiplier = await getDiscountMultiplier('pro');
      expect(multiplier).toBe(0.9);
    });

    it('should return 0.8 for enterprise tier', async () => {
      const multiplier = await getDiscountMultiplier('enterprise');
      expect(multiplier).toBe(0.8);
    });
  });
});
