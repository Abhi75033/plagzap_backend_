const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/plans', subscriptionController.getPlans);

// Razorpay webhook route (no auth middleware)
router.post('/webhook', express.json(), subscriptionController.handleWebhook);

// Protected routes
router.post('/create-order', authMiddleware, subscriptionController.createOrder);
router.post('/verify-payment', authMiddleware, subscriptionController.verifyPayment);
router.post('/purchase', authMiddleware, subscriptionController.purchaseSubscription); // Mock purchase for testing
router.post('/cancel', authMiddleware, subscriptionController.cancelSubscription);
router.get('/usage', authMiddleware, subscriptionController.getUsage);

// Coupon validation
router.post('/validate-coupon', authMiddleware, subscriptionController.validateCoupon);

module.exports = router;
