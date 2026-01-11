const AchievementService = require('../services/achievementService');
const { ACHIEVEMENTS } = require('../models/Achievement');

/**
 * Achievement Controller
 * Handles achievement-related API endpoints
 */

// GET /api/achievements - Get all achievements
exports.getAllAchievements = async (req, res) => {
    try {
        res.json({
            success: true,
            achievements: ACHIEVEMENTS,
            total: ACHIEVEMENTS.length
        });
    } catch (error) {
        console.error('Get all achievements error:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
};

// GET /api/achievements/my-progress - Get user's achievement progress
exports.getMyProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const progress = await AchievementService.getUserProgress(userId);
        const stats = await AchievementService.getUserStats(userId);

        res.json({
            success: true,
            progress,
            stats
        });
    } catch (error) {
        console.error('Get my progress error:', error);
        res.status(500).json({ error: 'Failed to fetch achievement progress' });
    }
};

//GET /api/achievements/recent - Get recently unlocked achievements
exports.getRecentUnlocks = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 5 } = req.query;

        const recent = await AchievementService.getRecentUnlocks(userId, parseInt(limit));

        res.json({
            success: true,
            recent,
            count: recent.length
        });
    } catch (error) {
        console.error('Get recent unlocks error:', error);
        res.status(500).json({ error: 'Failed to fetch recent achievements' });
    }
};

// POST /api/achievements/check - Manually trigger achievement check (for testing)
exports.checkAchievements = async (req, res) => {
    try {
        const userId = req.user.id;
        const { action, data } = req.body;

        const unlocked = await AchievementService.checkAchievements(userId, action, data);

        res.json({
            success: true,
            unlocked,
            count: unlocked.length
        });
    } catch (error) {
        console.error('Check achievements error:', error);
        res.status(500).json({ error: 'Failed to check achievements' });
    }
};
