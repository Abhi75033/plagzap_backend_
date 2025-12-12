const Feedback = require('../models/Feedback');

/**
 * Get all approved feedbacks (public)
 * GET /feedback
 */
exports.getApprovedFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ status: 'approved' })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ feedbacks });
    } catch (error) {
        console.error('Get feedbacks error:', error);
        res.status(500).json({ error: 'Failed to get feedbacks' });
    }
};

/**
 * Submit a new feedback (public)
 * POST /feedback
 */
exports.submitFeedback = async (req, res) => {
    try {
        const { name, role, message, rating } = req.body;

        if (!name || !message) {
            return res.status(400).json({ error: 'Name and message are required' });
        }

        const feedback = new Feedback({
            name,
            role: role || 'PlagZap User',
            message,
            rating: rating || 5,
            status: 'pending', // Always starts as pending for admin review
            userId: req.user?._id || null
        });

        await feedback.save();

        res.status(201).json({
            success: true,
            message: 'Thank you! Your feedback will be reviewed shortly.',
            feedback
        });
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
};

/**
 * Get all feedbacks for admin (admin only)
 * GET /admin/feedbacks
 */
exports.getAllFeedbacks = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};

        const feedbacks = await Feedback.find(query)
            .sort({ createdAt: -1 })
            .populate('userId', 'name email');

        res.json({ feedbacks });
    } catch (error) {
        console.error('Get all feedbacks error:', error);
        res.status(500).json({ error: 'Failed to get feedbacks' });
    }
};

/**
 * Update feedback status (admin only)
 * PATCH /admin/feedbacks/:id
 */
exports.updateFeedbackStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body;

        if (!['pending', 'approved', 'onhold', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const feedback = await Feedback.findByIdAndUpdate(
            id,
            { status, adminNote },
            { new: true }
        );

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({ success: true, feedback });
    } catch (error) {
        console.error('Update feedback status error:', error);
        res.status(500).json({ error: 'Failed to update feedback' });
    }
};

/**
 * Delete feedback (admin only)
 * DELETE /admin/feedbacks/:id
 */
exports.deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;

        const feedback = await Feedback.findByIdAndDelete(id);

        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ error: 'Failed to delete feedback' });
    }
};
