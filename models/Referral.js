const mongoose = require('mongoose');

/**
 * Referral Model
 * Tracks referral relationships and validation status
 */
const referralSchema = new mongoose.Schema({
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    referredUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referralCode: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'validated', 'rewarded'],
        default: 'pending'
    },
    signupDate: {
        type: Date,
        default: Date.now
    },
    validationDate: {
        type: Date
    },
    rewardedDate: {
        type: Date
    },
    actionsCompleted: {
        type: Number,
        default: 0
    },
    // Abuse prevention
    ipAddress: String,
    deviceFingerprint: String,
    suspicionScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
}, {
    timestamps: true
});

// Index for efficient queries
referralSchema.index({ referrerId: 1, status: 1 });
referralSchema.index({ referredUserId: 1 });
referralSchema.index({ createdAt: -1 });

// Methods
referralSchema.methods.validateReferral = function () {
    this.status = 'validated';
    this.validationDate = new Date();
    return this.save();
};

referralSchema.methods.reward = function () {
    this.status = 'rewarded';
    this.rewardedDate = new Date();
    return this.save();
};

module.exports = mongoose.model('Referral', referralSchema);
