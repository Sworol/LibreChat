import mongoose from 'mongoose';
import { AD_CONFIG, canWatchAd, grantAdCredits, getAdStatus } from '../ads/reward';

jest.mock('@librechat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
    models: {
      Transaction: {
        findOne: jest.fn(),
      },
      Balance: {
        findOneAndUpdate: jest.fn(),
      },
    },
  };
});

describe('Ads Service', () => {
  const testUserId = new mongoose.Types.ObjectId().toString();
  const validAdId = `ad_${Date.now()}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canWatchAd', () => {
    it('should allow user when under daily limit', async () => {
      const result = await canWatchAd(testUserId);
      expect(result.allowed).toBe(true);
    });

    it('should deny when daily limit reached', async () => {
      // Simulate reaching limit by filling history
      for (let i = 0; i < AD_CONFIG.maxWatchesPerDay; i++) {
        await grantAdCredits(testUserId, `ad_test_${i}`);
      }
      const result = await canWatchAd(testUserId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily limit reached');
    });
  });

  describe('grantAdCredits', () => {
    it('should reject invalid adId format', async () => {
      const result = await grantAdCredits(testUserId, 'invalid_format');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid adId format');
    });

    it('should reject empty adId', async () => {
      const result = await grantAdCredits(testUserId, '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid adId format');
    });

    it('should reject reused adId', async () => {
      const adId = `ad_reuse_${Date.now()}`;
      await grantAdCredits(testUserId, adId);
      const result = await grantAdCredits(testUserId, adId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Ad already redeemed');
    });
  });

  describe('getAdStatus', () => {
    it('should return correct status structure', async () => {
      const status = await getAdStatus(testUserId);
      expect(status).toHaveProperty('canWatch');
      expect(status).toHaveProperty('watchesToday');
      expect(status).toHaveProperty('maxWatches');
      expect(status).toHaveProperty('cooldownSeconds');
      expect(status.maxWatches).toBe(AD_CONFIG.maxWatchesPerDay);
      expect(status.cooldownSeconds).toBe(AD_CONFIG.cooldownSeconds);
    });
  });
});
