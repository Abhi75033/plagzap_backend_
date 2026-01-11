const Message = require('../models/Message');
const Team = require('../models/Team');
const User = require('../models/User');
const { encrypt, decrypt, isEncrypted } = require('../utils/encryption');

/**
 * Get messages for user's team
 * GET /team/messages?page=1&limit=50&tag=optional
 */
exports.getMessages = async (req, res) => {
    try {
        const user = req.user;

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

        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;
        const tag = req.query.tag;

        // Build query
        const query = { teamId: team._id, deleted: false };
        if (tag) {
            query.tags = tag.toLowerCase();
        }

        // Get pinned messages first, then regular messages
        const [pinnedMessages, regularMessages, totalCount] = await Promise.all([
            Message.find({ ...query, pinned: true })
                .populate('sender', 'name email badges')
                .populate('mentions', 'name')
                .sort({ createdAt: -1 })
                .limit(5),
            Message.find({ ...query, pinned: false })
                .populate('sender', 'name email badges')
                .populate('mentions', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Message.countDocuments(query)
        ]);

        // Combine: pinned first (only on page 1), then regular
        let messages = page === 1
            ? [...pinnedMessages, ...regularMessages]
            : regularMessages;

        // Decrypt message content for display
        messages = messages.map(msg => {
            const msgObj = msg.toObject();
            if (isEncrypted(msgObj.content)) {
                msgObj.content = decrypt(msgObj.content);
            }
            return msgObj;
        });

        res.json({
            messages,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
};

/**
 * Send a new message
 * POST /team/messages { content, type, replyTo }
 */
exports.sendMessage = async (req, res) => {
    try {
        const user = req.user;
        const { content, type = 'message', replyTo } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Find user's team
        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        }).populate('members.user', 'name');

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        // Check if user can post announcements (admin only)
        if (type === 'announcement') {
            const member = team.members.find(m => m.user._id.toString() === user._id.toString());
            if (!member || member.role !== 'admin') {
                return res.status(403).json({ error: 'Only admins can post announcements' });
            }
        }

        // Extract tags and mentions from content
        const tags = Message.extractTags(content);
        const mentionUsernames = Message.extractMentionUsernames(content);

        // Resolve mention usernames to user IDs
        const mentionedUsers = [];
        for (const username of mentionUsernames) {
            // Find user in team by name (case-insensitive)
            const teamMember = team.members.find(m =>
                m.user.name.toLowerCase() === username.toLowerCase()
            );
            if (teamMember) {
                mentionedUsers.push(teamMember.user._id);
            }
        }

        // Encrypt message content before saving
        const encryptedContent = encrypt(content.trim());

        const message = new Message({
            teamId: team._id,
            sender: user._id,
            content: encryptedContent,
            type,
            tags,
            mentions: mentionedUsers,
            status: 'sent',
            replyTo: replyTo || null // Support for thread replies
        });

        await message.save();

        // Populate sender, mentions, and replyTo for response
        await message.populate('sender', 'name email badges');
        await message.populate('mentions', 'name');
        if (message.replyTo) {
            await message.populate({
                path: 'replyTo',
                select: 'content sender',
                populate: { path: 'sender', select: 'name' }
            });
        }

        // Return decrypted content for immediate display
        const responseMessage = message.toObject();
        responseMessage.content = content.trim(); // Original unencrypted

        res.status(201).json({ message: responseMessage });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

/**
 * Delete a message
 * DELETE /team/messages/:id
 */
exports.deleteMessage = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const message = await Message.findById(id);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check if user is the sender or team admin
        const team = await Team.findById(message.teamId);
        const isAdmin = team.members.some(m =>
            m.user.toString() === user._id.toString() && m.role === 'admin'
        );
        const isOwner = message.sender.toString() === user._id.toString();

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'You can only delete your own messages' });
        }

        // Soft delete
        message.deleted = true;
        await message.save();

        res.json({ success: true });

    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
};

/**
 * Add/remove reaction to a message
 * POST /team/messages/:id/react { emoji }
 */
