const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['member', 'moderator', 'editor', 'admin', 'viewer'],
            default: 'member'
        },
        muted: {
            type: Boolean,
            default: false
        },
        mutedUntil: {
            type: Date,
            default: null
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    inviteCode: {
        type: String,
        unique: true,
        required: true
    },
    // Admin settings
    adminOnlyMessages: {
        type: Boolean,
        default: false
    },
    // Activity log
    activityLog: [{
        action: {
            type: String,
            enum: ['member_joined', 'member_left', 'member_removed', 'role_changed', 'message_sent', 'message_pinned', 'settings_changed', 'chat_cleared']
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        targetUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        details: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Keep activity log limited to last 100 entries
teamSchema.methods.addActivityLog = async function (action, userId, targetUserId = null, details = null) {
    this.activityLog.push({ action, userId, targetUserId, details });
    if (this.activityLog.length > 100) {
        this.activityLog = this.activityLog.slice(-100);
    }
    await this.save();
};

module.exports = mongoose.model('Team', teamSchema);
