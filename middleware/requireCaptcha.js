const AbuseDetectionService = require('../services/abuseDetectionService');
const CaptchaService = require('../services/captchaService');
const DeviceFingerprintService = require('../services/deviceFingerprintService');

/**
 * Conditionally require CAPTCHA based on risk score
 * This middleware uses behavioral analysis to determine if CAPTCHA is needed
 */
async function requireCaptcha(req, res, next) {
    try {
        const userId = req.user?.id;
        const { captchaToken, deviceFingerprint: clientFingerprint } = req.body;

        // Track device if user is authenticated
        let deviceInfo = {};
        if (userId) {
            const device = await DeviceFingerprintService.trackDevice(userId, req, clientFingerprint);
            if (device) {
                deviceInfo = await DeviceFingerprintService.checkSuspicious(userId, device.fingerprint);
            }
        }

        // Calculate risk score
        const risk = await AbuseDetectionService.calculateRiskScore(
            userId,
            req.path,
            req,
            deviceInfo
        );

        console.log(`[CAPTCHA Middleware] Risk score: ${risk.score}/10, Trust: ${risk.trustLevel}, Reasons: ${risk.reasons.join(', ')}`);

        // If low risk, skip CAPTCHA
        if (!risk.requiresCaptcha) {
            console.log('[CAPTCHA Middleware] ✅ Low risk - CAPTCHA skipped');
            return next();
        }

        // If very high risk, block immediately
        if (risk.shouldBlock) {
            console.log('[CAPTCHA Middleware] ❌ High risk - Request blocked');
            await AbuseDetectionService.logSecurityEvent(userId, 'HIGH_RISK_BLOCKED', {
                score: risk.score,
                reasons: risk.reasons,
                path: req.path,
                ip: req.ip
            });

            return res.status(403).json({
                error: 'Suspicious activity detected',
                message: 'Your request has been blocked due to security concerns',
                reasons: risk.reasons,
                blocked: true,
                riskScore: risk.score
            });
        }

        // Medium risk - require CAPTCHA
        if (!captchaToken) {
            console.log('[CAPTCHA Middleware] ⚠️ Medium risk - CAPTCHA required');
            return res.status(428).json({ // 428 Precondition Required
                error: 'CAPTCHA verification required',
                message: 'Please complete the CAPTCHA challenge to continue',
                requiresCaptcha: true,
                reasons: risk.reasons,
                riskScore: risk.score,
                trustLevel: risk.trustLevel
            });
        }

        // Verify CAPTCHA
        console.log('[CAPTCHA Middleware] Verifying CAPTCHA token...');
        const verification = await CaptchaService.verifyCaptcha(
            captchaToken,
            req.ip || req.connection.remoteAddress
        );

        if (!verification.success) {
            console.log(`[CAPTCHA Middleware] ❌ CAPTCHA verification failed: ${verification.error}`);

            await AbuseDetectionService.logSecurityEvent(userId, 'CAPTCHA_FAILED', {
                error: verification.error,
                path: req.path,
                ip: req.ip
            });

            return res.status(400).json({
                error: 'CAPTCHA verification failed',
                message: 'Please try again',
                captchaError: verification.error,
                requiresCaptcha: true
            });
        }

        console.log('[CAPTCHA Middleware] ✅ CAPTCHA verified successfully');
        await AbuseDetectionService.logSecurityEvent(userId, 'CAPTCHA_PASSED', {
            score: verification.score,
            path: req.path
        });

        next();
    } catch (error) {
        console.error('[CAPTCHA Middleware] Error:', error);
        // Fail open - don't block legitimate users on errors
        console.warn('[CAPTCHA Middleware] Error occurred - failing open');
        next();
    }
}

module.exports = requireCaptcha;