exports.addReaction = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { emoji } = req.body;

        if (!emoji) {
            return res.status(400).json({ error: 'Emoji is required' });
        }

        const message = await Message.findById(id);
        if (!message || message.deleted) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Find existing reaction with this emoji
        const existingReaction = message.reactions.find(r => r.emoji === emoji);

        if (existingReaction) {
            // Toggle: if user already reacted, remove; otherwise add
            const userIndex = existingReaction.users.findIndex(
                u => u.toString() === user._id.toString()
            );

            if (userIndex > -1) {
                // Remove user from this reaction
                existingReaction.users.splice(userIndex, 1);
                // If no users left, remove the reaction entirely
                if (existingReaction.users.length === 0) {
                    message.reactions = message.reactions.filter(r => r.emoji !== emoji);
                }
            } else {
                // Add user to this reaction
                existingReaction.users.push(user._id);
            }
        } else {
            // Add new reaction
            message.reactions.push({
                emoji,
                users: [user._id]
            });
        }

        await message.save();
        await message.populate('sender', 'name email badges');
        await message.populate('mentions', 'name');

        res.json({ message });

    } catch (error) {
        console.error('Add reaction error:', error);
        res.status(500).json({ error: 'Failed to add reaction' });
    }
};

/**
 * Toggle pin on a message (admin only)
 * POST /team/messages/:id/pin
 */
exports.togglePin = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const message = await Message.findById(id);
        if (!message || message.deleted) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check if user is team admin
        const team = await Team.findById(message.teamId);
        const isAdmin = team.members.some(m =>
            m.user.toString() === user._id.toString() && m.role === 'admin'
        );

        if (!isAdmin) {
            return res.status(403).json({ error: 'Only admins can pin messages' });
        }

        message.pinned = !message.pinned;
        await message.save();
        await message.populate('sender', 'name email badges');
        await message.populate('mentions', 'name');

        res.json({ message });

    } catch (error) {
        console.error('Toggle pin error:', error);
        res.status(500).json({ error: 'Failed to toggle pin' });
    }
};

/**
 * Get team members for @mention autocomplete
 * GET /team/members
 */
exports.getTeamMembers = async (req, res) => {
    try {
        const user = req.user;

        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        }).populate('members.user', 'name email badges');

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        const members = team.members.map(m => ({
            id: m.user._id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            badges: m.user.badges || []
        }));

        res.json({ members });

    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ error: 'Failed to get team members' });
    }
};

/**
 * Mark messages as read (WhatsApp-style read receipts)
 * POST /team/messages/read { messageIds: [...] }
 */
exports.markAsRead = async (req, res) => {
    try {
        const user = req.user;
        const { messageIds } = req.body;

        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ error: 'Message IDs are required' });
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

        // Update messages: add user to readBy if not already there
        const updatedMessages = await Message.updateMany(
            {
                _id: { $in: messageIds },
                teamId: team._id,
                sender: { $ne: user._id }, // Don't mark own messages as read
                'readBy.user': { $ne: user._id } // Not already read by this user
            },
            {
                $push: {
                    readBy: {
                        user: user._id,
                        readAt: new Date()
                    }
                }
            }
        );

        // Update status to 'read' for messages where all team members have read
        // For simplicity, we'll update status based on at least one person reading
        await Message.updateMany(
            {
                _id: { $in: messageIds },
                teamId: team._id,
                'readBy.0': { $exists: true } // At least one person read
            },
            { status: 'read' }
        );

        res.json({
            success: true,
            updatedCount: updatedMessages.modifiedCount
        });

    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
};

/**
 * Get read receipt details for a message
 * GET /team/messages/:id/receipts
 */
exports.getReadReceipts = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const message = await Message.findById(id)
            .populate('readBy.user', 'name email')
            .populate('sender', 'name');

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Verify user is in the same team
        const team = await Team.findOne({
            _id: message.teamId,
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });

        if (!team) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            messageId: message._id,
            status: message.status,
            sender: message.sender,
            readBy: message.readBy.map(r => ({
                user: r.user,
                readAt: r.readAt
            })),
            totalMembers: team.members.length,
            readCount: message.readBy.length
        });

    } catch (error) {
        console.error('Get read receipts error:', error);
        res.status(500).json({ error: 'Failed to get read receipts' });
    }
};

/**
 * Clear all messages (admin only)
 * DELETE /team/messages/clear-all
 */
