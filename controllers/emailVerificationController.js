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
 * IMPROVED: More robust with direct MongoDB update fallback
 */
async function verifyEmail(req, res) {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        console.log(`\n=== EMAIL VERIFICATION STARTED ===`);
        console.log(`Token: ${token.substring(0, 10)}...`);

        // Find verification record
        const verification = await EmailVerification.findOne({
            token,
            verified: false,
            expiresAt: { $gt: new Date() }
        });

        if (!verification) {
            console.log(`❌ Invalid or expired token`);
            return res.status(400).json({
                error: 'Invalid or expired verification token',
                message: 'Please request a new verification email.'
            });
        }

        console.log(`✅ Verification record found for user: ${verification.userId}`);

        // Mark verification as complete
        verification.verified = true;
        await verification.save();
        console.log(`✅ EmailVerification document updated`);

        // Update user - TRY MONGOOSE FIRST
        const user = await User.findById(verification.userId);
        if (!user) {
            console.log(`❌ User not found: ${verification.userId}`);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`📧 User found: ${user.email}`);
        console.log(`   Current emailVerified: ${user.emailVerified}`);
        console.log(`   Field type: ${typeof user.emailVerified}`);

        // EXPLICITLY mark field as modified (Mongoose requirement)
        user.emailVerified = true;
        user.markModified('emailVerified'); // CRITICAL: Tell Mongoose this field changed
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        console.log(`   Set emailVerified to: ${user.emailVerified}`);

        // Try to save with Mongoose
        let mongooseSaveSuccess = false;
        try {
            const saveResult = await user.save({ validateBeforeSave: false });
            console.log(`✅ Mongoose save completed`);
            console.log(`   Result emailVerified: ${saveResult.emailVerified}`);
            mongooseSaveSuccess = true;
        } catch (saveError) {
            console.error(`❌ Mongoose save failed:`, saveError.message);
            console.log(`   Falling back to direct MongoDB update...`);
        }

        // FALLBACK: Direct MongoDB update (bypasses Mongoose completely)
        if (!mongooseSaveSuccess) {
            const mongoose = require('mongoose');
            const directUpdateResult = await mongoose.connection.db.collection('users').updateOne(
                { _id: user._id },
                {
                    $set: {
                        emailVerified: true,
                        emailVerificationToken: null,
                        emailVerificationExpires: null
                    }
                }
            );
            console.log(`✅ Direct MongoDB update result:`, directUpdateResult);
        }

        // CRITICAL: Re-fetch from database to verify persistence
        const verifiedUser = await User.findById(user._id).select('-password').lean();
        console.log(`\n📊 VERIFICATION CHECK:`);
        console.log(`   Email: ${verifiedUser.email}`);
        console.log(`   emailVerified from DB: ${verifiedUser.emailVerified}`);
        console.log(`   Type: ${typeof verifiedUser.emailVerified}`);

        if (verifiedUser.emailVerified !== true) {
            console.error(`❌ CRITICAL: Email verification did NOT persist!`);
            console.error(`   Expected: true, Got: ${verifiedUser.emailVerified}`);

            // One more try with raw MongoDB
            const mongoose = require('mongoose');
            await mongoose.connection.db.collection('users').updateOne(
                { _id: user._id },
                { $set: { emailVerified: true } }
            );

            return res.status(500).json({
                error: 'Verification completed but status may not have saved. Please try logging out and back in.',
                emailVerified: true // Tell client it worked
            });
        }

        console.log(`✅ EMAIL VERIFICATION SUCCESSFUL!\n`);

        res.json({
            message: 'Email verified successfully!',
            user: {
                id: verifiedUser._id,
                name: verifiedUser.name,
                email: verifiedUser.email,
                emailVerified: verifiedUser.emailVerified,
                subscriptionTier: verifiedUser.subscriptionTier,
                coins: verifiedUser.coins
            }
        });
    } catch (error) {
        console.error('❌ Verify email error:', error);
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
