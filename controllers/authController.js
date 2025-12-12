const User = require('../models/User');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '30d';

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Register new user
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user
        const user = new User({ name, email, password });
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Send welcome email (async, don't wait)
        emailService.sendWelcomeEmail(email, name).catch(err => {
            console.log('Welcome email error (non-blocking):', err.message);
        });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                subscriptionTier: user.subscriptionTier,
                subscriptionTier: user.subscriptionTier,
                usageCount: user.usageCount,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                subscriptionTier: user.subscriptionTier,
                subscriptionExpiry: user.subscriptionExpiry,
                usageCount: user.usageCount,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// Get current user
exports.me = async (req, res) => {
    try {
        const user = req.user;

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            subscriptionTier: user.subscriptionTier,
            subscriptionExpiry: user.subscriptionExpiry,
            usageCount: user.usageCount,
            createdAt: user.createdAt,
            canPerformAnalysis: user.canPerformAnalysis(),
            hasActiveSubscription: user.hasActiveSubscription(),
            role: user.role,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Generate API Key helper
const generateApiKeyString = () => {
    const crypto = require('crypto');
    const prefix = 'pz_';
    const key = crypto.randomBytes(32).toString('hex');
    return prefix + key;
};

// Calculate expiry date (7 days from now)
const getExpiryDate = () => {
    const now = new Date();
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
};

// Check if API key is expired
const isApiKeyExpired = (expiresAt) => {
    return expiresAt && new Date() > new Date(expiresAt);
};

// Helper to ensure legacy keys are in history
const ensureApiKeyInHistory = async (user) => {
    if (user.apiKey && (!user.apiKeyHistory || user.apiKeyHistory.length === 0)) {
        console.log('Backfilling missing API key history for user:', user._id);

        const createdAt = user.apiKeyCreatedAt || new Date();
        // Default expiry 7 days from creation
        const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (!user.apiKeyHistory) user.apiKeyHistory = [];

        user.apiKeyHistory.push({
            key: user.apiKey,
            createdAt: createdAt,
            expiresAt: expiresAt,
            status: 'active'
        });

        user.apiKeyExpiresAt = expiresAt;
        await user.save();
        return true;
    }
    return false;
};

// Get API Key
exports.getApiKey = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.apiKey) {
            return res.json({
                hasApiKey: false,
                apiKey: null,
                createdAt: null,
                expiresAt: null,
                isExpired: false,
            });
        }

        // Ensure key is in history (migration for old keys)
        await ensureApiKeyInHistory(user);

        const isExpired = isApiKeyExpired(user.apiKeyExpiresAt);

        // If expired, mark it as expired in history
        if (isExpired && user.apiKeyHistory && user.apiKeyHistory.length > 0) {
            const lastKey = user.apiKeyHistory[user.apiKeyHistory.length - 1];
            if (lastKey.status === 'active') {
                lastKey.status = 'expired';
                await user.save();
            }
        }

        // Mask the API key for security (show only first 8 and last 4 chars)
        const maskedKey = user.apiKey.substring(0, 11) + '...' + user.apiKey.slice(-4);

        res.json({
            hasApiKey: true,
            apiKey: maskedKey,
            fullApiKey: user.apiKey,
            createdAt: user.apiKeyCreatedAt,
            expiresAt: user.apiKeyExpiresAt,
            isExpired: isExpired,
        });
    } catch (error) {
        console.error('Get API key error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get API Key History
exports.getApiKeyHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Initialize apiKeyHistory if it doesn't exist
        if (!user.apiKeyHistory) {
            user.apiKeyHistory = [];
        }

        // Ensure key is in history (migration for old keys)
        await ensureApiKeyInHistory(user);

        // Update status of expired keys
        let updated = false;
        user.apiKeyHistory.forEach(keyEntry => {
            if (keyEntry.status === 'active' && isApiKeyExpired(keyEntry.expiresAt)) {
                keyEntry.status = 'expired';
                updated = true;
            }
        });

        if (updated) {
            await user.save();
        }

        // Return history with masked keys
        const history = user.apiKeyHistory.map(keyEntry => ({
            id: keyEntry._id,
            key: keyEntry.key.substring(0, 11) + '...' + keyEntry.key.slice(-4),
            createdAt: keyEntry.createdAt,
            expiresAt: keyEntry.expiresAt,
            status: keyEntry.status,
            lastUsedAt: keyEntry.lastUsedAt,
        }));

        res.json({
            history: history.reverse(), // Most recent first
            totalKeys: history.length,
        });
    } catch (error) {
        console.error('Get API key history error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Generate new API Key
exports.generateApiKey = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        console.log('Generate API Key Request - User ID:', user._id);
        console.log('User Subscription Tier:', user.subscriptionTier);
        console.log('Is Free Tier?', user.subscriptionTier === 'free');

        // Check if user is on free tier
        if (!user.subscriptionTier || user.subscriptionTier === 'free') {
            console.log('Blocking free tier user from generating API key');
            return res.status(403).json({
                error: 'API key generation is not available for free tier users. Please upgrade to a paid plan.',
                requiresUpgrade: true
            });
        }

        const crypto = require('crypto');
        const prefix = 'pz_';
        const newApiKey = prefix + crypto.randomBytes(32).toString('hex');
        const createdAt = new Date();
        const expiresAt = getExpiryDate();

        // Mark any existing active key as revoked
        user.apiKeyHistory.forEach(keyEntry => {
            if (keyEntry.status === 'active') {
                if (isApiKeyExpired(keyEntry.expiresAt)) {
                    keyEntry.status = 'expired';
                } else {
                    keyEntry.status = 'revoked';
                }
            }
        });

        // Add new key to history
        user.apiKeyHistory.push({
            key: newApiKey,
            createdAt: createdAt,
            expiresAt: expiresAt,
            status: 'active',
        });

        // Update current active key
        user.apiKey = newApiKey;
        user.apiKeyCreatedAt = createdAt;
        user.apiKeyExpiresAt = expiresAt;

        await user.save();

        res.json({
            success: true,
            apiKey: newApiKey,
            createdAt: createdAt,
            expiresAt: expiresAt,
            message: 'API key generated successfully. It will expire in 7 days. Store it securely!',
        });
    } catch (error) {
        console.error('Generate API key error:', error.message);
        res.status(500).json({ error: 'Failed to generate API key: ' + error.message });
    }
};

// Revoke API Key
exports.revokeApiKey = async (req, res) => {
    try {
        const { keyId } = req.params;
        const user = await User.findById(req.user._id);

        const keyEntry = user.apiKeyHistory.id(keyId);
        if (!keyEntry) {
            return res.status(404).json({ error: 'API key not found' });
        }

        keyEntry.status = 'revoked';

        // If this is the current active key, clear it
        if (user.apiKey === keyEntry.key) {
            user.apiKey = null;
            user.apiKeyCreatedAt = null;
            user.apiKeyExpiresAt = null;
        }

        await user.save();

        res.json({
            success: true,
            message: 'API key revoked successfully',
        });
    } catch (error) {
        console.error('Revoke API key error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Google OAuth Authentication
exports.googleAuth = (req, res, next) => {
    const passport = require('passport');
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
};

// Google OAuth Callback
exports.googleCallback = async (req, res, next) => {
    const passport = require('passport');

    passport.authenticate('google', { session: false }, async (err, profile) => {
        try {
            if (err || !profile) {
                return res.redirect(`${process.env.CLIENT_URL || 'https://plagzap-frontend.vercel.app'}/login?error=google_auth_failed`);
            }

            // Find or create user
            let user = await User.findOne({ email: profile.email });

            if (!user) {
                // Create new user from Google profile
                user = new User({
                    name: profile.displayName,
                    email: profile.email,
                    password: 'google-oauth-' + Math.random().toString(36), // Random password (not used)
                    googleId: profile.id,
                    avatar: profile.picture
                });
                await user.save();

                // Send welcome email
                emailService.sendWelcomeEmail(user.email, user.name).catch(err => {
                    console.log('Welcome email error:', err.message);
                });
            } else if (!user.googleId) {
                // Link Google ID to existing account
                user.googleId = profile.id;
                if (profile.picture) user.avatar = profile.picture;
                await user.save();
            }

            // Generate JWT token
            const token = generateToken(user._id);

            // Redirect to frontend with token
            res.redirect(`${process.env.CLIENT_URL || 'https://plagzap-frontend.vercel.app'}/auth-callback?token=${token}`);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect(`${process.env.CLIENT_URL || 'https://plagzap-frontend.vercel.app'}/login?error=server_error`);
        }
    })(req, res, next);
};
