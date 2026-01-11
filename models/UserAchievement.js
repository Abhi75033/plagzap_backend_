const mongoose = require('mongoose');

/**
 * UserAchievement Model
 * Tracks which achievements each user has unlocked and their progress
 */
const userAchievementSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    achievementId: {
        type: String, // References Achievement.id
        required: true,
        index: true
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    unlocked: {
        type: Boolean,
        default: false
    },
    unlockedAt: {
        type: Date
    },
    notified: {
        type: Boolean,
        default: false
    },
    // Cached from Achievement for performance
    name: String,
    icon: String,
    rarity: String,
    coinReward: Number,
    xpReward: Number
}, {
    timestamps: true
});

// Compound index for fast lookups
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

// Index for querying unlocked achievements
userAchievementSchema.index({ userId: 1, unlocked: 1 });

module.exports = mongoose.model('UserAchievement', userAchievementSchema);
