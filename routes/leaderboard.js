const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const authMiddleware = require('../middleware/auth');

/**
 * Leaderboard Routes
 * All routes require authentication
 */

// GET /api/leaderboard/global - Global leaderboard
router.get('/global', authMiddleware, leaderboardController.getGlobalLeaderboard);

// GET /api/leaderboard/university - University leaderboard
router.get('/university', authMiddleware, leaderboardController.getUniversityLeaderboard);

// GET /api/leaderboard/my-rank - User's current rank
router.get('/my-rank', authMiddleware, leaderboardController.getMyRank);

// GET /api/leaderboard/top-performers - Top performers (homepage)
router.get('/top-performers', leaderboardController.getTopPerformers); // Public endpoint

module.exports = router;
