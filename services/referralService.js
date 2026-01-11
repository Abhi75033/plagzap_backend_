const crypto = require('crypto');
const User = require('../models/User');
const Referral = require('../models/Referral');
const coinService = require('./coinService');

/**
 * Referral Service
 * Manages referral code generation, validation, and reward distribution
 */

// Referral configuration
const REFERRAL_CONFIG = {
    CODE_LENGTH: 8,
    MIN_ACTIONS_FOR_VALIDATION: 2, // Referred user must complete 2 actions
    MIN_ACCOUNT_AGE_HOURS: 24, // Account must be 24h old
    REFERRER_REWARD: 50, // Coins for successful referral
    REFEREE_REWARD: 25, // Welcome bonus for using a referral code
    MONTHLY_LIMIT: 10, // Max referrals per month per user
};

/**
 * Generate a unique referral code
 */
function generateReferralCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
    let code = '';

    for (let i = 0; i < REFERRAL_CONFIG.CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }

    return code;
}

/**
 * Get or create referral code for a user
 * @param {string} userId - User ID
 * @returns {Promise<string>} Referral code
 */
async function getUserReferralCode(userId) {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    // Return existing code if user has one
    if (user.referralCode) {
        return user.referralCode;
    }

    // Generate unique code
    let code;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        code = generateReferralCode();
        const existing = await User.findOne({ referralCode: code });
        if (!existing) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        throw new Error('Failed to generate unique referral code');
    }

    // Save code to user
    user.referralCode = code;
    await user.save();

    return code;
}

/**
 * Validate a referral code
 * @param {string} code - Referral code to validate
 * @returns {Promise<Object>} Referrer user or null if invalid
 */
async function validateReferralCode(code) {
    if (!code || typeof code !== 'string') {
        return null;
    }

    const referrer = await User.findOne({ referralCode: code.toUpperCase() });

    if (!referrer) {
        return null;
    }

    // Check monthly limit
    const now = new Date();
    const lastReset = referrer.monthlyReferrals.lastResetDate;
    const monthsSinceReset = (now - lastReset) / (1000 * 60 * 60 * 24 * 30);

    if (monthsSinceReset >= 1) {
        // Reset monthly count
        referrer.monthlyReferrals.count = 0;
        referrer.monthlyReferrals.lastResetDate = now;
        await referrer.save();
    }

    if (referrer.monthlyReferrals.count >= REFERRAL_CONFIG.MONTHLY_LIMIT) {
        return { valid: false, reason: 'MONTHLY_LIMIT_REACHED', referrer: null };
    }

    return { valid: true, referrer };
}

/**
 * Track a new referral
 * @param {string} referrerId - ID of user who referred
 * @param {string} referredUserId - ID of new user
 * @param {string} referralCode - Code used
 * @param {Object} metadata - IP, device fingerprint, etc.
 */
async function trackReferral(referrerId, referredUserId, referralCode, metadata = {}) {
    // Create referral record
    const referral = new Referral({
        referrerId,
        referredUserId,
        referralCode,
        status: 'pending',
        actionsCompleted: 0,
        ipAddress: metadata.ipAddress,
        deviceFingerprint: metadata.deviceFingerprint,
    });

    await referral.save();

    // Update referred user
    await User.findByIdAndUpdate(referredUserId, {
        referredBy: referrerId,
    });

    // Increment referrer's monthly count
    await User.findByIdAndUpdate(referrerId, {
        $inc: { 'monthlyReferrals.count': 1 },
    });

    return referral;
}

/**
 * Check if a referral is eligible for validation
 * @param {string} referredUserId - ID of referred user
 */
