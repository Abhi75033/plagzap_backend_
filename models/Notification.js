const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['system', 'custom', 'achievement', 'subscription', 'alert'],
        default: 'system'
    },
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    icon: {
        type: String,
        default: 'bell' // lucide-react icon name
    },
    link: {
        type: String, // Optional link to navigate when clicked
        default: null
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Admin who created it
    }
}, {
    timestamps: true
});

// Index for faster queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
