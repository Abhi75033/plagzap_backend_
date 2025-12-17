const mongoose = require('mongoose');

/**
 * Achievement Model
 * Pre-defined achievements that users can unlock
 */
const achievementSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['milestone', 'streak', 'usage', 'social'],
        required: true
    },
    icon: {
        type: String,
        default: '🏆'
    },
    rarity: {
        type: String,
        enum: ['common', 'rare', 'epic', 'legendary'],
        default: 'common'
    },
    requirement: {
        type: {
            type: String,
            enum: ['count', 'streak', 'threshold'],
            required: true
        },
        target: {
            type: Number,
            required: true
        },
        metric: {
            type: String,
            required: true
        }
    },
    coinReward: {
        type: Number,
        default: 0
    },
    xpReward: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Pre-defined achievements
const ACHIEVEMENTS = [
    // Milestone Achievements
    {
        id: 'first_scan',
        name: 'First Steps',
        description: 'Complete your first plagiarism check',
        category: 'milestone',
        icon: '🎯',
        rarity: 'common',
        requirement: { type: 'count', target: 1, metric: 'scans' },
        coinReward: 50,
        xpReward: 100
    },
    {
        id: 'power_user',
        name: 'Power User',
        description: 'Complete 100 plagiarism scans',
        category: 'milestone',
        icon: '🚀',
        rarity: 'epic',
        requirement: { type: 'count', target: 100, metric: 'scans' },
        coinReward: 500,
        xpReward: 1000
    },
    {
        id: 'wordsmith',
        name: 'Wordsmith',
        description: 'Process 10,000 words total',
        category: 'milestone',
        icon: '📝',
        rarity: 'rare',
        requirement: { type: 'threshold', target: 10000, metric: 'wordsProcessed' },
        coinReward: 100,
        xpReward: 200
    },

    // Streak Achievements
    {
        id: 'on_fire',
        name: 'On Fire',
        description: 'Maintain a 3-day streak',
        category: 'streak',
        icon: '🔥',
        rarity: 'common',
        requirement: { type: 'streak', target: 3, metric: 'days' },
        coinReward: 100,
        xpReward: 200
    },
    {
        id: 'week_warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        category: 'streak',
        icon: '⚡',
        rarity: 'rare',
        requirement: { type: 'streak', target: 7, metric: 'days' },
        coinReward: 200,
        xpReward: 500
    },
    {
        id: 'dedicated',
        name: 'Dedicated Scholar',
        description: 'Maintain a 30-day streak',
        category: 'streak',
        icon: '💎',
        rarity: 'legendary',
        requirement: { type: 'streak', target: 30, metric: 'days' },
        coinReward: 1000,
        xpReward: 2000
    },

    // Usage Achievements
    {
        id: 'ai_writer',
        name: 'AI Writer',
        description: 'Use AI rewriting 10 times',
        category: 'usage',
        icon: '🎨',
        rarity: 'common',
        requirement: { type: 'count', target: 10, metric: 'rewrites' },
        coinReward: 150,
        xpReward: 300
    },
    {
        id: 'detail_oriented',
        name: 'Detail Oriented',
        description: 'Scan a document over 5,000 words',
        category: 'usage',
        icon: '🔍',
        rarity: 'rare',
        requirement: { type: 'threshold', target: 5000, metric: 'singleScanWords' },
        coinReward: 200,
        xpReward: 400
    },

    // Social Achievements
    {
        id: 'referral_starter',
        name: 'Social Butterfly',
        description: 'Refer your first friend',
        category: 'social',
        icon: '🤝',
        rarity: 'common',
        requirement: { type: 'count', target: 1, metric: 'referrals' },
        coinReward: 100,
        xpReward: 200
    },
    {
        id: 'referral_king',
        name: 'Referral King',
        description: 'Refer 5 friends successfully',
        category: 'social',
        icon: '👑',
        rarity: 'epic',
        requirement: { type: 'count', target: 5, metric: 'referrals' },
        coinReward: 300,
        xpReward: 600
    },
    {
        id: 'top_10',
        name: 'Top Performer',
        description: 'Reach top 10 on any leaderboard',
        category: 'social',
        icon: '🏆',
        rarity: 'epic',
        requirement: { type: 'threshold', target: 10, metric: 'leaderboardRank' },
        coinReward: 500,
        xpReward: 1000
    },

    // Special Achievements
    {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Join during beta phase',
        category: 'milestone',
        icon: '🌅',
        rarity: 'legendary',
        requirement: { type: 'threshold', target: 1, metric: 'earlyUser' },
        coinReward: 500,
        xpReward: 1000
    },
    {
        id: 'verified',
        name: 'Verified Scholar',
        description: 'Verify your email address',
        category: 'milestone',
        icon: '✅',
        rarity: 'common',
        requirement: { type: 'count', target: 1, metric: 'emailVerified' },
        coinReward: 50,
        xpReward: 100
    }
];

module.exports = mongoose.model('Achievement', achievementSchema);
module.exports.ACHIEVEMENTS = ACHIEVEMENTS;
