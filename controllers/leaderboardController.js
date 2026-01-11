const LeaderboardService = require('../services/leaderboardService');

/**
 * Leaderboard Controller
 * Handles leaderboard-related API endpoints
 */

// GET /api/leaderboard/global - Get global leaderboard
exports.getGlobalLeaderboard = async (req, res) => {
    try {
        const { period = 'weekly', limit = 100 } = req.query;

        const entries = await LeaderboardService.getLeaderboard('global', period, parseInt(limit));

        res.json({
            success: true,
            leaderboard: entries,
            total: entries.length,
            period,
            type: 'global'
        });
    } catch (error) {
        console.error('Get global leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

// GET /api/leaderboard/university - Get university leaderboard
exports.getUniversityLeaderboard = async (req, res) => {
    try {
        const { period = 'weekly', limit = 100 } = req.query;
        const userId = req.user.id;

        // Get user's university from their profile
        const User = require('../models/User');
        const user = await User.findById(userId);

        if (!user.universityId) {
            return res.status(400).json({
                error: 'No university associated with your account',
                message: 'Please update your profile with your university email'
            });
        }

        const entries = await LeaderboardService.getLeaderboard('university', period, parseInt(limit));

        res.json({
            success: true,
            leaderboard: entries,
            total: entries.length,
            period,
            type: 'university',
            universityId: user.universityId
        });
    } catch (error) {
        console.error('Get university leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch university leaderboard' });
    }
};

// GET /api/leaderboard/my-rank - Get user's current rank
exports.getMyRank = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = 'global', period = 'weekly' } = req.query;

        const rank = await LeaderboardService.getUserRank(userId, type, period);

        if (!rank) {
            return res.json({
                success: true,
                rank: null,
                message: 'You are not yet ranked. Complete more activities to appear on the leaderboard!'
            });
        }

        res.json({
            success: true,
            rank: rank.rank,
            score: rank.score,
            stats: rank.stats,
            period,
            type
        });
    } catch (error) {
        console.error('Get my rank error:', error);
        res.status(500).json({ error: 'Failed to fetch rank' });
    }
};

// GET /api/leaderboard/top-performers - Get top performers for homepage
exports.getTopPerformers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const topPerformers = await LeaderboardService.getTopPerformers(parseInt(limit));

        res.json({
            success: true,
            topPerformers,
            total: topPerformers.length
        });
    } catch (error) {
        console.error('Get top performers error:', error);
        res.status(500).json({ error: 'Failed to fetch top performers' });
    }
};
