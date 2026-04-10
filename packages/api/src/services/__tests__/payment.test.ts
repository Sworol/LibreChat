import * as stripeModule from '../payment/stripe';

const mockCreateSession = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCreateSession(...args),
      },
    },
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  }));
});

// Re-import to get mocked version
import { RECHARGE_PACKAGES, getPackage, createCheckoutSession, verifyWebhookEvent } from '../payment/stripe';

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RECHARGE_PACKAGES', () => {
    it('should have 4 predefined packages', () => {
      expect(RECHARGE_PACKAGES).toHaveLength(4);
    });

    it('should have correct package IDs', () => {
      const ids = RECHARGE_PACKAGES.map((p) => p.id);
      expect(ids).toEqual(['basic', 'standard', 'premium', 'vip']);
    });

    it('should have correct credits for each package', () => {
      expect(RECHARGE_PACKAGES[0].credits).toBe(1000);
      expect(RECHARGE_PACKAGES[1].credits).toBe(3500);
      expect(RECHARGE_PACKAGES[2].credits).toBe(6000);
      expect(RECHARGE_PACKAGES[3].credits).toBe(15000);
    });

    it('should have correct prices in cents', () => {
      expect(RECHARGE_PACKAGES[0].price).toBe(1000); // ¥10
      expect(RECHARGE_PACKAGES[1].price).toBe(3000); // ¥30
      expect(RECHARGE_PACKAGES[2].price).toBe(5000); // ¥50
      expect(RECHARGE_PACKAGES[3].price).toBe(12000); // ¥120
    });
  });

  describe('getPackage', () => {
    it('should return package for valid ID', () => {
      const pkg = getPackage('basic');
      expect(pkg).toBeDefined();
      expect(pkg?.id).toBe('basic');
      expect(pkg?.credits).toBe(1000);
    });

    it('should return undefined for invalid ID', () => {
      const pkg = getPackage('invalid' as any);
      expect(pkg).toBeUndefined();
    });

    it('should return vip package correctly', () => {
      const pkg = getPackage('vip');
      expect(pkg?.credits).toBe(15000);
      expect(pkg?.price).toBe(12000);
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw error for unknown package', async () => {
      await expect(
        createCheckoutSession({
          userId: 'user123',
          packageId: 'invalid' as any,
          successUrl: 'https://success.com',
          cancelUrl: 'https://cancel.com',
        }),
      ).rejects.toThrow('Unknown package: invalid');
    });

    it('should create session with correct metadata', async () => {
      const mockSession = { id: 'cs_test_123', url: 'https://checkout.stripe.com/test' };
      mockCreateSession.mockResolvedValue(mockSession);

      const result = await createCheckoutSession({
        userId: 'user123',
        packageId: 'basic',
        successUrl: 'https://success.com',
        cancelUrl: 'https://cancel.com',
      });

      expect(result).toEqual(mockSession);
      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card', 'wechat_pay', 'alipay'],
          mode: 'payment',
          metadata: {
            userId: 'user123',
            packageId: 'basic',
            credits: '1000',
          },
        }),
      );
    });

    it('should create session with vip package', async () => {
      const mockSession = { id: 'cs_test_vip' };
      mockCreateSession.mockResolvedValue(mockSession);

      await createCheckoutSession({
        userId: 'user456',
        packageId: 'vip',
        successUrl: 'https://success.com',
        cancelUrl: 'https://cancel.com',
      });

      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            userId: 'user456',
            packageId: 'vip',
            credits: '15000',
          },
        }),
      );
    });
  });

  describe('verifyWebhookEvent', () => {
    it('should call stripe.webhooks.constructEvent', () => {
      const mockEvent = { type: 'checkout.session.completed', data: {} };
      mockConstructEvent.mockReturnValue(mockEvent);

      const payload = '{"type":"checkout.session.completed"}';
      const signature = 'sig_123';
      const result = verifyWebhookEvent(payload, signature);

      expect(mockConstructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || '',
      );
      expect(result).toEqual(mockEvent);
    });
  });
});
