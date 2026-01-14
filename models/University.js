const mongoose = require('mongoose');

/**
 * University Model
 * Tracks universities for leaderboard organization
 */
const universitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    domain: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    country: {
        type: String,
        default: 'Unknown'
    },
    verified: {
        type: Boolean,
        default: false
    },
    logo: {
        type: String
    },
    stats: {
        totalUsers: {
            type: Number,
            default: 0
        },
        activeUsers: {
            type: Number,
            default: 0
        },
        totalScans: {
            type: Number,
            default: 0
        },
        totalWordsProcessed: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('University', universitySchema);
