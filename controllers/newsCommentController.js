const NewsComment = require('../models/NewsComment');
const News = require('../models/News');

// Get all comments for a news item
const getComments = async (req, res) => {
    try {
        const { newsId } = req.params;

        const comments = await NewsComment.find({ newsId })
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(comments);
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
};

// Create a comment (requires authentication)
const createComment = async (req, res) => {
    try {
        const { newsId } = req.params;
        const { comment } = req.body;

        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        // Check if news exists
        const news = await News.findById(newsId);
        if (!news) {
            return res.status(404).json({ error: 'News not found' });
        }

        const newComment = new NewsComment({
            newsId,
            user: req.user._id,
            userName: req.user.name,
            userEmail: req.user.email,
            comment: comment.trim()
        });

        await newComment.save();
        res.status(201).json(newComment);
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
};

// Delete a comment (only comment author or admin)
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        const comment = await NewsComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Check if user is comment author or admin
        if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }

        await NewsComment.findByIdAndDelete(commentId);
        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};

// Toggle like on a comment (requires authentication)
const toggleLike = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;

        const comment = await NewsComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Check if user already liked
        const likeIndex = comment.likes.indexOf(userId);

        if (likeIndex > -1) {
            // Unlike
            comment.likes.splice(likeIndex, 1);
        } else {
            // Like
            comment.likes.push(userId);
        }

        await comment.save();
        res.json({
            liked: likeIndex === -1,
            likeCount: comment.likeCount
        });
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ error: 'Failed to toggle like' });
    }
};

module.exports = {
    getComments,
    createComment,
    deleteComment,
    toggleLike
};
