/**
 * CAPTCHA Verification Service
 * Handles hCaptcha verification for suspicious activities
 * 
 * Note: Requires 'hcaptcha' package to be installed manually:
 * npm install hcaptcha --save
 */

class CaptchaService {
    /**
     * Verify hCaptcha token
     * @param {string} token - CAPTCHA token from client
     * @param {string} ip - User's IP address
     * @returns {object} Verification result
     */
    static async verifyCaptcha(token, ip) {
        try {
            const secret = process.env.HCAPTCHA_SECRET;

            if (!secret) {
                console.warn('[CAPTCHA] hCaptcha secret not configured in environment');
                return {
                    success: false,
                    error: 'CAPTCHA not configured',
                    configured: false
                };
            }

            if (!token) {
                return {
                    success: false,
                    error: 'No CAPTCHA token provided'
                };
            }

            // Try to load hcaptcha module
            let verify;
            try {
                const hcaptcha = require('hcaptcha');
                verify = hcaptcha.verify;
            } catch (err) {
                console.warn('[CAPTCHA] hcaptcha package not installed - run: npm install hcaptcha');
                // For development, allow bypass if not installed
                if (process.env.NODE_ENV === 'development') {
                    console.warn('[CAPTCHA] Development mode - bypassing verification');
                    return { success: true, bypassed: true };
                }
                return {
                    success: false,
                    error: 'CAPTCHA service not available'
                };
            }

            // Verify the token
            const result = await verify(secret, token, ip);

            console.log(`[CAPTCHA] Verification ${result.success ? 'successful' : 'failed'} for IP: ${ip}`);

            return {
                success: result.success,
                score: result.score || null,
                error: result['error-codes']?.[0] || null,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('[CAPTCHA] Verification error:', error.message);

            // Fail open in case of service issues (don't block legitimate users)
            if (process.env.NODE_ENV === 'production') {
                console.warn('[CAPTCHA] Service error - failing open to allow request');
                return { success: true, failedOpen: true };
            }

            return {
                success: false,
                error: 'Verification failed',
                details: error.message
            };
        }
    }

    /**
     * Check if CAPTCHA is properly configured
     */
    static isConfigured() {
        return !!(process.env.HCAPTCHA_SECRET);
    }
}

module.exports = CaptchaService;
