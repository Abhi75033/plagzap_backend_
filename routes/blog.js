const express = require('express');
const router = express.Router();
const {
    getAllBlogs,
    getBlogBySlug
} = require('../controllers/blogController');

// Public routes
router.get('/', getAllBlogs);
router.get('/:slug', getBlogBySlug);

module.exports = router;
