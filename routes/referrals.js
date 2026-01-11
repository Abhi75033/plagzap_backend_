const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const authMiddleware = require('../middleware/auth');

/**
 * Referral Routes
 * All routes require authentication except validation
 */

// GET /api/referrals/my-code - Get user's referral code
router.get('/my-code', authMiddleware, referralController.getMyReferralCode);

// GET /api/referrals/stats - Get referral statistics
router.get('/stats', authMiddleware, referralController.getStats);

// POST /api/referrals/validate - Validate a referral code (used during registration)
router.post('/validate', referralController.validateCode);

// GET /api/referrals/config - Get referral system configuration
router.get('/config', referralController.getConfig);

module.exports = router;
