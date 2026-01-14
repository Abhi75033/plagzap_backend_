const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewardsController');
const authMiddleware = require('../middleware/auth'); // Fixed: use default export
const { checkRewardEligibility } = require('../middleware/checkRewardEligibility');
const requireCaptcha = require('../middleware/requireCaptcha'); // Phase 4: CAPTCHA

/**
 * Rewards Routes
 * All routes require authentication
 * Sensitive routes (claim/redeem) require eligibility (email verified + 24h account + 2 actions)
 * High-risk routes also require CAPTCHA based on abuse detection scoring
 */

// GET /api/rewards/balance - Get coin balance and streak info
router.get('/balance', authMiddleware, rewardsController.getBalance);

// GET /api/rewards/history - Get transaction history
router.get('/history', authMiddleware, rewardsController.getHistory);

// GET /api/rewards/shop - Get redemption shop items
router.get('/shop', authMiddleware, rewardsController.getShop);

// POST /api/rewards/track-activity - Track meaningful action
router.post('/track-activity', authMiddleware, rewardsController.trackActivity);

// POST /api/rewards/claim-milestone - Claim streak milestone (PROTECTED + CAPTCHA)
router.post('/claim-milestone', authMiddleware, checkRewardEligibility, requireCaptcha, rewardsController.claimMilestone);

// POST /api/rewards/redeem - Redeem coins (PROTECTED + CAPTCHA)
router.post('/redeem', authMiddleware, checkRewardEligibility, requireCaptcha, rewardsController.redeem);

module.exports = router;


