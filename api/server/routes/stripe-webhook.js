const express = require('express');
const router = express.Router();
const { stripe, RECHARGE_PACKAGES } = require('@librechat/api');
const { logger } = require('~/config/logger');
const db = require('~/models');

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, credits } = session.metadata;

      if (!userId || !credits) {
        logger.error('[Stripe Webhook] Missing metadata in session:', session.id);
        break;
      }

      // Idempotency check: verify we haven't already processed this session
      const existingTx = await db.getTransactions({ paymentId: session.id });
      if (existingTx && existingTx.length > 0) {
        logger.warn('[Stripe Webhook] Duplicate session ignored:', session.id);
        break;
      }

      // Create recharge transaction
      const Transaction = db.Transaction;
      const transaction = new Transaction({
        user: userId,
        tokenType: 'recharge',
        context: 'stripe_payment',
        rawAmount: parseInt(credits, 10),
        paymentId: session.id,
      });
      transaction.tokenValue = parseInt(credits, 10);
      transaction.rate = 1;
      await transaction.save();

      // Update balance
      await db.updateBalance({
        user: userId,
        incrementValue: parseInt(credits, 10),
      });

      logger.info(`[Stripe Webhook] Credits added: ${credits} to user ${userId}`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      logger.warn('[Stripe Webhook] Payment failed:', paymentIntent.id);
      break;
    }

    default:
      logger.info(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
