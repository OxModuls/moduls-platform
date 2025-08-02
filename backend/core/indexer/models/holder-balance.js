const mongoose = require('mongoose');

const holderBalanceSchema = new mongoose.Schema({
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

    // Holder address (normalized)
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

    // Balance as string (to handle BigInt values)
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

    // Last updated timestamp
    lastUpdated: {
        type: Date,
        required: true,
        default: Date.now
    },

    // Block number when this balance was last updated
    lastBlockNumber: {
        type: Number,
        required: false
    },

    // Transaction hash of the last update
    lastTransactionHash: {
        type: String,
        required: false
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    collection: 'holder_balances'
});

// Compound index for efficient queries
holderBalanceSchema.index({ tokenAddress: 1, holderAddress: 1 }, { unique: true });

// Index for sorting by balance
holderBalanceSchema.index({ tokenAddress: 1, balance: -1 });

// Index for last updated queries
holderBalanceSchema.index({ tokenAddress: 1, lastUpdated: -1 });

// Virtual for formatted balance
holderBalanceSchema.virtual('balanceFormatted').get(function () {
    return this.balance;
});

// Method to update balance
holderBalanceSchema.methods.updateBalance = function (newBalance, blockNumber, transactionHash) {
    this.balance = newBalance.toString();
    this.lastUpdated = new Date();
    if (blockNumber) this.lastBlockNumber = Number(blockNumber);
    if (transactionHash) this.lastTransactionHash = transactionHash;
    return this.save();
};

// Static method to get holders for a token with enhanced metadata
holderBalanceSchema.statics.getHoldersForToken = function (tokenAddress, limit = 100, offset = 0, sort = 'balance') {
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

// Static method to get holder count for a token
holderBalanceSchema.statics.getHolderCount = function (tokenAddress) {
    return this.countDocuments({ tokenAddress });
};

// Static method to get total balance for a token
holderBalanceSchema.statics.getTotalBalance = function (tokenAddress) {
    return this.find({ tokenAddress })
        .select('balance')
        .lean()
        .then(docs => {
            // Use BigInt for large number arithmetic
            const totalBalance = docs.reduce((sum, doc) => {
                return sum + BigInt(doc.balance);
            }, 0n);
            return totalBalance.toString();
        });
};

// Static method to get total supply for a token (sum of all balances)
holderBalanceSchema.statics.getTotalSupply = function (tokenAddress) {
    return this.find({ tokenAddress })
        .select('balance')
        .lean()
        .then(docs => {
            // Use BigInt for large number arithmetic
            const totalSupply = docs.reduce((sum, doc) => {
                return sum + BigInt(doc.balance);
            }, 0n);
            return totalSupply.toString();
        });
};

// Static method to get top holders for a token
holderBalanceSchema.statics.getTopHolders = function (tokenAddress, limit = 10) {
    return this.find({ tokenAddress })
        .sort({ balance: -1 })
        .limit(limit)
        .select('holderAddress balance lastUpdated');
};

// Pre-save middleware to normalize addresses
holderBalanceSchema.pre('save', function (next) {
    if (this.isModified('tokenAddress')) {
        this.tokenAddress = this.tokenAddress.toLowerCase();
    }
    if (this.isModified('holderAddress')) {
        this.holderAddress = this.holderAddress.toLowerCase();
    }
    next();
});

module.exports = mongoose.model('HolderBalance', holderBalanceSchema); 