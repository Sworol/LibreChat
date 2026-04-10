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
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
    models: {
      Transaction: jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(undefined),
      })),
      Balance: {
        findOneAndUpdate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ tokenCredits: 100 }),
        }),
      },
    },
  };
});

describe('Ads Service', () => {
  const testUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AD_CONFIG', () => {
    it('should have correct default values', () => {
      expect(AD_CONFIG.creditsPerWatch).toBe(50);
      expect(AD_CONFIG.maxWatchesPerDay).toBe(10);
      expect(AD_CONFIG.cooldownSeconds).toBe(300);
    });
  });

  describe('canWatchAd', () => {
    it('should allow user when under daily limit', async () => {
      const result = await canWatchAd(testUserId);
      expect(result.allowed).toBe(true);
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

    it('should reject adId without ad_ prefix', async () => {
      const result = await grantAdCredits(testUserId, 'xyz_123');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid adId format');
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
