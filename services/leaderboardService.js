const LeaderboardEntry = require('../models/LeaderboardEntry');
const User = require('../models/User');
const UserAchievement = require('../models/UserAchievement');

/**
 * Leaderboard Service
 * Handles leaderboard calculations, rankings, and updates
 */
class LeaderboardService {
    /**
     * Calculate user score for leaderboard
     * Formula: coins * 1 + XP * 2 + achievements * 50 + streak * 10
     */
    static calculateScore(user, achievementsCount) {
        const coinScore = (user.totalCoins || 0) * 1;
        const xpScore = (user.xp || 0) * 2;
        const achievementScore = achievementsCount * 50;
        const streakScore = (user.currentStreak || 0) * 10;

        return coinScore + xpScore + achievementScore + streakScore;
    }

    /**
     * Update user's leaderboard entries for all periods
     */
    static async updateLeaderboard(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) return;

            // Get achievement count
            const achievementsCount = await UserAchievement.countDocuments({
                userId,
                unlocked: true
            });

            // Calculate score
            const score = this.calculateScore(user, achievementsCount);

            // Update for all periods
            const periods = ['weekly', 'monthly', 'alltime'];

            for (const period of periods) {
                await this.updatePeriodEntry(userId, user, period, score, achievementsCount);
            }

            // Update rankings for all leaderboards
            await this.updateRankings();
        } catch (error) {
            console.error('Update leaderboard error:', error);
        }
    }

    /**
     * Update leaderboard entry for specific period
     */
    static async updatePeriodEntry(userId, user, period, score, achievementsCount) {
        const stats = {
            scans: user.usageCount || 0,
            wordsProcessed: user.totalWordsProcessed || 0,
            achievementsCount,
            streak: user.currentStreak || 0,
            coins: user.totalCoins || 0,
            xp: user.xp || 0
        };

        // Global leaderboard (universityId = null)
        await LeaderboardEntry.findOneAndUpdate(
            { userId, period, universityId: null },
            {
                score,
                stats,
                userName: user.name,
                userEmail: user.email
            },
            { upsert: true, new: true }
        );

        // University leaderboard (if user has university)
        if (user.universityId) {
            await LeaderboardEntry.findOneAndUpdate(
                { userId, period, universityId: user.universityId },
                {
                    score,
                    stats,
                    userName: user.name,
                    userEmail: user.email
                },
                { upsert: true, new: true }
            );
        }
    }

    /**
     * Update rankings for all leaderboard entries
     */
    static async updateRankings() {
        try {
            const periods = ['weekly', 'monthly', 'alltime'];

            for (const period of periods) {
                // Global rankings
                await this.updatePeriodRankings(period, null);

                // University rankings (get all unique universities)
                const universities = await LeaderboardEntry.distinct('universityId', {
                    period,
                    universityId: { $ne: null }
                });

                for (const universityId of universities) {
                    await this.updatePeriodRankings(period, universityId);
                }
            }
        } catch (error) {
            console.error('Update rankings error:', error);
        }
    }

    /**
     * Update rankings for specific period and optional university
     */
    static async updatePeriodRankings(period, universityId) {
        const query = { period };
        if (universityId) {
            query.universityId = universityId;
        } else {
            query.universityId = null;
        }

        // Get sorted entries
        const entries = await LeaderboardEntry.find(query)
            .sort({ score: -1 })
            .limit(1000); // Limit to top 1000

        // Update ranks
        const bulkOps = entries.map((entry, index) => ({
            updateOne: {
                filter: { _id: entry._id },
                update: { rank: index + 1 }
            }
        }));

        if (bulkOps.length > 0) {
            await LeaderboardEntry.bulkWrite(bulkOps);
        }
    }

    /**
     * Get leaderboard
     */
    static async getLeaderboard(type = 'global', period = 'weekly', limit = 100) {
        try {
            const query = { period };

            if (type === 'university') {
                query.universityId = { $ne: null };
            } else {
                query.universityId = null;
            }

            const entries = await LeaderboardEntry.find(query)
                .sort({ rank: 1 })
                .limit(limit)
                .populate('userId', 'name email profilePicture')
                .populate('universityId', 'name domain');

            return entries;
        } catch (error) {
            console.error('Get leaderboard error:', error);
            return [];
        }
    }

    /**
     * Get user's rank on leaderboard
     */
    static async getUserRank(userId, type = 'global', period = 'weekly') {
        try {
            const query = { userId, period };

            if (type === 'global') {
                query.universityId = null;
            }

            const entry = await LeaderboardEntry.findOne(query);
            return entry || null;
        } catch (error) {
            console.error('Get user rank error:', error);
            return null;
        }
    }

    /**
     * Get top performers (for homepage highlights)
     */
    static async getTopPerformers(limit = 10) {
        try {
            return await this.getLeaderboard('global', 'weekly', limit);
        } catch (error) {
            console.error('Get top performers error:', error);
            return [];
        }
    }
}

module.exports = LeaderboardService;
