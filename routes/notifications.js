const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getTemplates,
    sendToAllUsers,
    sendToUser,
    getStats
} = require('../controllers/notificationController');

// User routes (protected)
router.get('/', auth, getUserNotifications);
router.patch('/:id/read', auth, markAsRead);
router.patch('/read-all', auth, markAllAsRead);
router.delete('/:id', auth, deleteNotification);

// Admin routes (protected + admin only)
router.get('/admin/templates', auth, adminAuth, getTemplates);
router.get('/admin/stats', auth, adminAuth, getStats);
router.post('/admin/send-all', auth, adminAuth, sendToAllUsers);
router.post('/admin/send-user', auth, adminAuth, sendToUser);

module.exports = router;
