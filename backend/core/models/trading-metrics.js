const mongoose = require('mongoose');

const tradingMetricsSchema = new mongoose.Schema({
    // Token identifier
    tokenAddress: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    // Current trading stats
    currentPrice: {
        type: String, // Store as string to handle large numbers
        default: '0',
    },

    // 24h metrics
    volume24h: {
        type: String, // Total ETH volume in last 24h
        default: '0',
    },
    priceChange24h: {
        type: Number, // Percentage change
        default: 0,
    },
    priceChange24hAbs: {
        type: String, // Absolute price change in wei
        default: '0',
    },
    high24h: {
        type: String,
        default: '0',
    },
    low24h: {
        type: String,
        default: '0',
    },

    // 7d metrics
    volume7d: {
        type: String,
        default: '0',
    },
    priceChange7d: {
        type: Number,
        default: 0,
    },
    priceChange7dAbs: {
        type: String,
        default: '0',
    },
    high7d: {
        type: String,
        default: '0',
    },
    low7d: {
        type: String,
        default: '0',
    },

    // All-time metrics
    totalVolume: {
        type: String,
        default: '0',
    },
    totalTrades: {
        type: Number,
        default: 0,
    },
    totalBuys: {
        type: Number,
        default: 0,
    },
    totalSells: {
        type: Number,
        default: 0,
    },
    allTimeHigh: {
        type: String,
        default: '0',
    },
    allTimeLow: {
        type: String,
        default: '0',
    },

    // Recent activity
    lastTradePrice: {
        type: String,
        default: '0',
    },
    lastTradeTime: {
        type: Date,
    },
    lastTradeType: {
        type: String,
        enum: ['buy', 'sell'],
    },

    // Market cap (calculated field)
    marketCap: {
        type: String,
        default: '0',
    },

    // Timestamps
    lastUpdated: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: true,
    collection: 'trading_metrics'
});

// Add indexes for efficient queries
tradingMetricsSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('TradingMetrics', tradingMetricsSchema);
