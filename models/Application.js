const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    applicantName: {
        type: String,
        required: true,
        trim: true
    },
    applicantEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    resumeUrl: {
        type: String,
        required: true
    },
    coverLetter: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['applied', 'reviewed', 'interviewed', 'approved', 'rejected'],
        default: 'applied'
    },
    interviewDate: {
        type: Date
    },
    interviewLink: {
        type: String
    },
    notes: {
        type: String,
        default: ''
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        notes: String
    }]
}, {
    timestamps: true
});

// Prevent duplicate applications
applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

// Indexes for filtering
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });

// Method to add status change to history
applicationSchema.methods.updateStatus = function (newStatus, changedBy, notes = '') {
    this.statusHistory.push({
        status: newStatus,
        changedBy,
        changedAt: new Date(),
        notes
    });
    this.status = newStatus;
};

module.exports = mongoose.model('Application', applicationSchema);
