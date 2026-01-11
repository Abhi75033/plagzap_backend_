const mongoose = require('mongoose');

/**
 * CoinTransaction Model
 * Tracks all coin earnings and spending for transparency
 */
const coinTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['earn', 'spend'],
        required: true,
    },
    source: {
        type: String,
        enum: [
            // Earning sources
            'streak_milestone',
            'achievement',
            'referral',
            'university_milestone',
            'admin_grant',
            // Spending sources
            'extra_analyses',
            'extra_humanize',
            'temp_premium_24h',
            'temp_premium_72h',
            'advanced_report'
        ],
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    balanceAfter: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    }
}, {
    timestamps: true
});

// Index for efficient user transaction history queries
coinTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CoinTransaction', coinTransactionSchema);
