const User = require('../models/User');

// Get Dashboard Stats
const getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();

        const tierStats = await User.aggregate([
            { $group: { _id: '$subscriptionTier', count: { $sum: 1 } } }
        ]);

        const recentUsers = await User.find(
            {},
            { name: 1, email: 1, subscriptionTier: 1, createdAt: 1, role: 1 }
        )
            .sort({ createdAt: -1 })
            .limit(5);

        // Simple revenue estimation (mock calculation based on tiers)
        // In reality, you'd pull this from Stripe/Razorpay or a Transaction model
        const revenueMap = {
            'free': 0,
            'monthly': 9.99,
            'quarterly': 24.99,
            'biannual': 45.99,
            'annual': 89.99
        };

        let estimatedMRR = 0;
        const allUsers = await User.find({}, { subscriptionTier: 1 });
        allUsers.forEach(u => {
            estimatedMRR += revenueMap[u.subscriptionTier] || 0;
        });

        res.json({
            totalUsers,
            tierStats: tierStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
            recentUsers,
            estimatedMRR: Math.round(estimatedMRR * 100) / 100,
            activeSubscriptions: allUsers.filter(u => u.subscriptionTier !== 'free').length
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
};

// Get All Users (Paginated)
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const users = await User.find({}, '-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalUsers: total
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Delete User
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Promote to Admin (Optional helper)
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const user = await User.findByIdAndUpdate(id, { role }, { new: true });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
};

// Grant free subscription to user
const grantSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { tier, duration } = req.body;
        const adminId = req.user._id;

        // Validate tier
        const validTiers = ['monthly', 'quarterly', 'biannual', 'annual'];
        if (!validTiers.includes(tier)) {
            return res.status(400).json({ error: 'Invalid subscription tier' });
        }

        // Duration in days
        const durationDays = {
            'monthly': 30,
            'quarterly': 90,
            'biannual': 180,
            'annual': 365
        };

        // Use custom duration if provided, otherwise default to tier-based
        const days = duration || durationDays[tier];
        const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        const user = await User.findByIdAndUpdate(
            id,
            {
                subscriptionTier: tier,
                subscriptionExpiry: expiry,
                subscriptionStatus: 'active',
                adminGranted: true,
                adminGrantedBy: adminId,
                adminGrantedAt: new Date(),
                usageCount: 0,
                dailyUsageCount: 0,
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Send subscription granted email (async)
        emailService.sendSubscriptionGrantedEmail(user.email, user.name, tier, expiry).catch(err => {
            console.log('Subscription granted email error (non-blocking):', err.message);
        });

        console.log(`✅ Admin ${adminId} granted ${tier} subscription to ${user.email} (expires: ${expiry})`);
        res.json({
            message: `Successfully granted ${tier} subscription`,
            user
        });
    } catch (error) {
        console.error('Grant subscription error:', error);
        res.status(500).json({ error: 'Failed to grant subscription' });
    }
};

// Update subscription status (pause/resume/suspend)
const updateSubscriptionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['active', 'paused', 'suspended'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be: active, paused, or suspended' });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { subscriptionStatus: status },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Send appropriate status email (async)
        if (status === 'paused') {
            emailService.sendSubscriptionPausedEmail(user.email, user.name).catch(err => {
                console.log('Subscription paused email error (non-blocking):', err.message);
            });
        } else if (status === 'suspended') {
            emailService.sendSubscriptionSuspendedEmail(user.email, user.name).catch(err => {
                console.log('Subscription suspended email error (non-blocking):', err.message);
            });
        } else if (status === 'active') {
            // Resumed from paused/suspended
            emailService.sendSubscriptionResumedEmail(user.email, user.name, user.subscriptionTier).catch(err => {
                console.log('Subscription resumed email error (non-blocking):', err.message);
            });
        }

        console.log(`✅ Subscription status for ${user.email} updated to: ${status}`);
        res.json({
            message: `Subscription ${status}`,
            user
        });
    } catch (error) {
        console.error('Update subscription status error:', error);
        res.status(500).json({ error: 'Failed to update subscription status' });
    }
};

// Revoke subscription (reset to free tier)
const revokeSubscription = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndUpdate(
            id,
            {
                subscriptionTier: 'free',
                subscriptionExpiry: null,
                subscriptionStatus: 'active',
                adminGranted: false,
                adminGrantedBy: null,
                adminGrantedAt: null,
            },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`✅ Subscription revoked for ${user.email}, reset to free tier`);
        res.json({
            message: 'Subscription revoked, user reset to free tier',
            user
        });
    } catch (error) {
        console.error('Revoke subscription error:', error);
        res.status(500).json({ error: 'Failed to revoke subscription' });
    }
};

// ==================== COUPON MANAGEMENT ====================

const Coupon = require('../models/Coupon');
const emailService = require('../services/emailService');

// Get all coupons
const getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(coupons);
    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
};

