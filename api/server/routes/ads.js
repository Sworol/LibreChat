const express = require('express');
const router = express.Router();
const { requireJwtAuth } = require('~/server/middleware');
const { canWatchAd, grantAdCredits, getAdStatus } = require('@librechat/api');
const { logger } = require('~/config/logger');

// GET /api/ads/status - Check if user can watch an ad
router.get('/status', requireJwtAuth, async (req, res) => {
  try {
    const status = await getAdStatus(req.user.id);
    res.json(status);
  } catch (error) {
    logger.error('[Ads] status error:', error);
    res.status(500).json({ error: 'Failed to get ad status' });
  }
});

// GET /api/ads/reward - Get a reward ad (stub - integrate with actual ad SDK)
router.get('/reward', requireJwtAuth, async (req, res) => {
  try {
    const { allowed, reason } = await canWatchAd(req.user.id);

    if (!allowed) {
      return res.status(429).json({ error: reason });
    }

    // In production, this would return actual ad content from SDK
    // For now, return a stub response
    res.json({
      adAvailable: true,
      adId: `ad_${Date.now()}`,
      message: 'Watch ad to earn credits',
    });
  } catch (error) {
    logger.error('[Ads] reward error:', error);
    res.status(500).json({ error: 'Failed to get ad' });
  }
});

// POST /api/ads/complete - Verify ad completion and grant credits
router.post('/complete', requireJwtAuth, async (req, res) => {
  try {
    const { adId } = req.body;

    if (!adId) {
      return res.status(400).json({ error: 'adId is required' });
    }

    const result = await grantAdCredits(req.user.id, adId);

    if (!result.success) {
      const statusCode = result.error === 'Ad already redeemed' ? 409 : 429;
      return res.status(statusCode).json({ error: result.error || 'Cannot grant credits' });
    }

    res.json({
      success: true,
      credits: result.credits,
      newBalance: result.newBalance,
    });
  } catch (error) {
    logger.error('[Ads] complete error:', error);
    res.status(500).json({ error: 'Failed to complete ad reward' });
  }
});

module.exports = router;
