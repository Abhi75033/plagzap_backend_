const User = require('../models/User');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay only if keys are available
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized');
} else {
    console.warn('⚠️ Razorpay keys not found. Payment features disabled.');
}

// Subscription plans
const SUBSCRIPTION_PLANS = [
    {
        id: 'free',
        name: 'Free Tier',
        price: 0,
        currency: 'INR',
        duration: 'forever',
        durationDays: 0,
        limit: 5,
        features: [
            '5 plagiarism checks',
            '5 AI rewrites',
            'Basic highlighting',
            'Limited history',
        ],
    },
    {
        id: 'monthly',
        name: 'Monthly Plan',
        price: 99,
        currency: 'INR',
        duration: '1 month',
        durationDays: 30,
        limit: null,
        features: [
            'Unlimited plagiarism checks',
            'Unlimited AI rewrites',
            'Advanced highlighting',
            'Full history access',
            'Priority support',
        ],
    },
    {
        id: 'quarterly',
        name: '3 Month Plan',
        price: 199,
        currency: 'INR',
        duration: '3 months',
        durationDays: 90,
        limit: null,
        features: [
            'Unlimited plagiarism checks',
            'Unlimited AI rewrites',
            'Advanced highlighting',
            'Full history access',
            'Priority support',
            '33% savings',
        ],
    },
    {
        id: 'biannual',
        name: '6 Month Plan',
        price: 599,
        currency: 'INR',
        duration: '6 months',
        durationDays: 180,
        limit: null,
        features: [
            'Unlimited plagiarism checks',
            'Unlimited AI rewrites',
            'Advanced highlighting',
            'Full history access',
            'Premium support',
            '50% savings',
        ],
    },
    {
        id: 'annual',
        name: 'Annual Plan',
        price: 1299,
        currency: 'INR',
        duration: '1 year',
        durationDays: 365,
        limit: null,
        features: [
            'Unlimited plagiarism checks',
            'Unlimited AI rewrites',
            'Advanced highlighting',
            'Full history access',
            'Premium support',
            '65% savings',
            'Early access to new features',
        ],
    },
];

