const mongoose = require('mongoose');

const teamTaskSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'review', 'done'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date,
        default: null
    },
    labels: [{
        type: String,
        trim: true
    }],
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
teamTaskSchema.index({ teamId: 1, status: 1 });
teamTaskSchema.index({ teamId: 1, assignee: 1 });

module.exports = mongoose.model('TeamTask', teamTaskSchema);
