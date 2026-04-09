const { findBalanceByUser, getTransactions } = require('~/models');

async function balanceController(req, res) {
  const balanceData = await findBalanceByUser(req.user.id);

  if (!balanceData) {
    return res.status(404).json({ error: 'Balance not found' });
  }

  const { _id: _, ...result } = balanceData;

  if (!result.autoRefillEnabled) {
    delete result.refillIntervalValue;
    delete result.refillIntervalUnit;
    delete result.lastRefill;
    delete result.refillAmount;
  }

  res.status(200).json(result);
}

async function transactionsController(req, res) {
  try {
    const { limit = '50', offset = '0' } = req.query;
    const transactions = await getTransactions(
      { user: req.user.id },
      { limit: parseInt(limit, 10), offset: parseInt(offset, 10), sort: { createdAt: -1 } }
    );
    res.status(200).json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
}

module.exports = balanceController;
module.exports.transactions = transactionsController;
