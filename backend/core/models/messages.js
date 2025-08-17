const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    // Message identification
    uniqueId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Thread and conversation references
    threadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Thread',
        required: true,
        index: true
    },

    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Message hierarchy (for threaded conversations)
    parentMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
        index: true
    },

    // Message content
    content: {
        type: String,
        required: true,
        maxlength: 10000
    },

    // Message type and role
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true,
        index: true
    },

    // Message metadata
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'command'],
        default: 'text'
    },

    // Processing status
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
        index: true
    },

    // AI/System specific fields
    model: {
        type: String,
        default: null
    },

    tokens: {
        type: Number,
        default: null
    },

    // Response metadata
    responseTime: {
        type: Number, // in milliseconds
        default: null
    },

    // Error handling
    error: {
        type: String,
        default: null
    },

    // Metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
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
    collection: 'messages'
});

// Compound indexes for efficient queries
messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ agentId: 1, createdAt: -1 });
messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ parentMessageId: 1, createdAt: 1 });
messageSchema.index({ role: 1, createdAt: -1 });
messageSchema.index({ status: 1, createdAt: -1 });

// Update the updatedAt field on save
messageSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('Message', messageSchema);
