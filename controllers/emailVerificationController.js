const crypto = require('crypto');
const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const emailService = require('../services/emailService');

/**
 * Send verification email to user
 */
async function sendVerificationEmail(req, res) {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.emailVerified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        // Check cooldown (prevent spam - max 1 email per 60 seconds)
        // Use lastVerificationEmailSent timestamp if available
        if (user.lastVerificationEmailSent) {
            const timeSinceLastEmail = Date.now() - new Date(user.lastVerificationEmailSent).getTime();
            if (timeSinceLastEmail < 60000) { // 60 seconds = 60000ms
                const secondsRemaining = Math.ceil((60000 - timeSinceLastEmail) / 1000);
                return res.status(429).json({
                    error: 'Please wait before requesting another verification email',
                    secondsRemaining
                });
            }
        }

        // Generate verification token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Delete any existing verification records for this user
        await EmailVerification.deleteMany({ userId: user._id });

        // Create new verification record
        await EmailVerification.create({
            userId: user._id,
            token,
            expiresAt
        });

        // Update user
        user.emailVerificationToken = token;
        user.emailVerificationExpires = expiresAt;
        user.lastVerificationEmailSent = new Date(); // Track last send time for cooldown
        await user.save();

        // Send email
        try {
            await emailService.sendVerificationEmail(user, token);
        } catch (emailError) {
            console.error('Email send error:', emailError);
            return res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
        }

        res.json({
            message: 'Verification email sent successfully',
            expiresAt
        });
    } catch (error) {
        console.error('Send verification error:', error);
        res.status(500).json({ error: 'Failed to send verification email' });
    }
}

/**
 * Verify email with token
 */
async function verifyEmail(req, res) {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        // Find verification record
        const verification = await EmailVerification.findOne({
            token,
            verified: false,
            expiresAt: { $gt: new Date() }
        });

        if (!verification) {
            return res.status(400).json({
                error: 'Invalid or expired verification token',
                message: 'Please request a new verification email.'
            });
        }

        // Mark verification as complete
        verification.verified = true;
        await verification.save();

        // Update user
        const user = await User.findById(verification.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({
            message: 'Email verified successfully!',
            user: {
                id: user._id,
                email: user.email,
                emailVerified: user.emailVerified
            }
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
}

/**
 * Get verification status for current user
 */
async function getVerificationStatus(req, res) {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            emailVerified: user.emailVerified,
            email: user.email,
            verificationPending: !!user.emailVerificationToken && !user.emailVerified,
            tokenExpires: user.emailVerificationExpires
        });
    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({ error: 'Failed to get verification status' });
    }
}

module.exports = {
    sendVerificationEmail,
    verifyEmail,
    getVerificationStatus
};
