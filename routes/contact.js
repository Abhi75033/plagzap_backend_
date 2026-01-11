const express = require('express');
const router = express.Router();
const {
    submitContact,
    getAllContacts,
    getContactStats,
    updateContactStatus,
    deleteContact
} = require('../controllers/contactController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Public route
router.post('/submit', submitContact);

// Admin routes (require both authentication and admin privileges)
router.get('/admin/all', auth, adminAuth, getAllContacts);
router.get('/admin/stats', auth, adminAuth, getContactStats);
router.put('/admin/:id/status', auth, adminAuth, updateContactStatus);
router.delete('/admin/:id', auth, adminAuth, deleteContact);

module.exports = router;
