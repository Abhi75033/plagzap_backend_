const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        default: 'PlagZap User',
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'onhold', 'rejected'],
        default: 'pending'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Optional - for logged in users
    },
    adminNote: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);
