const User = require('../models/User');

/**
 * Middleware to check if user is eligible for rewards
 * Requirements:
 * 1. Email must be verified
 * 2. Account must be at least 24 hours old
 * 3. User must have completed at least 2 actions
 */
async function checkRewardEligibility(req, res, next) {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const eligibility = {
            eligible: true,
            reasons: []
        };

        // Check 1: Email verification
        if (!user.emailVerified) {
            eligibility.eligible = false;
            eligibility.reasons.push('Email not verified');
        }

        // Check 2: Account age (24 hours)
        const accountAgeHours = (Date.now() - user.accountAge) / (1000 * 60 * 60);
        if (accountAgeHours < 24) {
            eligibility.eligible = false;
            const hoursRemaining = Math.ceil(24 - accountAgeHours);
            eligibility.reasons.push(`Account too new (${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} remaining)`);
        }

        // Check 3: Actions completed (minimum 2)
        // We'll track this through usageCount (plagiarism checks, content generation, etc.)
        const actionsCompleted = user.usageCount || 0;
        if (actionsCompleted < 2) {
            eligibility.eligible = false;
            const actionsNeeded = 2 - actionsCompleted;
            eligibility.reasons.push(`Complete ${actionsNeeded} more action${actionsNeeded > 1 ? 's' : ''} (plagiarism check, content generation, etc.)`);
        }

        // If not eligible, return error with clear reasons
        if (!eligibility.eligible) {
            return res.status(403).json({
                error: 'Not eligible for rewards',
                message: 'Complete the following requirements to unlock rewards:',
                eligibility: {
                    eligible: false,
                    requirements: eligibility.reasons
                }
            });
        }

        // User is eligible, proceed to next middleware/handler
        next();
    } catch (error) {
        console.error('Eligibility check error:', error);
        res.status(500).json({ error: 'Failed to check eligibility' });
    }
}

/**
 * Helper function to get eligibility status without blocking (for UI display)
 */
async function getEligibilityStatus(userId) {
    try {
        const user = await User.findById(userId);

        if (!user) {
            return { eligible: false, reasons: ['User not found'] };
        }

        const eligibility = {
            eligible: true,
            reasons: [],
            details: {
                emailVerified: user.emailVerified,
                accountAgeHours: (Date.now() - user.accountAge) / (1000 * 60 * 60),
                actionsCompleted: user.usageCount || 0
            }
        };

        if (!user.emailVerified) {
            eligibility.eligible = false;
            eligibility.reasons.push('Email not verified');
        }

        const accountAgeHours = (Date.now() - user.accountAge) / (1000 * 60 * 60);
        if (accountAgeHours < 24) {
            eligibility.eligible = false;
            const hoursRemaining = Math.ceil(24 - accountAgeHours);
            eligibility.reasons.push(`Account too new (${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} remaining)`);
        }

        const actionsCompleted = user.usageCount || 0;
        if (actionsCompleted < 2) {
            eligibility.eligible = false;
            const actionsNeeded = 2 - actionsCompleted;
            eligibility.reasons.push(`Complete ${actionsNeeded} more action${actionsNeeded > 1 ? 's' : ''}`);
        }

        return eligibility;
    } catch (error) {
        console.error('Get eligibility status error:', error);
        return { eligible: false, reasons: ['Error checking eligibility'] };
    }
}

module.exports = { checkRewardEligibility, getEligibilityStatus };
