const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const authMiddleware = require('../middleware/auth');

/**
 * Achievement Routes
 * All routes require authentication
 */

// GET /api/achievements - Get all achievements
router.get('/', authMiddleware, achievementController.getAllAchievements);

// GET /api/achievements/my-progress - Get user's achievement progress
router.get('/my-progress', authMiddleware, achievementController.getMyProgress);

// GET /api/achievements/recent - Get recently unlocked achievements
router.get('/recent', authMiddleware, achievementController.getRecentUnlocks);

// POST /api/achievements/check - Manually trigger achievement check (testing/admin)
router.post('/check', authMiddleware, achievementController.checkAchievements);

module.exports = router;
