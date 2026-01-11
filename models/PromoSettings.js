const mongoose = require('mongoose');

const promoSettingsSchema = new mongoose.Schema({
    enabled: {
        type: Boolean,
        default: false,
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 50,
    },
    couponCode: {
        type: String,
        required: true,
        uppercase: true,
        default: 'WELCOME50',
    },
    title: {
        type: String,
        default: 'Limited Time Offer!',
    },
    description: {
        type: String,
        default: 'Get started with our premium plans at a special discount',
    },
    expiryDate: {
        type: Date,
        default: null, // null means no expiry
    },
}, {
    timestamps: true,
});

// Ensure only one settings document exists
promoSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

// Check if promo is currently active
promoSettingsSchema.methods.isActive = function () {
    if (!this.enabled) return false;
    if (this.expiryDate && new Date() > this.expiryDate) return false;
    return true;
};

module.exports = mongoose.model('PromoSettings', promoSettingsSchema);
