const { ACHIEVEMENTS } = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const User = require('../models/User');
const coinService = require('./coinService');

/**
 * Achievement Service
 * Handles achievement checking, unlocking, and progress tracking
 */
class AchievementService {
    /**
     * Check all achievements for a user after an action
     */
    static async checkAchievements(userId, action, data = {}) {
        try {
            const user = await User.findById(userId);
            if (!user) return [];

            const newlyUnlocked = [];

            for (const achievement of ACHIEVEMENTS) {
                // Check if already unlocked
                const existing = await UserAchievement.findOne({
                    userId,
                    achievementId: achievement.id
                });

                if (existing?.unlocked) continue;

                // Check if achievement should be unlocked
                const shouldUnlock = await this.checkRequirement(user, achievement, data);
                const progress = await this.calculateProgress(user, achievement, data);

                if (shouldUnlock && !existing) {
                    // Award achievement
                    const awarded = await this.awardAchievement(userId, achievement);
                    newlyUnlocked.push(awarded);
                } else if (existing) {
                    // Update progress
                    existing.progress = progress;
                    await existing.save();
                }
            }

            return newlyUnlocked;
        } catch (error) {
            console.error('Check achievements error:', error);
            return [];
        }
    }

    /**
     * Check if achievement requirement is met
     */
    static async checkRequirement(user, achievement, data) {
        const { requirement } = achievement;

        switch (requirement.type) {
            case 'count':
                return this.checkCount(user, requirement.metric, requirement.target);

            case 'streak':
                return user.currentStreak >= requirement.target;

            case 'threshold':
                return this.checkThreshold(user, requirement.metric, requirement.target, data);

            default:
                return false;
        }
    }

    /**
     * Check count-based requirements
     */
    static checkCount(user, metric, target) {
        switch (metric) {
            case 'scans':
                return user.usageCount >= target;
            case 'rewrites':
                return user.usageCount >= target; // Can be separated if needed
            case 'referrals':
                return user.referralStats?.successfulReferrals >= target;
            case 'emailVerified':
                return user.emailVerified;
            default:
                return false;
        }
    }

    /**
     * Check threshold-based requirements
     */
    static checkThreshold(user, metric, target, data) {
        switch (metric) {
            case 'wordsProcessed':
                return user.totalWordsProcessed >= target;
            case 'singleScanWords':
                return data.wordsCount >= target;
            case 'leaderboardRank':
                return data.rank <= target;
            case 'earlyUser':
                // Check if user joined before a certain date (beta phase)
                const betaEndDate = new Date('2025-12-31');
                return user.createdAt < betaEndDate;
            default:
                return false;
        }
    }

    /**
     * Calculate progress percentage
     */
    static async calculateProgress(user, achievement, data) {
        const { requirement } = achievement;
        let current = 0;

        switch (requirement.type) {
            case 'count':
                current = this.getCurrentCount(user, requirement.metric);
                break;
            case 'streak':
                current = user.currentStreak;
                break;
            case 'threshold':
                current = this.getCurrentThreshold(user, requirement.metric, data);
                break;
        }

        return Math.min(100, Math.round((current / requirement.target) * 100));
    }

    static getCurrentCount(user, metric) {
        switch (metric) {
            case 'scans':
            case 'rewrites':
                return user.usageCount;
            case 'referrals':
                return user.referralStats?.successfulReferrals || 0;
            case 'emailVerified':
                return user.emailVerified ? 1 : 0;
            default:
                return 0;
        }
    }

    static getCurrentThreshold(user, metric, data) {
        switch (metric) {
            case 'wordsProcessed':
                return user.totalWordsProcessed || 0;
            case 'singleScanWords':
                return data.wordsCount || 0;
            case 'leaderboardRank':
                return data.rank || 999;
            case 'earlyUser':
                return 1;
            default:
                return 0;
        }
    }

    /**
     * Award achievement to user
     */
    static async awardAchievement(userId, achievement) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Create achievement record
            const userAchievement = await UserAchievement.create({
                userId,
                achievementId: achievement.id,
                progress: 100,
                unlocked: true,
                unlockedAt: new Date(),
                name: achievement.name,
                icon: achievement.icon,
                rarity: achievement.rarity,
                coinReward: achievement.coinReward,
                xpReward: achievement.xpReward
            });

            // Award coins
            if (achievement.coinReward > 0) {
                await coinService.addCoins(
                    userId,
                    achievement.coinReward,
                    'achievement',
                    `Achievement unlocked: ${achievement.name}`
                );
            }

            // Award XP (add to user model if needed)
            if (achievement.xpReward > 0) {
                user.xp = (user.xp || 0) + achievement.xpReward;
                await user.save();
            }

            console.log(`✅ Achievement unlocked: ${user.email} - ${achievement.name}`);

            return userAchievement;
        } catch (error) {
            console.error('Award achievement error:', error);
            throw error;
        }
    }

    /**
     * Get user's progress on all achievements
     */
    static async getUserProgress(userId) {
        try {
            const userAchievements = await UserAchievement.find({ userId });
            const achievementMap = new Map(
                userAchievements.map(ua => [ua.achievementId, ua])
            );

            const progress = ACHIEVEMENTS.map(achievement => {
                const userAch = achievementMap.get(achievement.id);
                return {
                    ...achievement,
                    progress: userAch?.progress || 0,
                    unlocked: userAch?.unlocked || false,
                    unlockedAt: userAch?.unlockedAt || null
                };
            });

            return progress;
        } catch (error) {
            console.error('Get user progress error:', error);
            return [];
        }
    }

    /**
     * Get recently unlocked achievements for user
     */
    static async getRecentUnlocks(userId, limit = 5) {
        try {
            return await UserAchievement.find({
                userId,
                unlocked: true
            })
                .sort({ unlockedAt: -1 })
                .limit(limit);
        } catch (error) {
            console.error('Get recent unlocks error:', error);
            return [];
        }
    }

    /**
     * Get achievement statistics for user
     */
    static async getUserStats(userId) {
        try {
            const total = ACHIEVEMENTS.length;
            const unlocked = await UserAchievement.countDocuments({
                userId,
                unlocked: true
            });

            const totalXP = await UserAchievement.aggregate([
                { $match: { userId: mongoose.Types.ObjectId(userId), unlocked: true } },
                { $group: { _id: null, totalXP: { $sum: '$xpReward' } } }
            ]);

            return {
                total,
                unlocked,
                locked: total - unlocked,
                percentComplete: Math.round((unlocked / total) * 100),
                totalXP: totalXP[0]?.totalXP || 0
            };
        } catch (error) {
            console.error('Get user stats error:', error);
            return { total: 0, unlocked: 0, locked: 0, percentComplete: 0, totalXP: 0 };
        }
    }
}

module.exports = AchievementService;
