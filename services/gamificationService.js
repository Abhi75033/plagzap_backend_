/**
 * GAMIFICATION SERVICE
 * 
 * Handles streaks, badges, and achievements
 */

const User = require('../models/User');

// Badge definitions
const BADGES = {
    FIRST_ANALYSIS: {
        id: 'first_analysis',
        name: 'First Steps',
        description: 'Complete your first analysis',
        icon: '🎯',
        requirement: (user) => user.totalAnalyses >= 1
    },
    ANALYSIS_10: {
        id: 'analysis_10',
        name: 'Getting Started',
        description: 'Complete 10 analyses',
        icon: '📊',
        requirement: (user) => user.totalAnalyses >= 10
    },
    ANALYSIS_50: {
        id: 'analysis_50',
        name: 'Power User',
        description: 'Complete 50 analyses',
        icon: '💪',
        requirement: (user) => user.totalAnalyses >= 50
    },
    ANALYSIS_100: {
        id: 'analysis_100',
        name: 'Century Club',
        description: 'Complete 100 analyses',
        icon: '💯',
        requirement: (user) => user.totalAnalyses >= 100
    },
    STREAK_3: {
        id: 'streak_3',
        name: 'On Fire',
        description: 'Maintain a 3-day streak',
        icon: '🔥',
        requirement: (user) => user.longestStreak >= 3
    },
    STREAK_7: {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: '⚡',
        requirement: (user) => user.longestStreak >= 7
    },
    STREAK_30: {
        id: 'streak_30',
        name: 'Monthly Master',
        description: 'Maintain a 30-day streak',
        icon: '👑',
        requirement: (user) => user.longestStreak >= 30
    },
    EARLY_ADOPTER: {
        id: 'early_adopter',
        name: 'Early Adopter',
        description: 'Joined during launch period',
        icon: '🌟',
        requirement: (user) => {
            const launchEnd = new Date('2025-03-01');
            return user.createdAt < launchEnd;
        }
    },
    PREMIUM_USER: {
        id: 'premium_user',
        name: 'Premium Member',
        description: 'Upgrade to a paid subscription',
        icon: '💎',
        requirement: (user) => user.subscriptionTier !== 'free'
    }
};

/**
 * Check if it's a new day compared to last analysis
 */
const isNewDay = (lastDate) => {
    if (!lastDate) return true;

    const last = new Date(lastDate);
    const today = new Date();

    return last.toDateString() !== today.toDateString();
};

/**
 * Check if streak is broken (more than 1 day gap)
 */
const isStreakBroken = (lastDate) => {
    if (!lastDate) return false;

    const last = new Date(lastDate);
    const today = new Date();
    const diffTime = today - last;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 1;
};

/**
 * Update user streak based on analysis activity
 */
const updateStreak = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return null;

    const wasNewDay = isNewDay(user.lastAnalysisDate);
    const streakBroken = isStreakBroken(user.lastAnalysisDate);

    if (wasNewDay) {
        if (streakBroken) {
            // Reset streak if more than 1 day gap
            user.currentStreak = 1;
        } else {
            // Increment streak
            user.currentStreak += 1;
        }

        // Update longest streak if current is higher
        if (user.currentStreak > user.longestStreak) {
            user.longestStreak = user.currentStreak;
        }

        user.lastAnalysisDate = new Date();
    }

    // Increment total analyses
    user.totalAnalyses = (user.totalAnalyses || 0) + 1;

    await user.save();

    return {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalAnalyses: user.totalAnalyses
    };
};

/**
 * Check and award any new badges
 */
const checkBadges = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return [];

    const newBadges = [];
    const earnedBadgeIds = user.badges.map(b => b.id);

    for (const [key, badge] of Object.entries(BADGES)) {
        // Skip if already earned
        if (earnedBadgeIds.includes(badge.id)) continue;

        // Check if requirement is met
        if (badge.requirement(user)) {
            const newBadge = {
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon: badge.icon,
                earnedAt: new Date()
            };

            user.badges.push(newBadge);
            newBadges.push(newBadge);
        }
    }

    if (newBadges.length > 0) {
        await user.save();
    }

    return newBadges;
};

/**
 * Get user gamification stats
 */
const getGamificationStats = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return null;

    return {
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        totalAnalyses: user.totalAnalyses || 0,
        badges: user.badges || [],
        badgesCount: (user.badges || []).length,
        nextBadge: getNextBadge(user)
    };
};

/**
 * Get the next badge user can earn
 */
const getNextBadge = (user) => {
    const earnedBadgeIds = (user.badges || []).map(b => b.id);

    for (const [key, badge] of Object.entries(BADGES)) {
        if (!earnedBadgeIds.includes(badge.id) && !badge.requirement(user)) {
            return {
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon: badge.icon
            };
        }
    }

    return null;
};

/**
 * Process gamification after analysis (call this after each analysis)
 */
const processAnalysis = async (userId) => {
    const streakResult = await updateStreak(userId);
    const newBadges = await checkBadges(userId);

    return {
        streak: streakResult,
        newBadges
    };
};

module.exports = {
    updateStreak,
    checkBadges,
    getGamificationStats,
    processAnalysis,
    BADGES
};
