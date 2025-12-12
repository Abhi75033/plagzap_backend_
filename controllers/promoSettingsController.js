const PromoSettings = require('../models/PromoSettings');

// Get current promo settings (admin only)
exports.getPromoSettings = async (req, res) => {
    try {
        const settings = await PromoSettings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Get promo settings error:', error);
        res.status(500).json({ error: 'Failed to get promo settings' });
    }
};

// Update promo settings (admin only)
exports.updatePromoSettings = async (req, res) => {
    try {
        const { enabled, discountPercentage, couponCode, title, description, expiryDate } = req.body;

        // Validation
        if (discountPercentage !== undefined && (discountPercentage < 0 || discountPercentage > 100)) {
            return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
        }

        const settings = await PromoSettings.getSettings();

        if (enabled !== undefined) settings.enabled = enabled;
        if (discountPercentage !== undefined) settings.discountPercentage = discountPercentage;
        if (couponCode !== undefined) settings.couponCode = couponCode.toUpperCase();
        if (title !== undefined) settings.title = title;
        if (description !== undefined) settings.description = description;
        if (expiryDate !== undefined) settings.expiryDate = expiryDate;

        await settings.save();

        res.json({
            success: true,
            message: 'Promo settings updated successfully',
            settings,
        });
    } catch (error) {
        console.error('Update promo settings error:', error);
        res.status(500).json({ error: 'Failed to update promo settings' });
    }
};

// Get active promo (public endpoint)
exports.getActivePromo = async (req, res) => {
    try {
        const settings = await PromoSettings.getSettings();

        // Check if promo is active
        if (!settings.isActive()) {
            return res.json({ active: false });
        }

        // Return only necessary public fields
        res.json({
            active: true,
            discountPercentage: settings.discountPercentage,
            couponCode: settings.couponCode,
            title: settings.title,
            description: settings.description,
            expiryDate: settings.expiryDate,
        });
    } catch (error) {
        console.error('Get active promo error:', error);
        res.status(500).json({ error: 'Failed to get promo' });
    }
};