// Get all subscription plans
exports.getPlans = async (req, res) => {
    try {
        res.json({ plans: SUBSCRIPTION_PLANS });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create Razorpay order
exports.createOrder = async (req, res) => {
    try {
        // Check if Razorpay is properly initialized
        if (!razorpay) {
            console.error('❌ Razorpay not initialized. Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.');
            return res.status(503).json({
                error: 'Payment service is not configured. Please contact support.',
                details: 'Razorpay credentials are missing on the server.'
            });
        }

        const { planId, couponCode } = req.body;
        const user = req.user;

        // Validate plan
        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
        if (!plan || plan.id === 'free') {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        let finalPrice = plan.price;
        let appliedCoupon = null;
        let discountAmount = 0;

        // Apply coupon if provided
        if (couponCode) {
            const Coupon = require('../models/Coupon');
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

            if (!coupon) {
                return res.status(400).json({ error: 'Invalid coupon code' });
            }

            const validation = coupon.isValid(user._id, planId, plan.price);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.reason });
            }

            discountAmount = coupon.calculateDiscount(plan.price);
            finalPrice = Math.max(plan.price - discountAmount, 0);
            appliedCoupon = {
                code: coupon.code,
                discountPercent: coupon.discountPercent,
                discountAmount,
                couponId: coupon._id,
            };

            console.log(`✅ Coupon ${coupon.code} applied: ₹${discountAmount} off`);
        }

        // Create Razorpay order with final price
        const options = {
            amount: finalPrice * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`, // Shortened to under 40 chars
            notes: {
                userId: user._id.toString(),
                planId: plan.id,
                durationDays: plan.durationDays.toString(),
                userEmail: user.email,
                couponCode: couponCode || '',
                originalAmount: plan.price.toString(),
                discountAmount: discountAmount.toString(),
            },
        };

        const order = await razorpay.orders.create(options);

        res.json({
            orderId: order.id,
            amount: order.amount,
            originalAmount: plan.price * 100,
            discountAmount: discountAmount * 100,
            currency: order.currency,
            planId: plan.id,
            planName: plan.name,
            keyId: process.env.RAZORPAY_KEY_ID,
            appliedCoupon,
        });
    } catch (error) {
        console.error('Create Razorpay order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

// Verify payment and activate subscription
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
        const user = req.user;

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Get plan details
        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
        if (!plan) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        // Activate subscription
        user.subscriptionTier = plan.id;
        user.subscriptionExpiry = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
        user.usageCount = 0;
        await user.save();

        console.log(`✅ Subscription activated for user ${user.email}: ${plan.id}`);

        res.json({
            success: true,
            message: `Successfully subscribed to ${plan.name}`,
            subscription: {
                tier: user.subscriptionTier,
                expiry: user.subscriptionExpiry,
            },
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

// Handle Razorpay webhook events
exports.handleWebhook = async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
        console.error('Webhook signature verification failed');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
        const payment = payload.payment.entity;
        const notes = payment.notes;

        try {
            const userId = notes.userId;
            const planId = notes.planId;
            const durationDays = parseInt(notes.durationDays);

            const user = await User.findById(userId);
            if (user) {
                user.subscriptionTier = planId;
                user.subscriptionExpiry = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
                user.usageCount = 0;
                await user.save();

                console.log(`✅ [Webhook] Subscription activated for user ${user.email}: ${planId}`);
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
        }
    }

    res.json({ status: 'ok' });
};

// Purchase subscription (mock - for testing)
exports.purchaseSubscription = async (req, res) => {
    try {
        const { planId } = req.body;
        const user = req.user;

        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
        if (!plan) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        if (plan.id === 'free') {
            return res.status(400).json({ error: 'Cannot purchase free plan' });
        }

        console.log(`[MOCK] Processing payment of ₹${plan.price} for user ${user.email}`);

        user.subscriptionTier = plan.id;
        user.subscriptionExpiry = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
        user.usageCount = 0;
        await user.save();

        res.json({
            success: true,
            message: `Successfully subscribed to ${plan.name}`,
            subscription: {
                tier: user.subscriptionTier,
                expiry: user.subscriptionExpiry,
            },
        });
    } catch (error) {
        console.error('Purchase subscription error:', error);
        res.status(500).json({ error: 'Server error during purchase' });
    }
};

// Get usage information
exports.getUsage = async (req, res) => {
    try {
        const user = req.user;
        const plan = SUBSCRIPTION_PLANS.find((p) => p.id === user.subscriptionTier);
        const analysisStatus = user.canPerformAnalysis();

        // Reset daily usage if new day
        user.resetDailyUsageIfNeeded();
        await user.save();

        res.json({
            usageCount: user.usageCount,
            dailyUsageCount: user.dailyUsageCount,
            dailyLimit: user.getDailyLimit(),
            totalLimit: plan?.limit,
            ...analysisStatus,
            subscriptionTier: user.subscriptionTier,
            subscriptionExpiry: user.subscriptionExpiry,
            hasActiveSubscription: user.hasActiveSubscription(),
        });
    } catch (error) {
        console.error('Get usage error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Cancel subscription - downgrade to free tier
exports.cancelSubscription = async (req, res) => {
    try {
        const user = req.user;

        // Check if user has an active paid subscription
        if (user.subscriptionTier === 'free') {
            return res.status(400).json({ error: 'You are already on the free plan' });
        }

        // Store previous tier for response
        const previousTier = user.subscriptionTier;
        const previousExpiry = user.subscriptionExpiry;

        // Downgrade to free tier
        user.subscriptionTier = 'free';
        user.subscriptionExpiry = null;
        user.usageCount = 0;
        user.dailyUsageCount = 0;

        await user.save();

        console.log(`❌ Subscription cancelled for user ${user.email}: ${previousTier} -> free`);

        res.json({
            success: true,
            message: 'Subscription cancelled successfully. You have been downgraded to the free plan.',
            previousSubscription: {
                tier: previousTier,
                expiry: previousExpiry,
            },
            currentSubscription: {
                tier: 'free',
                expiry: null,
            },
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
};

// Validate coupon code (for users to check before checkout)
exports.validateCoupon = async (req, res) => {
    try {
        const { code, planId } = req.body;
        const user = req.user;

        if (!code) {
            return res.status(400).json({ error: 'Coupon code is required' });
        }

        const Coupon = require('../models/Coupon');
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

        if (!coupon) {
            return res.status(404).json({ valid: false, error: 'Invalid coupon code' });
        }

        // Check basic validity (expiry, usage limit, already used by user)
        if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
            return res.status(400).json({ valid: false, error: 'Coupon has expired' });
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ valid: false, error: 'Coupon usage limit reached' });
        }
        if (coupon.usedBy && coupon.usedBy.includes(user._id)) {
            return res.status(400).json({ valid: false, error: 'You have already used this coupon' });
        }

        // If planId provided, validate against specific plan; otherwise just return coupon info

        console.log(`Coupon ${coupon.code} validated. ApplicablePlans: ${JSON.stringify(coupon.applicablePlans)}`);

        res.json({
            valid: true,
            coupon: {
                code: coupon.code,
                discountPercent: coupon.discountPercent,
                discountType: coupon.discountType || 'percent',
                expiresAt: coupon.expiresAt,
                description: coupon.description,
                applicablePlans: coupon.applicablePlans || [],
            },
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({ error: 'Failed to validate coupon' });
    }
};
