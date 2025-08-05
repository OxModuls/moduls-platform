const mongoose = require('mongoose');

const tokenEventSchema = new mongoose.Schema({
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
    eventType: {
        type: String,
        required: true,
        default: 'Transfer',
        enum: ['Transfer', 'Mint', 'Burn', 'Approval']
    },
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
    blockNumber: {
        type: Number,
        required: true,
        index: true
    },
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
    logIndex: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'token_events'
});

// Compound indexes for efficient queries
tokenEventSchema.index({ tokenAddress: 1, blockNumber: -1 });
tokenEventSchema.index({ tokenAddress: 1, timestamp: -1 });
tokenEventSchema.index({ transactionHash: 1, logIndex: 1 }, { unique: true });
tokenEventSchema.index({ from: 1, tokenAddress: 1 });
tokenEventSchema.index({ to: 1, tokenAddress: 1 });

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

// Static methods
tokenEventSchema.statics.getEventsForToken = function (tokenAddress, limit = 100, offset = 0) {
    return this.find({ tokenAddress })
        .sort({ blockNumber: -1, logIndex: -1 })
        .limit(limit)
        .skip(offset)
        .select('from to value blockNumber transactionHash timestamp');
};

tokenEventSchema.statics.getLatestEvent = function (tokenAddress) {
    return this.findOne({ tokenAddress })
        .sort({ blockNumber: -1, logIndex: -1 })
        .select('blockNumber timestamp');
};

tokenEventSchema.statics.getEventCount = function (tokenAddress) {
    return this.countDocuments({ tokenAddress });
};

module.exports = mongoose.model('TokenEvent', tokenEventSchema); 