// Create a new coupon
const createCoupon = async (req, res) => {
    try {
        const {
            code,
            discountPercent,
            discountType,
            fixedAmount,
            description,
            expiresAt,
            usageLimit,
            applicablePlans,
            minOrderAmount
        } = req.body;

        // Auto-generate code if not provided
        const couponCode = code || Coupon.generateCode();

        // Check if code already exists
        const existing = await Coupon.findOne({ code: couponCode.toUpperCase() });
        if (existing) {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }

        const coupon = new Coupon({
            code: couponCode.toUpperCase(),
            discountPercent: discountPercent || 10,
            discountType: discountType || 'percent',
            fixedAmount: fixedAmount || 0,
            description: description || '',
            expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
            usageLimit: usageLimit || null,
            applicablePlans: applicablePlans || [],
            minOrderAmount: minOrderAmount || 0,
            createdBy: req.user._id,
        });

        await coupon.save();
        console.log(`✅ Coupon created: ${coupon.code} (${coupon.discountPercent}% off)`);
        console.log(`   ApplicablePlans received: ${JSON.stringify(applicablePlans)}`);
        console.log(`   ApplicablePlans saved: ${JSON.stringify(coupon.applicablePlans)}`);

        res.status(201).json({
            message: 'Coupon created successfully',
            coupon
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({ error: 'Failed to create coupon' });
    }
};

// Update a coupon
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        console.log(`Updating coupon ${id}`);
        console.log(`   applicablePlans in update request: ${JSON.stringify(updates.applicablePlans)}`);

        // Find and update the coupon explicitly
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        // Update fields explicitly
        if (updates.code) coupon.code = updates.code;
        if (updates.discountPercent !== undefined) coupon.discountPercent = updates.discountPercent;
        if (updates.description !== undefined) coupon.description = updates.description;
        if (updates.expiresAt) coupon.expiresAt = updates.expiresAt;
        if (updates.usageLimit !== undefined) coupon.usageLimit = updates.usageLimit;
        if (updates.isActive !== undefined) coupon.isActive = updates.isActive;

        // EXPLICITLY set applicablePlans array
        if (updates.applicablePlans !== undefined) {
            coupon.applicablePlans = updates.applicablePlans;
            console.log(`   Setting applicablePlans to: ${JSON.stringify(updates.applicablePlans)}`);
        }

        await coupon.save();
        console.log(`   Coupon saved. applicablePlans is now: ${JSON.stringify(coupon.applicablePlans)}`);

        res.json({ message: 'Coupon updated', coupon });
    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({ error: 'Failed to update coupon' });
    }
};

// Delete a coupon
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findByIdAndDelete(id);
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }
        res.json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
};

// ==================== PROMOTIONAL EMAILS ====================

// Send promotional email to all users or specific segment
const sendPromotionalEmail = async (req, res) => {
    console.log('🚀 PROMOTIONAL EMAIL ENDPOINT CALLED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    try {
        const {
            subject,
            message,
            ctaText,
            ctaUrl,
            couponCode,
            targetAudience // 'all', 'free', 'paid', 'expired'
        } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }

        // Build query based on target audience
        let query = {};
        switch (targetAudience) {
            case 'free':
                // Free users have tier = 'free' (default value)
                query.subscriptionTier = 'free';
                break;
            case 'paid':
                // Paid users have tier NOT equal to 'free'
                query.subscriptionTier = { $ne: 'free' };
                break;
            case 'expired':
                query.subscriptionExpiry = { $lt: new Date() };
                query.subscriptionTier = { $ne: 'free' };
                break;
            default: // 'all'
                break;
        }

        console.log('Promotional Email - Target Audience:', targetAudience);
        console.log('Promotional Email - Query:', JSON.stringify(query));

        // Debug: Show all unique subscription tiers in database
        const allTiers = await User.distinct('subscriptionTier');
        console.log('DEBUG - All unique subscription tiers in DB:', allTiers);

        const users = await User.find(query, { email: 1, name: 1 });
        console.log(`Promotional Email - Found ${users.length} users`);

        // Debug: show first few user emails
        if (users.length > 0) {
            console.log('First few users:', users.slice(0, 3).map(u => u.email));
        } else {
            // Debug: show what tiers exist in database
            const tierStats = await User.aggregate([
                { $group: { _id: '$subscriptionTier', count: { $sum: 1 } } }
            ]);
            console.log('DEBUG - Subscription tier distribution:', tierStats);
        }

        if (users.length === 0) {
            // Get tier stats for better error message
            const tierStats = await User.aggregate([
                { $group: { _id: '$subscriptionTier', count: { $sum: 1 } } }
            ]);
            console.log('No users found. Tier distribution:', tierStats);
            return res.status(400).json({
                error: 'No users found in target audience',
                debug: tierStats
            });
        }

        // Send emails in background
        console.log('📧 Starting to send promotional emails to', users.length, 'users...');
        console.log('📧 Users to email:', users.map(u => u.email));

        const results = await emailService.sendBulkPromotionalEmail(
            users,
            subject,
            message,
            ctaText,
            ctaUrl,
            couponCode
        );

        console.log('📧 Email send results:', results);

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`✅ Promotional email completed: ${successful} success, ${failed} failed`);

        res.json({
            message: `Promotional email sent to ${successful} users`,
            totalSent: successful,
            totalFailed: failed,
            targetAudience,
        });
    } catch (error) {
        console.error('Send promotional email error:', error);
        res.status(500).json({ error: 'Failed to send promotional emails' });
    }
};

// ==================== PRICE MANAGEMENT ====================

// Get current prices (from environment or defaults)
const getPrices = async (req, res) => {
    try {
        // These could be stored in DB for dynamic updates
        const prices = {
            monthly: parseInt(process.env.PRICE_MONTHLY) || 199,
            quarterly: parseInt(process.env.PRICE_QUARTERLY) || 499,
            biannual: parseInt(process.env.PRICE_BIANNUAL) || 599,
            annual: parseInt(process.env.PRICE_ANNUAL) || 999,
        };
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get prices' });
    }
};

module.exports = {
    getStats,
    getAllUsers,
    deleteUser,
    updateUserRole,
    grantSubscription,
    updateSubscriptionStatus,
    revokeSubscription,
    // Coupon management
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    // Promotional emails
    sendPromotionalEmail,
    // Price management
    getPrices,
};
