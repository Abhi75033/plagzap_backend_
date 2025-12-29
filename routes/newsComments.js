const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getComments,
    createComment,
    deleteComment,
    toggleLike
} = require('../controllers/newsCommentController');

// Public - get comments for a news item
router.get('/:newsId/comments', getComments);

// Protected - create, delete, like comments
router.post('/:newsId/comments', auth, createComment);
router.delete('/comments/:commentId', auth, deleteComment);
router.post('/comments/:commentId/like', auth, toggleLike);

module.exports = router;
