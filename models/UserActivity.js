const mongoose = require('mongoose');

/**
 * UserActivity Model
 * Tracks daily meaningful actions to determine if a day counts for streak
 * A day is valid ONLY if user performs ≥1 meaningful action
 */
const userActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    date: {
        type: Date,
        required: true,
        index: true,
    },
    actions: [{
        type: {
            type: String,
            enum: ['analyze', 'humanize', 'generate', 'report', 'grammar', 'citation'],
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        }
    }],
    isValidDay: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
userActivitySchema.index({ userId: 1, date: 1 }, { unique: true });

// Method to add an action and mark day as valid
userActivitySchema.methods.addAction = function (actionType) {
    this.actions.push({
        type: actionType,
        timestamp: new Date()
    });
    // Mark day as valid if has at least 1 action
    this.isValidDay = this.actions.length >= 1;
    return this.save();
};

module.exports = mongoose.model('UserActivity', userActivitySchema);
