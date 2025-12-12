const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Protected routes
router.get('/me', authMiddleware, authController.me);

// API Key routes
router.get('/api-key', authMiddleware, authController.getApiKey);
router.get('/api-key/history', authMiddleware, authController.getApiKeyHistory);
router.post('/api-key/generate', authMiddleware, authController.generateApiKey);
router.delete('/api-key/:keyId', authMiddleware, authController.revokeApiKey);

module.exports = router;

