const express = require('express');
const router = express.Router();
const { requireJwtAuth } = require('~/server/middleware');
const { createCheckoutSession, RECHARGE_PACKAGES } = require('@librechat/api');
const { logger } = require('~/config/logger');

// GET /api/payment/packages - List available recharge packages
router.get('/packages', (req, res) => {
  res.json({
    packages: RECHARGE_PACKAGES.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      price: pkg.price,
      priceDisplay: `¥${pkg.price / 100}`,
    })),
  });
});

// POST /api/payment/checkout - Create Stripe checkout session
router.post('/checkout', requireJwtAuth, async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.id;

    if (!packageId) {
      return res.status(400).json({ error: 'packageId is required' });
    }

    const validIds = RECHARGE_PACKAGES.map((p) => p.id);
    if (!validIds.includes(packageId)) {
      return res.status(400).json({ error: 'Invalid packageId' });
    }

    const baseUrl = process.env.DOMAIN || 'http://localhost:3080';
    const session = await createCheckoutSession({
      userId,
      packageId,
      successUrl: `${baseUrl}/balance?success=true`,
      cancelUrl: `${baseUrl}/balance?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('[Payment] checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

module.exports = router;
