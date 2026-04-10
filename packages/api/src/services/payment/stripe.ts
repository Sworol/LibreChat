import Stripe from 'stripe';

/** Stripe API client */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

/** Recharge packages: CNY price (分) -> credits */
export const RECHARGE_PACKAGES = [
  { id: 'basic', credits: 1000, price: 1000, name: 'Basic Pack' },
  { id: 'standard', credits: 3500, price: 3000, name: 'Standard Pack' },
  { id: 'premium', credits: 6000, price: 5000, name: 'Premium Pack' },
  { id: 'vip', credits: 15000, price: 12000, name: 'VIP Pack' },
] as const;

export type RechargePackageId = typeof RECHARGE_PACKAGES[number]['id'];

/**
 * Create a Stripe Checkout session for credit purchase
 */
export async function createCheckoutSession({
  userId,
  packageId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  packageId: RechargePackageId;
  successUrl: string;
  cancelUrl: string;
}) {
  const pkg = RECHARGE_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    throw new Error(`Unknown package: ${packageId}`);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'wechat_pay', 'alipay'],
    line_items: [
      {
        price_data: {
          currency: 'cny',
          product_data: {
            name: pkg.name,
            description: `${pkg.credits} credits`,
          },
          unit_amount: pkg.price, // in cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      packageId,
      credits: pkg.credits.toString(),
    },
    locale: 'auto',
  });

  return session;
}

/**
 * Verify and extract payment metadata from webhook event
 */
export function verifyWebhookEvent(payload: string, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || '',
  );
}

/**
 * Get package info by ID
 */
export function getPackage(packageId: RechargePackageId) {
  return RECHARGE_PACKAGES.find((p) => p.id === packageId);
}
