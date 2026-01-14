const express = require('express');
const router = express.Router();
const {
    getActiveJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob,
    getAllJobs
} = require('../controllers/jobController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.get('/', getActiveJobs);
router.get('/:id', getJobById);

// Admin routes
router.post('/', auth, adminAuth, createJob);
router.put('/:id', auth, adminAuth, updateJob);
router.delete('/:id', auth, adminAuth, deleteJob);
router.get('/admin/all', auth, adminAuth, getAllJobs);

module.exports = router;
