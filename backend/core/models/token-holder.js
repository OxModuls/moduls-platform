const mongoose = require('mongoose');

const tokenHolderSchema = new mongoose.Schema({
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
    holderAddress: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'Holder address must be a valid Ethereum address'
        }
    },
    balance: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d+$/.test(v);
            },
            message: 'Balance must be a non-negative integer string'
        }
    },
    lastUpdated: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'token_holders'
});

// Compound index for efficient queries
tokenHolderSchema.index({ tokenAddress: 1, holderAddress: 1 }, { unique: true });
tokenHolderSchema.index({ tokenAddress: 1, balance: -1 });
tokenHolderSchema.index({ tokenAddress: 1, lastUpdated: -1 });

// Pre-save middleware to normalize addresses
tokenHolderSchema.pre('save', function (next) {
    if (this.isModified('tokenAddress')) {
        this.tokenAddress = this.tokenAddress.toLowerCase();
    }
    if (this.isModified('holderAddress')) {
        this.holderAddress = this.holderAddress.toLowerCase();
    }
    next();
});

// Static methods
tokenHolderSchema.statics.getHoldersForToken = function (tokenAddress, limit = 50, offset = 0, sort = 'balance') {
    const sortOptions = {
        'balance': { balance: -1 },
        'recent': { lastUpdated: -1 },
        'address': { holderAddress: 1 }
    };

    return this.find({ tokenAddress })
        .sort(sortOptions[sort] || sortOptions['balance'])
        .limit(limit)
        .skip(offset)
        .select('holderAddress balance lastUpdated createdAt');
};

tokenHolderSchema.statics.getHolderCount = function (tokenAddress) {
    return this.countDocuments({ tokenAddress });
};

tokenHolderSchema.statics.getTotalSupply = function (tokenAddress) {
    return this.aggregate([
        { $match: { tokenAddress } },
        { $group: { _id: null, totalSupply: { $sum: { $toLong: '$balance' } } } }
    ]).then(result => {
        return result.length > 0 ? result[0].totalSupply.toString() : '0';
    });
};

module.exports = mongoose.model('TokenHolder', tokenHolderSchema); 