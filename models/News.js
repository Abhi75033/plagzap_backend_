const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Product Update', 'Feature Release', 'Announcement', 'Maintenance', 'General']
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    published: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        default: null // null means never expires
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for faster queries
newsSchema.index({ published: 1, createdAt: -1 });
newsSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('News', newsSchema);
