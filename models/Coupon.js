/**
 * COUPON MODEL
 * Stores discount coupons for promotional offers
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    discountPercent: {
        type: Number,
        required: true,
        min: 1,
        max: 100,
    },
    discountType: {
        type: String,
        enum: ['percent', 'fixed'],
        default: 'percent',
    },
    fixedAmount: {
        type: Number,
        default: 0,
    },
    description: {
        type: String,
        default: '',
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    usageLimit: {
        type: Number,
        default: null, // null = unlimited
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    usedBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        usedAt: { type: Date, default: Date.now },
    }],
    applicablePlans: [{
        type: String,
        enum: ['monthly', 'quarterly', 'biannual', 'annual'],
    }],
    minOrderAmount: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});

// Check if coupon is valid
couponSchema.methods.isValid = function (userId = null, planId = null, orderAmount = 0) {
    // Check if active
    if (!this.isActive) {
        return { valid: false, reason: 'Coupon is inactive' };
    }

    // Check expiry
    if (new Date() > this.expiresAt) {
        return { valid: false, reason: 'Coupon has expired' };
    }

    // Check usage limit
    if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
        return { valid: false, reason: 'Coupon usage limit reached' };
    }

    // Check if user already used (for one-time coupons per user)
    if (userId && this.usedBy.some(u => u.userId.toString() === userId.toString())) {
        return { valid: false, reason: 'You have already used this coupon' };
    }

    // Check applicable plans
    if (planId && this.applicablePlans.length > 0 && !this.applicablePlans.includes(planId)) {
        return { valid: false, reason: 'Coupon not valid for this plan' };
    }

    // Check minimum order amount
    if (orderAmount < this.minOrderAmount) {
        return { valid: false, reason: `Minimum order amount is ₹${this.minOrderAmount}` };
    }

    return { valid: true };
};

// Calculate discount amount
couponSchema.methods.calculateDiscount = function (originalAmount) {
    if (this.discountType === 'fixed') {
        return Math.min(this.fixedAmount, originalAmount);
    }
    return Math.round((originalAmount * this.discountPercent) / 100);
};

// Mark coupon as used by a user
couponSchema.methods.markUsed = async function (userId) {
    this.usedCount += 1;
    this.usedBy.push({ userId, usedAt: new Date() });
    await this.save();
};

// Static method to generate random coupon code
couponSchema.statics.generateCode = function (prefix = 'PLAG', length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix;
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

module.exports = mongoose.model('Coupon', couponSchema);
