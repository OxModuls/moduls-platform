const mongoose = require('mongoose');

const webhookSubscriptionSchema = new mongoose.Schema({
    webhookId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    network: {
        type: String,
        required: true,
        enum: ['sei-mainnet', 'sei-testnet']
    },
    eventType: {
        type: String,
        required: true,
        enum: ['ModulsTokenCreated', 'Transfer']
    },
    contractAddress: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'inactive', 'pending', 'error'],
        default: 'pending'
    },
    lastVerified: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient querying
webhookSubscriptionSchema.index({ webhookId: 1 }, { unique: true });
webhookSubscriptionSchema.index({ contractAddress: 1, eventType: 1 });
webhookSubscriptionSchema.index({ network: 1, status: 1 });

// Update the updatedAt field on save
webhookSubscriptionSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Static methods
webhookSubscriptionSchema.statics.findByContractAndEvent = function (contractAddress, eventType) {
    return this.findOne({ contractAddress, eventType });
};

webhookSubscriptionSchema.statics.findActiveByNetwork = function (network) {
    return this.find({ network, status: 'active' });
};

webhookSubscriptionSchema.statics.findByWebhookId = function (webhookId) {
    return this.findOne({ webhookId });
};

module.exports = mongoose.model('WebhookSubscription', webhookSubscriptionSchema); 