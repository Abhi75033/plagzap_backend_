const streakService = require('../services/streakService');
const coinService = require('../services/coinService');
const User = require('../models/User');

/**
 * Rewards Controller
 * Handles all rewards-related endpoints
 */

/**
 * GET /api/rewards/balance
 * Get user's coin balance and current streak info
 */
exports.getBalance = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get coin balance and recent transactions
        const { balance, transactions } = await coinService.getBalance(userId, 5);

        // Get user info for streak data
        const user = await User.findById(userId).select('currentStreak longestStreak lastActiveDate streakMilestones');

        // Get available milestones
        const availableMilestones = await streakService.getAvailableMilestones(userId);

        res.json({
            success: true,
            coins: balance,
            streak: {
                current: user.currentStreak,
                longest: user.longestStreak,
                lastActive: user.lastActiveDate,
                claimedMilestones: user.streakMilestones,
                availableMilestones
            },
            recentTransactions: transactions
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rewards balance'
        });
    }
};

/**
 * GET /api/rewards/history
 * Get complete coin transaction history with pagination
 */
exports.getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const history = await coinService.getTransactionHistory(userId, page, limit);

        res.json({
            success: true,
            ...history
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction history'
        });
    }
};

/**
 * POST /api/rewards/track-activity
 * Track a meaningful action for streak purposes
 * Body: { actionType: 'analyze' | 'humanize' | 'generate' | 'report' | 'grammar' | 'citation' }
 */
exports.trackActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { actionType } = req.body;

        if (!actionType) {
            return res.status(400).json({
                success: false,
                error: 'Action type is required'
            });
        }

        const validActions = ['analyze', 'humanize', 'generate', 'report', 'grammar', 'citation'];
        if (!validActions.includes(actionType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action type'
            });
        }

        // Record the action
        const result = await streakService.recordAction(userId, actionType);

        // Recalculate streak
        const streakInfo = await streakService.calculateStreak(userId);

        res.json({
            success: true,
            activity: result.activity,
            streak: streakInfo
        });
    } catch (error) {
        console.error('Track activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track activity'
        });
    }
};

/**
 * POST /api/rewards/claim-milestone
 * Claim a streak milestone reward
 * Body: { days: 1 | 7 | 30 | 45 | 60 }
 */
exports.claimMilestone = async (req, res) => {
    try {
        const userId = req.user.id;
        const { days } = req.body;

        if (!days) {
            return res.status(400).json({
                success: false,
                error: 'Milestone days required'
            });
        }

        // Claim the milestone
        const milestoneResult = await streakService.claimMilestone(userId, days);

        // Award coins
        const coinResult = await coinService.awardCoins(
            userId,
            milestoneResult.coinReward,
            'streak_milestone',
            `${days}-day streak milestone reward`,
            { milestoneDays: days }
        );

        res.json({
            success: true,
            milestone: milestoneResult,
            coins: coinResult
        });
    } catch (error) {
        console.error('Claim milestone error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to claim milestone'
        });
    }
};

/**
 * POST /api/rewards/redeem
 * Redeem coins for benefits
 * Body: { itemType: 'EXTRA_ANALYSES_5' | 'EXTRA_HUMANIZE_10' | 'TEMP_PREMIUM_24H' | 'TEMP_PREMIUM_72H' }
 */
exports.redeem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemType } = req.body;

        if (!itemType) {
            return res.status(400).json({
                success: false,
                error: 'Item type is required'
            });
        }

        const result = await coinService.redeem(userId, itemType);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Redeem error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to redeem coins'
        });
    }
};

/**
 * GET /api/rewards/shop
 * Get available redemption options
 */
exports.getShop = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('coins');

        const items = coinService.getRedemptionOptions();

        res.json({
            success: true,
            userCoins: user.coins,
            items
        });
    } catch (error) {
        console.error('Get shop error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch shop items'
        });
    }
};
