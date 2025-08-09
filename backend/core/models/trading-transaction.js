const mongoose = require('mongoose');

const tradingTransactionSchema = new mongoose.Schema({
    // Transaction identifiers
    transactionHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    // Token and user info
    tokenAddress: {
        type: String,
        required: true,
        index: true,
    },
    userAddress: {
        type: String,
        required: true,
        index: true,
    },

    // Transaction type and details
    type: {
        type: String,
        enum: ['buy', 'sell'],
        required: true,
        index: true,
    },

    // Token amounts
    tokenAmount: {
        type: String, // Store as string to handle large numbers
        required: true,
    },

    // ETH amounts
    ethAmount: {
        type: String, // Store as string to handle large numbers
        required: true,
    },

    // Price per token at time of transaction (in wei)
    price: {
        type: String, // Store as string to handle large numbers
        required: true,
    },

    // Blockchain data
    blockNumber: {
        type: Number,
        required: true,
        index: true,
    },
    logIndex: {
        type: Number,
        required: true,
    },

    // Timestamps
    blockTimestamp: {
        type: Date,
        required: true,
        index: true,
    },

    // Processing metadata
    processedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    collection: 'trading_transactions'
});

// Compound indexes for efficient queries
tradingTransactionSchema.index({ tokenAddress: 1, blockTimestamp: -1 });
tradingTransactionSchema.index({ tokenAddress: 1, type: 1, blockTimestamp: -1 });
tradingTransactionSchema.index({ userAddress: 1, blockTimestamp: -1 });
tradingTransactionSchema.index({ blockTimestamp: -1 }); // For time-based queries

module.exports = mongoose.model('TradingTransaction', tradingTransactionSchema);
