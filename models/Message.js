const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    type: {
        type: String,
        enum: ['message', 'status', 'announcement'],
        default: 'message'
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reactions: [{
        emoji: {
            type: String,
            required: true
        },
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    }],
    pinned: {
        type: Boolean,
        default: false
    },
    deleted: {
        type: Boolean,
        default: false
    },
    // Read receipts - WhatsApp style
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    deliveredTo: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        deliveredAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Reply thread support
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    // File attachments
    attachments: [{
        url: String,
        filename: String,
        type: String, // 'image', 'document', 'video', etc.
        size: Number
    }]
}, {
    timestamps: true
});

// Index for efficient message queries
messageSchema.index({ teamId: 1, createdAt: -1 });
messageSchema.index({ teamId: 1, pinned: -1, createdAt: -1 });
// Text index for search
messageSchema.index({ content: 'text' });
// Index for replies
messageSchema.index({ replyTo: 1 });

// Extract tags from content (words starting with #)
messageSchema.statics.extractTags = function (content) {
    const tagRegex = /#(\w+)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
        tags.push(match[1].toLowerCase());
    }
    return [...new Set(tags)]; // Remove duplicates
};

// Extract mention usernames from content (words starting with @)
messageSchema.statics.extractMentionUsernames = function (content) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1]);
    }
    return [...new Set(mentions)]; // Remove duplicates
};

module.exports = mongoose.model('Message', messageSchema);
