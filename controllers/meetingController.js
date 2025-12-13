const Meeting = require('../models/Meeting');

/**
 * Google Meet-style video meeting controller
 * Handles REST API endpoints for meeting management
 */

// Create a new meeting
exports.createMeeting = async (req, res) => {
    try {
        const { title, maxParticipants = 50 } = req.body;
        const userId = req.user.id;

        // Generate unique code
        let code;
        let codeExists = true;
        while (codeExists) {
            code = Meeting.generateCode();
            codeExists = await Meeting.findOne({ code });
        }
        // Create meeting
        const meeting = new Meeting({
            code,
            title: title || `${req.user.name}'s Meeting`,
            host: req.user.id,
            createdBy: req.user.id,
            participants: [req.user.id],  // Simplified: just array of user IDs
            settings: {
                maxParticipants: maxParticipants || 50,
                requireAuth: true,
                allowScreenShare: true,
                allowChat: true
            },
            status: 'scheduled'
        });
        await meeting.save();

        res.status(201).json({
            success: true,
            meeting: {
                code: meeting.code,
                title: meeting.title,
                host: meeting.host,
                createdAt: meeting.createdAt,
                expiresAt: meeting.expiresAt,
                settings: meeting.settings
            }
        });
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create meeting'
        });
    }
};

// Get meeting details
exports.getMeeting = async (req, res) => {
    try {
        const { code } = req.params;

        const meeting = await Meeting.findOne({ code })
            .populate('host', 'name email')
            .populate('participants.user', 'name email');

        if (!meeting) {
            return res.status(404).json({
                success: false,
                error: 'Meeting not found'
            });
        }

        // Check if expired
        if (meeting.expiresAt < new Date() && meeting.status !== 'active') {
            return res.status(410).json({
                success: false,
                error: 'Meeting has expired'
            });
        }

        res.json({
            success: true,
            meeting: {
                code: meeting.code,
                title: meeting.title,
                host: meeting.host,
                status: meeting.status,
                participants: meeting.participants.map(p => ({
                    user: p
                })),
                settings: meeting.settings,
                createdAt: meeting.createdAt,
                expiresAt: meeting.expiresAt
            }
        });
    } catch (error) {
        console.error('Error getting meeting:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch meeting'
        });
    }
};

// Join a meeting (validate access)
exports.joinMeeting = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user.id;

        const meeting = await Meeting.findOne({ code });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                error: 'Meeting not found'
            });
        }

        // Check if expired
        if (meeting.expiresAt < new Date() && meeting.status !== 'active') {
            return res.status(410).json({
                success: false,
                error: 'Meeting has expired'
            });
        }

        // Check participant limit
        const activeParticipants = meeting.participants.filter(p => !p.leftAt).length;
        if (activeParticipants >= meeting.settings.maxParticipants) {
            return res.status(403).json({
                success: false,
                error: 'Meeting is full'
            });
        }

        // Add participant if not already in meeting
        await meeting.addParticipant(userId);

        // Update status to active if not already
        if (meeting.status === 'scheduled') {
            meeting.status = 'active';
            await meeting.save();
        }

        res.json({
            success: true,
            message: 'Successfully joined meeting',
            meeting: {
                code: meeting.code,
                title: meeting.title
            }
        });
    } catch (error) {
        console.error('Error joining meeting:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join meeting'
        });
    }
};

// End a meeting (host only)
exports.endMeeting = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user.id;

        const meeting = await Meeting.findOne({ code });

        if (!meeting) {
            return res.status(404).json({
                success: false,
                error: 'Meeting not found'
            });
        }

        // Check if user is host
        if (meeting.host.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Only the host can end the meeting'
            });
        }

        meeting.status = 'ended';
        await meeting.save();

        res.json({
            success: true,
            message: 'Meeting ended successfully'
        });
    } catch (error) {
        console.error('Error ending meeting:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to end meeting'
        });
    }
};

// Get user's meetings
exports.getUserMeetings = async (req, res) => {
    try {
        const userId = req.user.id;

        const meetings = await Meeting.find({
            $or: [
                { host: userId },
                { 'participants.user': userId }
            ],
            status: { $ne: 'ended' },
            expiresAt: { $gt: new Date() }
        })
            .populate('host', 'name email')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            meetings: meetings.map(m => ({
                code: m.code,
                title: m.title,
                host: m.host,
                status: m.status,
                participantCount: m.participants.length,
                createdAt: m.createdAt,
                expiresAt: m.expiresAt
            }))
        });
    } catch (error) {
        console.error('Error fetching user meetings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch meetings'
        });
    }
};

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
