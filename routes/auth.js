const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validateEmail } = require('../middleware/validateEmail');
const emailVerificationController = require('../controllers/emailVerificationController');
const passwordResetController = require('../controllers/passwordResetController');
const rateLimit = require('express-rate-limit');

// Rate limiter for password reset (5 requests per hour per IP)
const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: 'Too many password reset attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public routes (with email validation on registration)
router.post('/register', validateEmail, authController.register);
router.post('/login', authController.login);

// Password Reset routes (public with rate limiting)
router.post('/forgot-password', resetLimiter, passwordResetController.forgotPassword);
router.post('/reset-password', passwordResetController.resetPassword);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Email Verification routes
router.post('/verify-email', emailVerificationController.verifyEmail);
router.post('/resend-verification', authMiddleware, emailVerificationController.sendVerificationEmail);
router.get('/verification-status', authMiddleware, emailVerificationController.getVerificationStatus);

// Protected routes
router.get('/me', authMiddleware, authController.me);

// API Key routes
router.get('/api-key', authMiddleware, authController.getApiKey);
router.get('/api-key/history', authMiddleware, authController.getApiKeyHistory);
router.post('/api-key/generate', authMiddleware, authController.generateApiKey);
router.delete('/api-key/:keyId', authMiddleware, authController.revokeApiKey);

module.exports = router;


