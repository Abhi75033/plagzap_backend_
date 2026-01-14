const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'Team Meeting'
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    settings: {
        maxParticipants: {
            type: Number,
            default: 50
        },
        requireAuth: {
            type: Boolean,
            default: true
        },
        allowScreenShare: {
            type: Boolean,
            default: true
        },
        allowChat: {
            type: Boolean,
            default: true
        }
    },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'ended'],
        default: 'scheduled'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        index: true
    }
}, {
    timestamps: true
});

// Generate random meeting code
meetingSchema.statics.generateCode = function () {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part1}-${part2}-${part3}`;
};

// Clean up expired meetings
meetingSchema.statics.cleanupExpired = async function () {
    const result = await this.deleteMany({
        expiresAt: { $lt: new Date() },
        status: { $ne: 'active' }
    });
    return result.deletedCount;
};

// Instance method to add participant
meetingSchema.methods.addParticipant = function (userId) {
    if (!this.participants.includes(userId)) {
        this.participants.push(userId);
    }
    return this.save();
};

// Instance method to remove participant
meetingSchema.methods.removeParticipant = function (userId) {
    this.participants = this.participants.filter(
        p => p.toString() !== userId.toString()
    );
    return this.save();
};

module.exports = mongoose.model('Meeting', meetingSchema);
