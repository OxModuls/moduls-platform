const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    walletAddress: {
        type: String,
        required: true,
        index: true
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    expiresAt: {
        type: Date,
        required: true,

    },

    lastAccessed: {
        type: Date,
        default: Date.now,
    },

    userAgent: {
        type: String,
        default: null,
    },

    ipAddress: {
        type: String,
        default: null,
    },

}, {
    timestamps: true
});

// Index for cleanup of expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
