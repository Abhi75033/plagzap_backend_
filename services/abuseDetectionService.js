const User = require('../models/User');
const DeviceFingerprintService = require('./deviceFingerprintService');

/**
 * Abuse Detection Service
 * Calculates risk scores for user actions and detects suspicious behavior
 */
class AbuseDetectionService {
    /**
     * Calculate risk score for a user action
     * Score: 0-10 (0 = trusted, 10 = highly suspicious)
     * 
     * @param {string} userId - User ID
     * @param {string} action - Action being performed
     * @param {object} req - Express request object
     * @param {object} deviceInfo - Device fingerprint info
     * @returns {object} Risk assessment with score and reasons
     */
    static async calculateRiskScore(userId, action, req, deviceInfo = {}) {
        let score = 0;
        const reasons = [];

        try {
            // 1. Check device trust
            if (deviceInfo.suspicious) {
                score += 3;
                reasons.push('Suspicious device detected');
            } else if (deviceInfo.trustScore !== undefined && deviceInfo.trustScore < 50) {
                score += 2;
                reasons.push(`Low device trust (${deviceInfo.trustScore}/100)`);
            } else if (!deviceInfo.device) {
                score += 2;
                reasons.push('Unknown/new device');
            }

            // 2. Check account age
            if (userId) {
                const user = await User.findById(userId);
                if (user) {
                    const accountAgeHours = (Date.now() - user.createdAt) / (1000 * 60 * 60);

                    if (accountAgeHours < 1) {
                        score += 3;
                        reasons.push('Very new account (<1h)');
                    } else if (accountAgeHours < 24) {
                        score += 2;
                        reasons.push('New account (<24h)');
                    }

                    // 3. Check email verification
                    if (!user.emailVerified) {
                        score += 2;
                        reasons.push('Email not verified');
                    }

                    // 4. Check user's usage pattern
                    if (user.usageCount === 0) {
                        score += 1;
                        reasons.push('First action');
                    }
                }
            }

            // 5. Check IP reputation (simplified - can integrate with IP intelligence APIs)
            const ip = req.ip || req.connection.remoteAddress;
            if (ip && (ip.includes('127.0.0.1') || ip.includes('::1'))) {
                // Localhost - usually dev/test
                score = Math.max(0, score - 2);
            }

            // 6. Action-specific risk
            if (action.includes('claim') || action.includes('redeem')) {
                score += 1; // Money-related actions are higher risk
            }

            return {
                score: Math.min(10, Math.max(0, score)),
                reasons,
                requiresCaptcha: score >= 5,
                shouldBlock: score >= 8,
                trustLevel: this.getTrustLevel(score)
            };
        } catch (error) {
            console.error('Risk calculation error:', error);
            return {
                score: 5,
                reasons: ['Error calculating risk - using default medium risk'],
                requiresCaptcha: false,
                shouldBlock: false,
                trustLevel: 'medium'
            };
        }
    }

    /**
     * Get human-readable trust level
     */
    static getTrustLevel(score) {
        if (score <= 2) return 'high';
        if (score <= 4) return 'medium';
        if (score <= 6) return 'low';
        return 'very-low';
    }

    /**
     * Log security event for admin tracking
     */
    static async logSecurityEvent(userId, eventType, details) {
        try {
            // In production, this would log to a security events collection
            console.log(`[SECURITY EVENT] User: ${userId}, Type: ${eventType}, Details:`, details);

            // TODO: Create SecurityEvent model and log to database
            // const SecurityEvent = require('../models/SecurityEvent');
            // await SecurityEvent.create({ userId, eventType, details, timestamp: new Date() });
        } catch (error) {
            console.error('Security logging error:', error);
        }
    }

    /**
     * Check for rapid repeated actions (simplified rate limiting)
     */
    static async checkActionRate(userId, action, windowMinutes = 5) {
        try {
            // This would query an activity log or use Redis
            // Simplified: just return false for now
            // TODO: Implement with Redis or activity tracking
            return { exceeded: false, count: 0, limit: 20 };
        } catch (error) {
            console.error('Action rate check error:', error);
            return { exceeded: false, count: 0, limit: 20 };
        }
    }
}

module.exports = AbuseDetectionService;
