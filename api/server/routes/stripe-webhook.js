const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { stripe } = require('@librechat/api');
const { logger } = require('~/config/logger');
const db = require('~/models');

/**
 * Parse and validate credits from Stripe metadata.
 * Returns null if invalid to prevent NaN corruption.
 */
function parseCredits(creditsStr) {
  if (!creditsStr) {
    return null;
  }
  const parsed = parseInt(creditsStr, 10);
  if (isNaN(parsed) || parsed <= 0) {
    logger.error(`[Stripe Webhook] Invalid credits value: "${creditsStr}"`);
    return null;
  }
  return parsed;
}

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, credits: creditsStr } = session.metadata;

      // Validate required metadata
      if (!userId || !creditsStr) {
        logger.error('[Stripe Webhook] Missing metadata in session:', session.id);
        return res.json({ received: true, error: 'missing_metadata' });
      }

      // Validate credits parsing (prevents NaN)
      const credits = parseCredits(creditsStr);
      if (credits === null) {
        return res.json({ received: true, error: 'invalid_credits' });
      }

      // Validate user exists before any processing
      const User = mongoose.models.User;
      const userExists = await User.findById(userId).lean();
      if (!userExists) {
        logger.error(`[Stripe Webhook] User not found: ${userId}`);
        return res.json({ received: true, error: 'user_not_found' });
      }

      // Use MongoDB transaction for atomicity
      const mongoSession = await mongoose.startSession();
      try {
        mongoSession.startTransaction();

        // Idempotency check within transaction
        const existingTx = await db.Transaction.findOne({ paymentId: session.id }).session(
          mongoSession,
        );
        if (existingTx) {
          await mongoSession.abortTransaction();
          logger.warn('[Stripe Webhook] Duplicate session ignored:', session.id);
          return res.json({ received: true, duplicate: true });
        }

        // Create recharge transaction
        const Transaction = db.Transaction;
        const transaction = new Transaction({
          user: userId,
          tokenType: 'recharge',
          context: 'stripe_payment',
          rawAmount: credits,
          paymentId: session.id,
        });
        transaction.tokenValue = credits;
        transaction.rate = 1;
        await transaction.save({ session: mongoSession });

        // Update balance atomically within transaction
        await db.updateBalance({
          user: userId,
          incrementValue: credits,
        });

        // Commit transaction
        await mongoSession.commitTransaction();
        logger.info(`[Stripe Webhook] Credits added: ${credits} to user ${userId}`);
      } catch (error) {
        await mongoSession.abortTransaction();
        logger.error('[Stripe Webhook] Transaction failed:', error);
        throw error;
      } finally {
        mongoSession.endSession();
      }
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
