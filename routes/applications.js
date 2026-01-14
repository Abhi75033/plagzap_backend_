const express = require('express');
const router = express.Router();
const {
    applyForJob,
    getMyApplications,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus,
    scheduleInterview,
    downloadResume,
    getApplicationStats
} = require('../controllers/applicationController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Try to load upload, fallback to null if multer not installed
let upload;
try {
    upload = require('../config/upload');
} catch (error) {
    console.warn('Warning: Multer not installed. File uploads will not work.');
    upload = { single: () => (req, res, next) => next() }; // Mock middleware
}

// User routes (protected)
router.post('/apply/:id', auth, upload.single('resume'), applyForJob);
router.get('/my', auth, getMyApplications);

// Admin routes (protected + admin)
router.get('/admin/all', auth, adminAuth, getAllApplications);
router.get('/admin/stats', auth, adminAuth, getApplicationStats);
router.get('/admin/:id', auth, adminAuth, getApplicationById);
router.put('/admin/:id/status', auth, adminAuth, updateApplicationStatus);
router.post('/admin/:id/interview', auth, adminAuth, scheduleInterview);
router.get('/admin/:id/resume', auth, adminAuth, downloadResume);

module.exports = router;
