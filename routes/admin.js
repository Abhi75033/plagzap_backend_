const express = require('express');
const router = express.Router();
const {
    getStats,
    getAllUsers,
    deleteUser,
    updateUserRole,
    verifyUserEmail, // NEW: Manual email verification
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

const {
    getAdminBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    toggleFeatured
} = require('../controllers/blogController');

const {
    getAdminNews,
    createNews,
    updateNews,
    deleteNews
} = require('../controllers/newsController');

// All routes here are protected by auth + adminAuth in app.js

// Promotional banner settings (Moved to top for priority)
router.get('/promo-settings', getPromoSettings);
router.put('/promo-settings', updatePromoSettings);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);
router.post('/users/:id/verify-email', verifyUserEmail); // NEW: Manual email verification

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

// Blog management routes
router.get('/blogs', getAdminBlogs);
router.post('/blogs', createBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);
router.patch('/blogs/:id/featured', toggleFeatured);

// News management routes
router.get('/news', getAdminNews);
router.post('/news', createNews);
router.put('/news/:id', updateNews);
router.delete('/news/:id', deleteNews);

module.exports = router;
