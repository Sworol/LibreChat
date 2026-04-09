const express = require('express');
const router = express.Router();
const controller = require('../controllers/Balance');
const { requireJwtAuth } = require('../middleware/');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { logger } = require('~/config/logger');
const db = require('~/models');

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

// POST /api/balance/admin/add - Admin manually adds credits to a user
router.post('/admin/add', requireJwtAuth, requireAdminAccess, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid userId or amount' });
    }

    const adminId = req.user.id;

    // Create a recharge transaction
    const Transaction = db.Transaction;
    const transaction = new Transaction({
      user: userId,
      tokenType: 'recharge',
      context: reason || 'manual_recharge',
      rawAmount: amount,
      adminId,
    });

    // Calculate token value (rate = 1 for manual recharge)
    transaction.tokenValue = amount;
    transaction.rate = 1;

    await transaction.save();

    // Update balance
    const balance = await db.updateBalance({
      user: userId,
      incrementValue: amount,
    });

    logger.info(`[AdminBalance] Admin ${adminId} added ${amount} credits to user ${userId}`);

    return res.status(200).json({
      success: true,
      balance: balance.tokenCredits,
      message: `Added ${amount} credits to user`,
    });
  } catch (error) {
    logger.error('[AdminBalance] addCreditsAdmin error:', error);
    return res.status(500).json({ error: 'Failed to add credits' });
  }
});

// GET /api/balance/admin/:userId - Get a user's balance (admin)
router.get('/admin/:userId', requireJwtAuth, requireAdminAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const balance = await db.findBalanceByUser(userId);
    return res.status(200).json({
      userId,
      balance: balance?.tokenCredits ?? 0,
    });
  } catch (error) {
    logger.error('[AdminBalance] getUserBalanceAdmin error:', error);
    return res.status(500).json({ error: 'Failed to get balance' });
  }
});

// GET /api/balance/admin/:userId/transactions - Get a user's transaction history (admin)
router.get('/admin/:userId/transactions', requireJwtAuth, requireAdminAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const transactions = await db.getTransactions(
      { user: userId },
      { limit: parseInt(limit, 10), offset: parseInt(offset, 10), sort: { createdAt: -1 } }
    );

    return res.status(200).json({ transactions });
  } catch (error) {
    logger.error('[AdminBalance] getUserTransactionsAdmin error:', error);
    return res.status(500).json({ error: 'Failed to get transactions' });
  }
});

router.get('/', requireJwtAuth, controller);
router.get('/transactions', requireJwtAuth, controller.transactions);

module.exports = router;
