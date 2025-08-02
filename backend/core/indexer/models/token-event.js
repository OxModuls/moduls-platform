const mongoose = require('mongoose');

const tokenEventSchema = new mongoose.Schema({
    // Token address (normalized)
    tokenAddress: {
        type: String,
        required: true,
        index: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'Token address must be a valid Ethereum address'
        }
    },

    // Event type (for future extensibility)
    eventType: {
        type: String,
        required: true,
        default: 'Transfer',
        enum: ['Transfer', 'Mint', 'Burn', 'Approval']
    },

    // From address (normalized)
    from: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'From address must be a valid Ethereum address'
        }
    },

    // To address (normalized)
    to: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'To address must be a valid Ethereum address'
        }
    },

    // Transfer amount as string (to handle BigInt values)
    value: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d+$/.test(v);
            },
            message: 'Value must be a non-negative integer string'
        }
    },

    // Block number
    blockNumber: {
        type: Number,
        required: true,
        index: true
    },

    // Transaction hash
    transactionHash: {
        type: String,
        required: true,
        index: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{64}$/.test(v);
            },
            message: 'Transaction hash must be a valid hex string'
        }
    },

    // Log index within the transaction
    logIndex: {
        type: Number,
        required: true
    },

    // Timestamp when the event was processed
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    },

    // Block timestamp (if available)
    blockTimestamp: {
        type: Date,
        required: false
    },

    // Gas used for the transaction
    gasUsed: {
        type: Number,
        required: false
    },

    // Gas price for the transaction
    gasPrice: {
        type: String,
        required: false
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    collection: 'token_events'
});

// Compound indexes for efficient queries
tokenEventSchema.index({ tokenAddress: 1, blockNumber: -1 });
tokenEventSchema.index({ tokenAddress: 1, timestamp: -1 });
tokenEventSchema.index({ transactionHash: 1, logIndex: 1 }, { unique: true });

// Index for from/to address queries
tokenEventSchema.index({ from: 1, tokenAddress: 1 });
tokenEventSchema.index({ to: 1, tokenAddress: 1 });

// Virtual for formatted value
tokenEventSchema.virtual('valueFormatted').get(function () {
    return this.value;
});

// Static method to get events for a token
tokenEventSchema.statics.getEventsForToken = function (tokenAddress, limit = 100, offset = 0) {
    return this.find({ tokenAddress })
        .sort({ blockNumber: -1, logIndex: -1 })
        .limit(limit)
        .skip(offset)
        .select('from to value blockNumber transactionHash timestamp');
};

// Static method to get events for a specific address
tokenEventSchema.statics.getEventsForAddress = function (address, tokenAddress = null, limit = 100, offset = 0) {
    const query = {
        $or: [
            { from: address.toLowerCase() },
            { to: address.toLowerCase() }
        ]
    };

    if (tokenAddress) {
        query.tokenAddress = tokenAddress.toLowerCase();
    }

    return this.find(query)
        .sort({ blockNumber: -1, logIndex: -1 })
        .limit(limit)
        .skip(offset)
        .select('tokenAddress from to value blockNumber transactionHash timestamp');
};

// Static method to get latest event for a token
tokenEventSchema.statics.getLatestEvent = function (tokenAddress) {
    return this.findOne({ tokenAddress })
        .sort({ blockNumber: -1, logIndex: -1 })
        .select('blockNumber timestamp');
};

// Static method to get event count for a token
tokenEventSchema.statics.getEventCount = function (tokenAddress) {
    return this.countDocuments({ tokenAddress });
};

// Static method to get events in a block range
tokenEventSchema.statics.getEventsInBlockRange = function (tokenAddress, fromBlock, toBlock) {
    return this.find({
        tokenAddress,
        blockNumber: { $gte: fromBlock, $lte: toBlock }
    })
        .sort({ blockNumber: 1, logIndex: 1 })
        .select('from to value blockNumber transactionHash logIndex');
};

// Static method to check if event already exists
tokenEventSchema.statics.eventExists = function (transactionHash, logIndex) {
    return this.exists({ transactionHash, logIndex });
};

// Pre-save middleware to normalize addresses
tokenEventSchema.pre('save', function (next) {
    if (this.isModified('tokenAddress')) {
        this.tokenAddress = this.tokenAddress.toLowerCase();
    }
    if (this.isModified('from')) {
        this.from = this.from.toLowerCase();
    }
    if (this.isModified('to')) {
        this.to = this.to.toLowerCase();
    }
    if (this.isModified('transactionHash')) {
        this.transactionHash = this.transactionHash.toLowerCase();
    }
    next();
});

module.exports = mongoose.model('TokenEvent', tokenEventSchema); 