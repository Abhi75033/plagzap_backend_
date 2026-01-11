const mongoose = require('mongoose');

/**
 * LeaderboardEntry Model
 * Stores user rankings for global and university leaderboards
 */
const leaderboardEntrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    universityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'University',
        default: null,
        index: true
    },
    period: {
        type: String,
        enum: ['weekly', 'monthly', 'alltime'],
        required: true
    },
    score: {
        type: Number,
        default: 0,
        index: true
    },
    rank: {
        type: Number,
        default: 0
    },
    stats: {
        scans: {
            type: Number,
            default: 0
        },
        wordsProcessed: {
            type: Number,
            default: 0
        },
        achievementsCount: {
            type: Number,
            default: 0
        },
        streak: {
            type: Number,
            default: 0
        },
        coins: {
            type: Number,
            default: 0
        },
        xp: {
            type: Number,
            default: 0
        }
    },
    // Cached user info for performance
    userName: String,
    userEmail: String
}, {
    timestamps: true
});

// Compound indexes for efficient leaderboard queries
leaderboardEntrySchema.index({ period: 1, universityId: 1, score: -1 });
leaderboardEntrySchema.index({ period: 1, score: -1 });
leaderboardEntrySchema.index({ userId: 1, period: 1, universityId: 1 }, { unique: true });

module.exports = mongoose.model('LeaderboardEntry', leaderboardEntrySchema);
