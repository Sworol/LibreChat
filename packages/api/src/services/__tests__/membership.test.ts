import { RATE_LIMITS } from '../membership';

describe('Membership Service', () => {
  describe('RATE_LIMITS', () => {
    it('should have correct rate limits for each tier', () => {
      expect(RATE_LIMITS.free).toBe(1.0);
      expect(RATE_LIMITS.basic).toBe(1.0);
      expect(RATE_LIMITS.pro).toBe(0.9);
      expect(RATE_LIMITS.enterprise).toBe(0.8);
    });

    it('should have free and basic at full price', () => {
      expect(RATE_LIMITS.free).toBe(1.0);
      expect(RATE_LIMITS.basic).toBe(1.0);
    });

    it('should have pro at 10% discount', () => {
      expect(RATE_LIMITS.pro).toBe(0.9);
    });

    it('should have enterprise at 20% discount', () => {
      expect(RATE_LIMITS.enterprise).toBe(0.8);
    });
  });
});
