const User = require('../models/User');
const crypto = require('crypto');
const emailService = require('../services/emailService');

/**
 * Forgot Password - Request password reset
 * Security: Always returns success, prevents user enumeration
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user (but don't reveal if user exists - security)
        const user = await User.findOne({ email: email.toLowerCase() });

        // ALWAYS return success (prevent user enumeration attack)
        const successMessage = 'If that email exists, a password reset link has been sent';

        if (!user) {
            // Still send success message (security best practice)
            return res.json({ success: true, message: successMessage });
        }

        // Check rate limiting (max 3 requests per hour per user)
        if (user.lastResetRequest) {
            const timeSinceLastRequest = Date.now() - user.lastResetRequest.getTime();
            const oneHour = 60 * 60 * 1000;

            if (timeSinceLastRequest < oneHour && user.resetPasswordAttempts >= 3) {
                // Still return success (don't reveal rate limiting)
                console.log(`Rate limit exceeded for user: ${user.email}`);
                return res.json({ success: true, message: successMessage });
            }

            // Reset counter if hour has passed
            if (timeSinceLastRequest >= oneHour) {
                user.resetPasswordAttempts = 0;
            }
        }

        // Generate cryptographically secure random token (32 bytes = 64 hex chars)
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash the token using SHA-256 (never store plain token in DB)
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set token and expiry (15 minutes)
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        user.resetPasswordAttempts += 1;
        user.lastResetRequest = new Date();
        await user.save();

        console.log(`Password reset requested for: ${user.email}`);
        console.log(`Token expires in 15 minutes`);

        // Create reset URL with PLAIN token (sent via email, user will submit this)
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

        // Send email (non-blocking, errors logged but don't fail request)
        emailService.sendPasswordResetEmail(user.email, user.name, resetUrl)
            .then(() => {
                console.log(`Password reset email sent to: ${user.email}`);
            })
            .catch((error) => {
                console.error('Password reset email error:', error.message);
            });

        res.json({ success: true, message: successMessage });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Reset Password - Change password with reset token
 * Security: One-time use token, hashed comparison, expiry check
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Validate input
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash the incoming token to match with DB
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with matching hashed token and valid expiry
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() } // Not expired
        });

        if (!user) {
            return res.status(400).json({
                error: 'Invalid or expired reset token'
            });
        }

        console.log(`Password reset for user: ${user.email}`);

        // Update password (will be hashed by pre-save hook in User model)
        user.password = newPassword;

        // Clear reset token fields (ONE-TIME USE)
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.resetPasswordAttempts = 0;
        user.lastResetRequest = null;

        await user.save();

        // Send confirmation email (non-blocking)
        emailService.sendPasswordChangedEmail(user.email, user.name)
            .then(() => {
                console.log(`Password changed confirmation sent to: ${user.email}`);
            })
            .catch((error) => {
                console.error('Password changed email error:', error.message);
            });

        res.json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
