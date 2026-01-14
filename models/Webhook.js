const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    url: {
        type: String,
        required: true,
        match: [/^https?:\/\//, 'URL must start with http:// or https://'],
    },
    secret: {
        type: String,
        required: true,
    },
    events: [{
        type: String,
        enum: ['analysis.completed'],
        default: 'analysis.completed',
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastFailure: {
        type: Date,
        default: null,
    },
    failureCount: {
        type: Number,
        default: 0,
    }
});

// Reset failure count on successful dispatch (handled in service)
webhookSchema.methods.resetFailures = function () {
    this.failureCount = 0;
    this.lastFailure = null;
    return this.save();
};

// Increment failure
webhookSchema.methods.recordFailure = function () {
    this.failureCount += 1;
    this.lastFailure = new Date();
    // Auto-disable if too many failures
    if (this.failureCount >= 10) {
        this.isActive = false;
    }
    return this.save();
};

module.exports = mongoose.model('Webhook', webhookSchema);
