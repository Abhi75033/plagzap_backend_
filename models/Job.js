const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        enum: ['Remote', 'Hybrid', 'On-site']
    },
    jobType: {
        type: String,
        required: true,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship']
    },
    description: {
        type: String,
        required: true
    },
    requirements: [{
        type: String
    }],
    responsibilities: [{
        type: String
    }],
    salaryRange: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for faster queries
jobSchema.index({ isActive: 1, createdAt: -1 });
jobSchema.index({ department: 1 });
jobSchema.index({ location: 1 });

module.exports = mongoose.model('Job', jobSchema);
