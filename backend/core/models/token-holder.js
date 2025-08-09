const mongoose = require('mongoose');

const tokenHolderSchema = new mongoose.Schema({
    // Token identification
    tokenAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },

    // Holder identification
    holderAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },

    // Current balance (in wei as string to handle large numbers)
    balance: {
        type: String,
        required: true,
        default: '0'
    },

    // Percentage of total supply held
    percentage: {
        type: Number,
        default: 0
    },

    // First time this holder acquired tokens
    firstTransactionDate: {
        type: Date,
        required: true
    },

    // Last time this holder's balance changed
    lastTransactionDate: {
        type: Date,
        required: true
    },

    // Total number of transactions (transfers in/out)
    transactionCount: {
        type: Number,
        default: 1
    },

    // Total volume of tokens this holder has traded (cumulative)
    totalVolume: {
        type: String,
        default: '0'
    },

    // Whether this holder is currently active (has non-zero balance)
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound indexes for efficient queries
tokenHolderSchema.index({ tokenAddress: 1, holderAddress: 1 }, { unique: true });
tokenHolderSchema.index({ tokenAddress: 1, balance: -1 }); // For top holders
tokenHolderSchema.index({ tokenAddress: 1, isActive: 1, balance: -1 }); // For active holders ranking
tokenHolderSchema.index({ holderAddress: 1, isActive: 1 }); // For user's holdings

// Update the updatedAt field before saving
tokenHolderSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Static method to update holder balance
tokenHolderSchema.statics.updateHolderBalance = async function (tokenAddress, holderAddress, newBalance, totalSupply = null) {
    const TokenHolder = this;

    try {
        // Calculate percentage if total supply is provided
        let percentage = 0;
        if (totalSupply && newBalance !== '0') {
            const balanceNum = parseFloat(newBalance) / 1e18;
            const supplyNum = parseFloat(totalSupply) / 1e18;
            percentage = (balanceNum / supplyNum) * 100;
        }

        const isActive = newBalance !== '0';
        const now = new Date();

        const holder = await TokenHolder.findOneAndUpdate(
            {
                tokenAddress: tokenAddress.toLowerCase(),
                holderAddress: holderAddress.toLowerCase()
            },
            {
                $set: {
                    balance: newBalance,
                    percentage: percentage,
                    isActive: isActive,
                    lastTransactionDate: now
                },
                $inc: {
                    transactionCount: 1
                },
                $setOnInsert: {
                    firstTransactionDate: now,
                    createdAt: now
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        return holder;
    } catch (error) {
        console.error('Error updating holder balance:', error);
        throw error;
    }
};

// Static method to get top holders for a token
tokenHolderSchema.statics.getTopHolders = async function (tokenAddress, limit = 100) {
    const TokenHolder = this;

    try {
        const holders = await TokenHolder.find({
            tokenAddress: tokenAddress.toLowerCase(),
            isActive: true
        })
            .sort({ balance: -1 })
            .limit(limit)
            .lean();

        return holders;
    } catch (error) {
        console.error('Error fetching top holders:', error);
        throw error;
    }
};

// Static method to get holder statistics for a token
tokenHolderSchema.statics.getHolderStats = async function (tokenAddress) {
    const TokenHolder = this;

    try {
        const stats = await TokenHolder.aggregate([
            {
                $match: {
                    tokenAddress: tokenAddress.toLowerCase(),
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalHolders: { $sum: 1 },
                    avgBalance: { $avg: { $toDouble: '$balance' } },
                    avgPercentage: { $avg: '$percentage' }
                }
            }
        ]);

        return stats[0] || {
            totalHolders: 0,
            avgBalance: 0,
            avgPercentage: 0
        };
    } catch (error) {
        console.error('Error fetching holder stats:', error);
        throw error;
    }
};

module.exports = mongoose.model('TokenHolder', tokenHolderSchema);