const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
    // Thread identification
    uniqueId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Agent and user references
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },

    agentUniqueId: {
        type: String,
        required: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    userWalletAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },

    // Thread metadata
    title: {
        type: String,
        required: true,
        maxlength: 200,
        default: 'New Conversation'
    },

    status: {
        type: String,
        enum: ['ACTIVE', 'ARCHIVED', 'DELETED'],
        default: 'ACTIVE',
        index: true
    },

    // Thread statistics
    messageCount: {
        type: Number,
        default: 0
    },

    lastMessageAt: {
        type: Date,
        default: Date.now
    },

    // Thread settings
    isPinned: {
        type: Boolean,
        default: false
    },

    // Metadata
    tags: {
        type: [String],
        default: []
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'threads'
});

// Compound indexes for efficient queries
threadSchema.index({ agentId: 1, userId: 1, status: 1 });
threadSchema.index({ agentUniqueId: 1, userId: 1, status: 1 });
threadSchema.index({ userWalletAddress: 1, status: 1 });
threadSchema.index({ lastMessageAt: -1 });
threadSchema.index({ createdAt: -1 });

// Update the updatedAt field on save
threadSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Thread', threadSchema);
