const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Daily limits per subscription tier
const DAILY_LIMITS = {
    free: 5,         // 5 total (not daily)
    monthly: 100,    // 100/day
    quarterly: 200,  // 200/day
    biannual: 350,   // 350/day
    annual: null,    // Unlimited
};

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    subscriptionTier: {
        type: String,
        enum: ['free', 'monthly', 'quarterly', 'biannual', 'annual'],
        default: 'free',
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    subscriptionExpiry: {
        type: Date,
        default: null,
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'paused', 'suspended'],
        default: 'active',
    },
    adminGranted: {
        type: Boolean,
        default: false,
    },
    adminGrantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    adminGrantedAt: {
        type: Date,
        default: null,
    },
    usageCount: {
        type: Number,
        default: 0,
    },
    dailyUsageCount: {
        type: Number,
        default: 0,
    },
    lastUsageDate: {
        type: Date,
        default: null,
    },
    apiKey: {
        type: String,
        default: null,
    },
    apiKeyCreatedAt: {
        type: Date,
        default: null,
    },
    apiKeyExpiresAt: {
        type: Date,
        default: null,
    },
    apiKeyHistory: [{
        key: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'expired', 'revoked'],
            default: 'active',
        },
        lastUsedAt: {
            type: Date,
            default: null,
        },
    }],
    // Gamification - Streaks
    currentStreak: {
        type: Number,
        default: 0,
    },
    longestStreak: {
        type: Number,
        default: 0,
    },
    lastAnalysisDate: {
        type: Date,
        default: null,
    },
    // Gamification - Badges
    badges: [{
        id: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        icon: {
            type: String,
            default: '🏆',
        },
        earnedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    totalAnalyses: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if subscription is active
userSchema.methods.hasActiveSubscription = function () {
    if (this.subscriptionTier === 'free') return false;
    // Check if subscription is paused or suspended
    if (this.subscriptionStatus && this.subscriptionStatus !== 'active') return false;
    // If paid tier but no expiry set, treat as active (for backwards compatibility)
    if (!this.subscriptionExpiry) return true;
    return this.subscriptionExpiry > new Date();
};

// Reset daily usage if new day
userSchema.methods.resetDailyUsageIfNeeded = function () {
    const today = new Date().toDateString();
    const lastUsage = this.lastUsageDate ? new Date(this.lastUsageDate).toDateString() : null;

    if (lastUsage !== today) {
        this.dailyUsageCount = 0;
        this.lastUsageDate = new Date();
    }
};

// Get daily limit for current tier
userSchema.methods.getDailyLimit = function () {
    return DAILY_LIMITS[this.subscriptionTier];
};

// Method to check if user can perform analysis
userSchema.methods.canPerformAnalysis = function () {
    // Free tier: max 5 total analyses
    if (this.subscriptionTier === 'free') {
        return {
            allowed: this.usageCount < 5,
            reason: this.usageCount >= 5 ? 'FREE_LIMIT_REACHED' : null,
            remaining: Math.max(0, 5 - this.usageCount),
            limit: 5,
            isDaily: false,
        };
    }

    // Check if subscription is paused or suspended (premium services blocked)
    if (this.subscriptionStatus === 'paused') {
        return {
            allowed: false,
            reason: 'SUBSCRIPTION_PAUSED',
            remaining: 0,
            limit: 0,
            isDaily: false,
            message: 'Your subscription is paused. Contact admin to resume.',
        };
    }

    if (this.subscriptionStatus === 'suspended') {
        return {
            allowed: false,
            reason: 'SUBSCRIPTION_SUSPENDED',
            remaining: 0,
            limit: 0,
            isDaily: false,
            message: 'Your subscription has been suspended. Contact support.',
        };
    }

    // Check if subscription is active (not expired)
    if (!this.hasActiveSubscription()) {
        return {
            allowed: false,
            reason: 'SUBSCRIPTION_EXPIRED',
            remaining: 0,
            limit: 0,
            isDaily: false,
        };
    }

    // Reset daily usage if new day
    this.resetDailyUsageIfNeeded();

    // Annual plan: unlimited
    const dailyLimit = DAILY_LIMITS[this.subscriptionTier];
    if (dailyLimit === null) {
        return {
            allowed: true,
            reason: null,
            remaining: null,
            limit: null,
            isDaily: true,
        };
    }

    // Check daily limit
    if (this.dailyUsageCount >= dailyLimit) {
        return {
            allowed: false,
            reason: 'DAILY_LIMIT_REACHED',
            remaining: 0,
            limit: dailyLimit,
            isDaily: true,
        };
    }

    return {
        allowed: true,
        reason: null,
        remaining: dailyLimit - this.dailyUsageCount,
        limit: dailyLimit,
        isDaily: true,
    };
};

// Increment usage count
userSchema.methods.incrementUsage = async function () {
    this.usageCount += 1;

    // Reset daily count if new day
    this.resetDailyUsageIfNeeded();
    this.dailyUsageCount += 1;
    this.lastUsageDate = new Date();

    await this.save();
};

module.exports = mongoose.model('User', userSchema);
