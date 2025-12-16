const referralService = require('../services/referralService');
const User = require('../models/User');

/**
 * Referral Controller
 * Handles all referral-related endpoints
 */

/**
 * GET /api/referrals/my-code
 * Get or generate user's referral code
 */
exports.getMyReferralCode = async (req, res) => {
    try {
        const userId = req.user.id;
        const code = await referralService.getUserReferralCode(userId);

        res.json({
            success: true,
            referralCode: code,
            shareLink: `${process.env.FRONTEND_URL}/register?ref=${code}`,
        });
    } catch (error) {
        console.error('Get referral code error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get referral code',
        });
    }
};

/**
 * GET /api/referrals/stats
 * Get user's referral statistics
 */
exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await referralService.getReferralStats(userId);

        res.json({
            success: true,
            ...stats,
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch referral statistics',
        });
    }
};

/**
 * POST /api/referrals/validate
 * Validate a referral code (used during registration)
 */
exports.validateCode = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Referral code is required',
            });
        }

        const validation = await referralService.validateReferralCode(code);

        if (!validation || !validation.valid) {
            return res.json({
                success: false,
                valid: false,
                reason: validation?.reason || 'INVALID_CODE',
            });
        }

        res.json({
            success: true,
            valid: true,
            referrerName: validation.referrer.name,
        });
    } catch (error) {
        console.error('Validate referral code error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate referral code',
        });
    }
};

/**
 * GET /api/referrals/config
 * Get referral system configuration (for frontend)
 */
exports.getConfig = async (req, res) => {
    try {
        res.json({
            success: true,
            config: {
                referrerReward: referralService.REFERRAL_CONFIG.REFERRER_REWARD,
                refereeReward: referralService.REFERRAL_CONFIG.REFEREE_REWARD,
                minActions: referralService.REFERRAL_CONFIG.MIN_ACTIONS_FOR_VALIDATION,
                minAccountAgeHours: referralService.REFERRAL_CONFIG.MIN_ACCOUNT_AGE_HOURS,
                monthlyLimit: referralService.REFERRAL_CONFIG.MONTHLY_LIMIT,
            },
        });
    } catch (error) {
        console.error('Get referral config error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get referral configuration',
        });
    }
};

module.exports = exports;
