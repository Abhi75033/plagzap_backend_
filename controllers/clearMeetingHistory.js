// Clear user's meeting history
exports.clearMeetingHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        // Delete all meetings where user is host or participant
        const result = await Meeting.deleteMany({
            $or: [
                { host: userId },
                { participants: userId }
            ]
        });

        res.json({
            success: true,
            message: `Cleared ${result.deletedCount} meeting(s) from history`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error clearing meeting history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear meeting history'
        });
    }
};
