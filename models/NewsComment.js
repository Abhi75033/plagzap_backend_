const mongoose = require('mongoose');

const newsCommentSchema = new mongoose.Schema({
    newsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'News',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true,
        maxlength: 1000
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likeCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Update like count before saving
newsCommentSchema.pre('save', function (next) {
    this.likeCount = this.likes.length;
    next();
});

// Index for faster queries
newsCommentSchema.index({ newsId: 1, createdAt: -1 });

module.exports = mongoose.model('NewsComment', newsCommentSchema);
