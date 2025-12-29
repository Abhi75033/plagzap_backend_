const express = require('express');
const router = express.Router();
const {
    submitContact,
    getAllContacts,
    getContactStats,
    updateContactStatus,
    deleteContact
} = require('../controllers/contactController');
const adminAuth = require('../middleware/adminAuth');

// Public route
router.post('/submit', submitContact);

// Admin routes
router.get('/admin/all', adminAuth, getAllContacts);
router.get('/admin/stats', adminAuth, getContactStats);
router.put('/admin/:id/status', adminAuth, updateContactStatus);
router.delete('/admin/:id', adminAuth, deleteContact);

module.exports = router;
