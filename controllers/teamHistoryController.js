const History = require('../models/History');
const Team = require('../models/Team');

/**
 * Get team's shared history
 * GET /team/history?page=1&limit=20
 */
exports.getTeamHistory = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const skip = (page - 1) * limit;

        // Find user's team
        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        // Get shared history for this team
        const [history, total] = await Promise.all([
            History.find({
                teamId: team._id,
                sharedWithTeam: true
            })
                .populate('userId', 'name email')
                .populate('comments.userId', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('userId title originalText overallScore createdAt comments'),
            History.countDocuments({
                teamId: team._id,
                sharedWithTeam: true
            })
        ]);

        res.json({
            history,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get team history error:', error);
        res.status(500).json({ error: 'Failed to get team history' });
    }
};

/**
 * Share a history item with team
 * POST /team/history/:id/share
 */
exports.shareWithTeam = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { title } = req.body;

        // Find user's team
        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        // Find history item
        const historyItem = await History.findOne({
            _id: id,
            userId: user._id
        });

        if (!historyItem) {
            return res.status(404).json({ error: 'History item not found' });
        }

        // Share with team
        historyItem.sharedWithTeam = true;
        historyItem.teamId = team._id;
        historyItem.title = title || `Analysis ${new Date().toLocaleDateString()}`;
        await historyItem.save();

        res.json({ success: true, message: 'Shared with team' });

    } catch (error) {
        console.error('Share with team error:', error);
        res.status(500).json({ error: 'Failed to share with team' });
    }
};

/**
 * Unshare a history item from team
 * POST /team/history/:id/unshare
 */
exports.unshareFromTeam = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const historyItem = await History.findOne({
            _id: id,
            userId: user._id
        });

        if (!historyItem) {
            return res.status(404).json({ error: 'History item not found' });
        }

        historyItem.sharedWithTeam = false;
        historyItem.teamId = null;
        await historyItem.save();

        res.json({ success: true, message: 'Removed from team' });

    } catch (error) {
        console.error('Unshare from team error:', error);
        res.status(500).json({ error: 'Failed to unshare' });
    }
};

/**
 * Get team analytics/stats
 * GET /team/analytics
 */
exports.getTeamAnalytics = async (req, res) => {
    try {
        const user = req.user;

        // Find user's team
        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        }).populate('members.user', 'name email');

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        // Get all team member IDs
        const memberIds = [team.owner, ...team.members.map(m => m.user._id)];

        // Aggregate stats
        const [totalAnalyses, avgScore, scoreDistribution, topContributors, recentActivity] = await Promise.all([
            // Total analyses by team members
            History.countDocuments({ userId: { $in: memberIds } }),

            // Average score
            History.aggregate([
                { $match: { userId: { $in: memberIds } } },
                { $group: { _id: null, avgScore: { $avg: '$overallScore' } } }
            ]),

            // Score distribution
            History.aggregate([
                { $match: { userId: { $in: memberIds } } },
                {
                    $bucket: {
                        groupBy: '$overallScore',
                        boundaries: [0, 20, 40, 60, 80, 100],
                        default: 'other',
                        output: { count: { $sum: 1 } }
                    }
                }
            ]),

            // Top contributors
            History.aggregate([
                { $match: { userId: { $in: memberIds } } },
                { $group: { _id: '$userId', count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                { $project: { name: '$user.name', count: 1, avgScore: 1 } }
            ]),

            // Recent activity (last 7 days)
            History.aggregate([
                {
                    $match: {
                        userId: { $in: memberIds },
                        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        res.json({
            teamName: team.name,
            memberCount: team.members.length + 1,
            totalAnalyses,
            averageScore: avgScore[0]?.avgScore || 0,
            scoreDistribution,
            topContributors,
            recentActivity,
            sharedItems: await History.countDocuments({ teamId: team._id, sharedWithTeam: true })
        });

    } catch (error) {
        console.error('Get team analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
};

/**
 * Get shared history item details
 * GET /team/history/:id
 */
exports.getSharedHistoryDetails = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        // Find user's team
        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        // Find the shared history item
        const historyItem = await History.findOne({
            _id: id,
            teamId: team._id,
            sharedWithTeam: true
        })
            .populate('userId', 'name email')
            .populate('comments.userId', 'name email');

        if (!historyItem) {
            return res.status(404).json({ error: 'Shared analysis not found' });
        }

        res.json({ history: historyItem });

    } catch (error) {
        console.error('Get shared history details error:', error);
        res.status(500).json({ error: 'Failed to get details' });
    }
};

/**
 * Add comment to shared history
 * POST /team/history/:id/comment
 */
exports.addComment = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { text, type } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        // Find user's team
        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        // Find the shared history item
        const historyItem = await History.findOne({
            _id: id,
            teamId: team._id,
            sharedWithTeam: true
        });

        if (!historyItem) {
            return res.status(404).json({ error: 'Shared analysis not found' });
        }

        // Add comment
        const comment = {
            userId: user._id,
            text: text.trim(),
            type: type || 'comment',
            createdAt: new Date()
        };

        historyItem.comments.push(comment);
        await historyItem.save();

        // Return the comment with populated user
        const populatedHistory = await History.findById(id)
            .populate('comments.userId', 'name email');

        const addedComment = populatedHistory.comments[populatedHistory.comments.length - 1];

        res.status(201).json({
            success: true,
            comment: addedComment
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
};

/**
 * Delete comment from shared history
 * DELETE /team/history/:id/comment/:commentId
 */
exports.deleteComment = async (req, res) => {
    try {
        const user = req.user;
        const { id, commentId } = req.params;

        const historyItem = await History.findById(id);

        if (!historyItem) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        const comment = historyItem.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        // Only comment author can delete
        if (comment.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ error: 'You can only delete your own comments' });
        }

        historyItem.comments.pull(commentId);
        await historyItem.save();

        res.json({ success: true, message: 'Comment deleted' });

    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};
