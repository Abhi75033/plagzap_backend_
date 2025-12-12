const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');

const {
    getPromoSettings,
    updatePromoSettings,
} = require('../controllers/promoSettingsController');

// All routes here are protected by auth + adminAuth in app.js

// Promotional banner settings (Moved to top for priority)
router.get('/promo-settings', getPromoSettings);
router.put('/promo-settings', updatePromoSettings);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);

// Subscription management routes
router.post('/users/:id/subscription', grantSubscription);
router.patch('/users/:id/subscription', updateSubscriptionStatus);
router.delete('/users/:id/subscription', revokeSubscription);

// Coupon management routes
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Promotional emails
router.post('/emails/promotional', sendPromotionalEmail);

// Price management
router.get('/prices', getPrices);

module.exports = router;