async function checkReferralEligibility(referredUserId) {
    const user = await User.findById(referredUserId);

    if (!user || !user.referredBy) {
        return { eligible: false, reason: 'NO_REFERRAL' };
    }

    const referral = await Referral.findOne({
        referredUserId,
        status: 'pending',
    });

    if (!referral) {
        return { eligible: false, reason: 'REFERRAL_NOT_FOUND' };
    }

    // Check account age (24h minimum)
    const accountAgeHours = (Date.now() - user.accountAge) / (1000 * 60 * 60);
    if (accountAgeHours < REFERRAL_CONFIG.MIN_ACCOUNT_AGE_HOURS) {
        return { eligible: false, reason: 'ACCOUNT_TOO_NEW', hoursRemaining: Math.ceil(REFERRAL_CONFIG.MIN_ACCOUNT_AGE_HOURS - accountAgeHours) };
    }

    // Check action count
    if (referral.actionsCompleted < REFERRAL_CONFIG.MIN_ACTIONS_FOR_VALIDATION) {
        return { eligible: false, reason: 'INSUFFICIENT_ACTIONS', actionsNeeded: REFERRAL_CONFIG.MIN_ACTIONS_FOR_VALIDATION - referral.actionsCompleted };
    }

    return { eligible: true, referral };
}

/**
 * Validate and reward a referral
 * @param {string} referredUserId - ID of referred user
 */
async function validateAndReward(referredUserId) {
    const eligibility = await checkReferralEligibility(referredUserId);

    if (!eligibility.eligible) {
        return { success: false, reason: eligibility.reason, details: eligibility };
    }

    const referral = eligibility.referral;

    // Mark as validated
    await referral.validateReferral();

    // Award coins to referrer
    await coinService.awardCoins(
        referral.referrerId,
        REFERRAL_CONFIG.REFERRER_REWARD,
        'referral',
        `Referral reward for inviting new user`,
        { referredUserId }
    );

    // Award welcome bonus to referred user
    await coinService.awardCoins(
        referredUserId,
        REFERRAL_CONFIG.REFEREE_REWARD,
        'referral_welcome',
        `Welcome bonus for using referral code`,
        { referrerId: referral.referrerId }
    );

    // Update referrer's stats
    await User.findByIdAndUpdate(referral.referrerId, {
        $inc: { referralCount: 1 },
        $push: {
            referralRewards: {
                referredUserId,
                coinsEarned: REFERRAL_CONFIG.REFERRER_REWARD,
                claimedAt: new Date(),
            },
        },
    });

    // Mark as rewarded
    await referral.reward();

    return {
        success: true,
        referrerReward: REFERRAL_CONFIG.REFERRER_REWARD,
        refereeReward: REFERRAL_CONFIG.REFEREE_REWARD,
    };
}

/**
 * Increment action count for a referral
 * @param {string} userId - User ID
 */
async function incrementReferralActions(userId) {
    const referral = await Referral.findOne({
        referredUserId: userId,
        status: 'pending',
    });

    if (referral) {
        referral.actionsCompleted += 1;
        await referral.save();

        // Auto-validate if eligible
        const eligibility = await checkReferralEligibility(userId);
        if (eligibility.eligible) {
            await validateAndReward(userId);
        }
    }
}

/**
 * Get referral statistics for a user
 * @param {string} userId - User ID
 */
async function getReferralStats(userId) {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    // Get all referrals
    const referrals = await Referral.find({ referrerId: userId })
        .populate('referredUserId', 'name email createdAt')
        .sort({ createdAt: -1 });

    const stats = {
        totalReferrals: referrals.length,
        pendingReferrals: referrals.filter(r => r.status === 'pending').length,
        validatedReferrals: referrals.filter(r => r.status === 'validated' || r.status === 'rewarded').length,
        rewardedReferrals: referrals.filter(r => r.status === 'rewarded').length,
        totalCoinsEarned: user.referralRewards.reduce((sum, r) => sum + r.coinsEarned, 0),
        monthlyCount: user.monthlyReferrals.count,
        monthlyLimit: REFERRAL_CONFIG.MONTHLY_LIMIT,
        referrals: referrals.map(r => ({
            id: r._id,
            userName: r.referredUserId?.name,
            userEmail: r.referredUserId?.email,
            status: r.status,
            signupDate: r.signupDate,
            actionsCompleted: r.actionsCompleted,
            actionsNeeded: Math.max(0, REFERRAL_CONFIG.MIN_ACTIONS_FOR_VALIDATION - r.actionsCompleted),
        })),
    };

    return stats;
}

module.exports = {
    getUserReferralCode,
    validateReferralCode,
    trackReferral,
    checkReferralEligibility,
    validateAndReward,
    incrementReferralActions,
    getReferralStats,
    REFERRAL_CONFIG,
};