exports.clearAllMessages = async (req, res) => {
    try {
        const user = req.user;

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

        // Check if user is admin
        const isOwner = team.owner.toString() === user._id.toString();
        const member = team.members.find(m => m.user.toString() === user._id.toString());
        const isAdmin = isOwner || (member && member.role === 'admin');

        if (!isAdmin) {
            return res.status(403).json({ error: 'Only admins can clear messages' });
        }

        // Soft delete all messages
        await Message.updateMany(
            { teamId: team._id },
            { deleted: true }
        );

        res.json({ success: true, message: 'All messages cleared' });

    } catch (error) {
        console.error('Clear messages error:', error);
        res.status(500).json({ error: 'Failed to clear messages' });
    }
};

/**
 * Update team settings (admin only)
 * PATCH /team/settings
 */
exports.updateTeamSettings = async (req, res) => {
    try {
        const user = req.user;
        const { adminOnlyMessages, teamName } = req.body;

        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        // Check if user is admin
        const isOwner = team.owner.toString() === user._id.toString();
        const member = team.members.find(m => m.user.toString() === user._id.toString());
        const isAdmin = isOwner || (member && member.role === 'admin');

        if (!isAdmin) {
            return res.status(403).json({ error: 'Only admins can update settings' });
        }

        // Update settings
        if (typeof adminOnlyMessages === 'boolean') {
            team.adminOnlyMessages = adminOnlyMessages;
        }
        if (teamName) {
            team.name = teamName.trim();
        }

        await team.save();

        res.json({ success: true, team });

    } catch (error) {
        console.error('Update team settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

/**
 * Get team settings
 * GET /team/settings
 */
exports.getTeamSettings = async (req, res) => {
    try {
        const user = req.user;

        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        res.json({
            teamId: team._id,
            name: team.name,
            adminOnlyMessages: team.adminOnlyMessages || false,
            inviteCode: team.inviteCode,
            memberCount: team.members.length
        });

    } catch (error) {
        console.error('Get team settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
};

/**
 * Update member role (admin only)
 * PATCH /team/members/:memberId/role
 */
exports.updateMemberRole = async (req, res) => {
    try {
        const user = req.user;
        const { memberId } = req.params;
        const { role } = req.body;

        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        // Check if user is owner (only owner can change roles)
        const isOwner = team.owner.toString() === user._id.toString();
        if (!isOwner) {
            return res.status(403).json({ error: 'Only team owner can change member roles' });
        }

        // Find and update member
        const memberIndex = team.members.findIndex(m => m.user.toString() === memberId);
        if (memberIndex === -1) {
            return res.status(404).json({ error: 'Member not found' });
        }

        team.members[memberIndex].role = role;
        await team.save();

        res.json({ success: true, message: `Member role updated to ${role}` });

    } catch (error) {
        console.error('Update member role error:', error);
        res.status(500).json({ error: 'Failed to update member role' });
    }
};

/**
 * Remove member from team (admin only)
 * DELETE /team/members/:memberId
 */
exports.removeMember = async (req, res) => {
    try {
        const user = req.user;
        const { memberId } = req.params;

        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        // Check if user is admin
        const isOwner = team.owner.toString() === user._id.toString();
        const member = team.members.find(m => m.user.toString() === user._id.toString());
        const isAdmin = isOwner || (member && member.role === 'admin');

        if (!isAdmin) {
            return res.status(403).json({ error: 'Only admins can remove members' });
        }

        // Can't remove owner
        if (memberId === team.owner.toString()) {
            return res.status(400).json({ error: 'Cannot remove team owner' });
        }

        // Remove member
        team.members = team.members.filter(m => m.user.toString() !== memberId);
        await team.save();

        res.json({ success: true, message: 'Member removed from team' });

    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
};

/**
 * Mute/Unmute a team member
 * POST /team/members/:memberId/mute
 */
exports.muteUnmuteMember = async (req, res) => {
    try {
        const user = req.user;
        const { memberId } = req.params;
        const { mute, duration } = req.body; // duration in hours

        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        }).populate('members.user', 'name email');

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Check if user is admin
        const isAdmin = team.owner.toString() === user._id.toString() ||
            team.members.some(m => m.user._id.toString() === user._id.toString() && m.role === 'admin');

        if (!isAdmin) {
            return res.status(403).json({ error: 'Only admins can mute members' });
        }

        const member = team.members.find(m => m.user._id.toString() === memberId);
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Can't mute owner or other admins
        if (team.owner.toString() === memberId) {
            return res.status(403).json({ error: 'Cannot mute the owner' });
        }
        if (member.role === 'admin' && team.owner.toString() !== user._id.toString()) {
            return res.status(403).json({ error: 'Only owner can mute admins' });
        }

        member.muted = mute;
        member.mutedUntil = mute && duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;
        await team.save();

        // Log activity
        await team.addActivityLog(
            mute ? 'member_muted' : 'member_unmuted',
            user._id,
            memberId,
            mute ? `Muted for ${duration || 'indefinitely'} hours` : 'Unmuted'
        );

        res.json({
            success: true,
            message: mute ? 'Member muted' : 'Member unmuted',
            mutedUntil: member.mutedUntil
        });

    } catch (error) {
        console.error('Mute member error:', error);
        res.status(500).json({ error: 'Failed to mute member' });
    }
};

/**
 * Get team activity log
 * GET /team/activity
 */
exports.getActivityLog = async (req, res) => {
    try {
        const user = req.user;

        const team = await Team.findOne({
            $or: [
                { owner: user._id },
                { 'members.user': user._id }
            ]
        }).populate('activityLog.userId', 'name')
            .populate('activityLog.targetUserId', 'name');

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Only admins can view activity log
        const isAdmin = team.owner.toString() === user._id.toString() ||
            team.members.some(m => m.user.toString() === user._id.toString() && m.role === 'admin');

        if (!isAdmin) {
            return res.status(403).json({ error: 'Only admins can view activity log' });
        }

        const activities = team.activityLog.slice(-50).reverse(); // Last 50, newest first

        res.json({ activities });

    } catch (error) {
        console.error('Get activity log error:', error);
        res.status(500).json({ error: 'Failed to get activity log' });
    }
};

/**
 * Search messages in team
 * GET /team/messages/search?q=keyword
 */
exports.searchMessages = async (req, res) => {
    try {
        const user = req.user;
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
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

        // Search messages using text index or regex
        const messages = await Message.find({
            teamId: team._id,
            deleted: false,
            content: { $regex: q.trim(), $options: 'i' }
        })
            .populate('sender', 'name email badges')
            .populate('mentions', 'name')
            .populate({
                path: 'replyTo',
                select: 'content sender',
                populate: { path: 'sender', select: 'name' }
            })
            .sort({ createdAt: -1 })
            .limit(50);

        // Decrypt messages for display
        const decryptedMessages = messages.map(msg => {
            const msgObj = msg.toObject();
            if (isEncrypted(msgObj.content)) {
                msgObj.content = decrypt(msgObj.content);
            }
            return msgObj;
        });

        res.json({ messages: decryptedMessages, query: q });

    } catch (error) {
        console.error('Search messages error:', error);
        res.status(500).json({ error: 'Failed to search messages' });
    }
};

/**
 * Get replies to a message (thread view)
 * GET /team/messages/:id/replies
 */
exports.getReplies = async (req, res) => {
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

        // Get parent message
        const parentMessage = await Message.findById(id)
            .populate('sender', 'name email badges');

        if (!parentMessage || parentMessage.deleted) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Verify message belongs to user's team
        if (parentMessage.teamId.toString() !== team._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get replies
        const replies = await Message.find({
            replyTo: id,
            deleted: false
        })
            .populate('sender', 'name email badges')
            .populate('mentions', 'name')
            .sort({ createdAt: 1 });

        // Decrypt messages
        const decryptedParent = parentMessage.toObject();
        if (isEncrypted(decryptedParent.content)) {
            decryptedParent.content = decrypt(decryptedParent.content);
        }

        const decryptedReplies = replies.map(msg => {
            const msgObj = msg.toObject();
            if (isEncrypted(msgObj.content)) {
                msgObj.content = decrypt(msgObj.content);
            }
            return msgObj;
        });

        res.json({
            parentMessage: decryptedParent,
            replies: decryptedReplies,
            replyCount: replies.length
        });

    } catch (error) {
        console.error('Get replies error:', error);
        res.status(500).json({ error: 'Failed to get replies' });
    }
};
