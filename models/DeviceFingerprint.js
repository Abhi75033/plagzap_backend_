const mongoose = require('mongoose');

/**
 * DeviceFingerprint Model
 * Tracks unique devices used by users for security and fraud prevention
 */
const deviceFingerprintSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fingerprint: {
        type: String,
        required: true,
        index: true
    },
    deviceInfo: {
        userAgent: String,
        platform: String,
        language: String,
        screenResolution: String,
        timezone: String,
        canvas: String // Canvas fingerprint hash
    },
    ipAddresses: [{
        ip: String,
        firstSeen: {
            type: Date,
            default: Date.now
        },
        lastSeen: {
            type: Date,
            default: Date.now
        },
        location: {
            country: String,
            city: String,
            timezone: String
        }
    }],
    trustScore: {
        type: Number,
        default: 50, // 0-100 scale
        min: 0,
        max: 100
    },
    firstSeen: {
        type: Date,
        default: Date.now
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    isSuspicious: {
        type: Boolean,
        default: false
    },
    suspicionReasons: [String],
    metadata: {
        totalLogins: {
            type: Number,
            default: 0
        },
        lastLoginDate: Date
    }
}, {
    timestamps: true
});

// Compound index for fast lookups
deviceFingerprintSchema.index({ userId: 1, fingerprint: 1 }, { unique: true });

// Index for finding suspicious devices
deviceFingerprintSchema.index({ isSuspicious: 1, trustScore: 1 });

module.exports = mongoose.model('DeviceFingerprint', deviceFingerprintSchema);
