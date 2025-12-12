const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    originalText: {
        type: String,
        required: true,
    },
    highlights: [
        {
            text: String,
            type: {
                type: String,
                enum: ['plagiarized', 'paraphrased', 'safe'],
            },
            source: String,
            score: Number,
        },
    ],
    overallScore: {
        type: Number,
        required: true,
    },
    rewrittenText: {
        type: String,
        default: null,
    },
    // Team sharing fields
    title: {
        type: String,
        default: null,
    },
    sharedWithTeam: {
        type: Boolean,
        default: false,
    },
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null,
    },
    // Comments from team members
    comments: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            required: true,
            maxlength: 1000
        },
        type: {
            type: String,
            enum: ['comment', 'suggestion', 'feedback'],
            default: 'comment'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for team shared history
historySchema.index({ teamId: 1, sharedWithTeam: 1, createdAt: -1 });

module.exports = mongoose.model('History', historySchema);

