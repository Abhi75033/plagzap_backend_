const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const referralService = require('./referralService'); // Phase 2: Referral tracking

/**
 * Streak Service
 * Handles all streak-related logic
 * CRITICAL: Login alone does NOT count - only meaningful actions
 */

// Streak milestone rewards (in coins)
const STREAK_MILESTONES = {
    1: 2,
    7: 30,
    30: 60,
    45: 90,
    60: 120
};

class StreakService {
    /**
     * Record a meaningful action for streak tracking
     * @param {String} userId - User ID
     * @param {String} actionType - Type of action ('analyze', 'humanize', etc.)
     */
    async recordAction(userId, actionType) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of day

            // Find or create activity record for today
            let activity = await UserActivity.findOne({
                userId,
                date: today
            });

            if (!activity) {
                activity = new UserActivity({
                    userId,
                    date: today,
                    actions: [],
                    isValidDay: false
                });
            }

            // Add action and mark day as valid
            await activity.addAction(actionType);

            // Update user's lastActiveDate
            const user = await User.findById(userId);
            if (user) {
                user.lastActiveDate = new Date();
                await user.save();
            }

            // PHASE 2: Track referral progress (non-blocking)
            try {
                await referralService.incrementReferralActions(userId);
            } catch (error) {
                console.warn('Referral action tracking failed (non-critical):', error.message);
            }

            return { success: true, activity };
        } catch (error) {
            console.error('Error recording action:', error);
            throw error;
        }
    }

    /**
     * Calculate & update user's current streak
     * Called daily by cron job or on demand
     * @param {String} userId - User ID
     */
    async calculateStreak(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Get all valid activity days, sorted descending
            const activities = await UserActivity.find({
                userId,
                isValidDay: true
            }).sort({ date: -1 });

            if (activities.length === 0) {
                user.currentStreak = 0;
                await user.save();
                return { currentStreak: 0, longestStreak: user.longestStreak };
            }

            // Calculate current streak
            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = 0; i < activities.length; i++) {
                const activityDate = new Date(activities[i].date);
                activityDate.setHours(0, 0, 0, 0);

                const expectedDate = new Date(today);
                expectedDate.setDate(expectedDate.getDate() - i);
                expectedDate.setHours(0, 0, 0, 0);

                if (activityDate.getTime() === expectedDate.getTime()) {
                    streak++;
                } else {
                    break; // Streak broken
                }
            }

            // Update user's streak
            user.currentStreak = streak;
            if (streak > user.longestStreak) {
                user.longestStreak = streak;
            }

            await user.save();

            return {
                currentStreak: streak,
                longestStreak: user.longestStreak,
                lastActiveDate: user.lastActiveDate
            };
        } catch (error) {
            console.error('Error calculating streak:', error);
            throw error;
        }
    }

    /**
     * Get available milestone rewards for user
     * @param {String} userId - User ID
     */
    async getAvailableMilestones(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const claimedMilestones = user.streakMilestones.map(m => m.days);
            const available = [];

            for (const [days, coins] of Object.entries(STREAK_MILESTONES)) {
                const daysNum = parseInt(days);
                if (user.currentStreak >= daysNum && !claimedMilestones.includes(daysNum)) {
                    available.push({
                        days: daysNum,
                        coins,
                        canClaim: true
                    });
                }
            }

            return available;
        } catch (error) {
            console.error('Error getting available milestones:', error);
            throw error;
        }
    }

    /**
     * Claim a streak milestone reward
     * @param {String} userId - User ID  
     * @param {Number} days - Milestone days to claim
     */
    async claimMilestone(userId, days) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Check if milestone exists
            if (!STREAK_MILESTONES[days]) {
                throw new Error('Invalid milestone');
            }

            // Check if already claimed
            const alreadyClaimed = user.streakMilestones.some(m => m.days === days);
            if (alreadyClaimed) {
                throw new Error('Milestone already claimed');
            }

            // Check if user has reached this milestone
            if (user.currentStreak < days) {
                throw new Error('Milestone not reached yet');
            }

            const coinReward = STREAK_MILESTONES[days];

            // Add milestone to claimed list
            user.streakMilestones.push({
                days,
                claimedAt: new Date(),
                coinReward
            });

            // Award coins (will be done via coinService)
            await user.save();

            return {
                success: true,
                days,
                coinReward,
                claimedAt: new Date()
            };
        } catch (error) {
            console.error('Error claiming milestone:', error);
            throw error;
        }
    }
}

module.exports = new StreakService();
