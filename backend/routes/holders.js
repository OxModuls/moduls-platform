const express = require('express');
const TokenHolder = require('../core/models/token-holder');
const { optionalSession } = require('../core/middlewares/session');

const router = express.Router();

/**
 * Get top holders for a specific token
 */
router.get('/holders/:tokenAddress', optionalSession, async (req, res) => {
    try {
        const { tokenAddress } = req.params;
        const {
            limit = 100,
            offset = 0
        } = req.query;

        if (!tokenAddress) {
            return res.status(400).json({
                message: 'Token address is required',
                error: 'Invalid request'
            });
        }

        // Get top holders
        const holders = await TokenHolder.find({
            tokenAddress: { $regex: new RegExp('^' + tokenAddress + '$', 'i') },
            isActive: true
        })
        .sort({ balance: -1 })
        .limit(Math.min(parseInt(limit), 1000)) // Cap at 1000
        .skip(parseInt(offset))
        .select('holderAddress balance percentage firstTransactionDate lastTransactionDate transactionCount')
        .lean();

        // Get total count for pagination
        const totalCount = await TokenHolder.countDocuments({
            tokenAddress: { $regex: new RegExp('^' + tokenAddress + '$', 'i') },
            isActive: true
        });

        // Format holders data
        const formattedHolders = holders.map((holder, index) => ({
            rank: parseInt(offset) + index + 1,
            address: holder.holderAddress,
            balance: holder.balance,
            percentage: holder.percentage,
            firstTransactionDate: holder.firstTransactionDate,
            lastTransactionDate: holder.lastTransactionDate,
            transactionCount: holder.transactionCount
        }));

        return res.status(200).json({
            success: true,
            data: {
                holders: formattedHolders,
                pagination: {
                    total: totalCount,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + formattedHolders.length < totalCount
                }
            }
        });

    } catch (error) {
        console.error('Error fetching holders:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: 'Internal server error'
        });
    }
});

/**
 * Get holder statistics for a specific token
 */
router.get('/holders/:tokenAddress/stats', optionalSession, async (req, res) => {
    try {
        const { tokenAddress } = req.params;

        if (!tokenAddress) {
            return res.status(400).json({
                message: 'Token address is required',
                error: 'Invalid request'
            });
        }

        // Get holder statistics
        const stats = await TokenHolder.getHolderStats(tokenAddress);

        // Get distribution breakdown
        const distribution = await TokenHolder.aggregate([
            {
                $match: {
                    tokenAddress: tokenAddress.toLowerCase(),
                    isActive: true
                }
            },
            {
                $addFields: {
                    category: {
                        $switch: {
                            branches: [
                                { case: { $gte: ['$percentage', 10] }, then: 'whale' },
                                { case: { $gte: ['$percentage', 1] }, then: 'large' },
                                { case: { $gte: ['$percentage', 0.1] }, then: 'medium' },
                                { case: { $gte: ['$percentage', 0.01] }, then: 'small' }
                            ],
                            default: 'micro'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalPercentage: { $sum: '$percentage' }
                }
            }
        ]);

        // Format distribution
        const distributionMap = {};
        distribution.forEach(item => {
            distributionMap[item._id] = {
                count: item.count,
                percentage: item.totalPercentage
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                totalHolders: stats.totalHolders,
                avgBalance: stats.avgBalance,
                avgPercentage: stats.avgPercentage,
                distribution: {
                    whale: distributionMap.whale || { count: 0, percentage: 0 },
                    large: distributionMap.large || { count: 0, percentage: 0 },
                    medium: distributionMap.medium || { count: 0, percentage: 0 },
                    small: distributionMap.small || { count: 0, percentage: 0 },
                    micro: distributionMap.micro || { count: 0, percentage: 0 }
                }
            }
        });

    } catch (error) {
        console.error('Error fetching holder stats:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: 'Internal server error'
        });
    }
});

/**
 * Get holder details for a specific address across all tokens
 */
router.get('/user/:userAddress/holdings', optionalSession, async (req, res) => {
    try {
        const { userAddress } = req.params;
        const {
            limit = 50,
            offset = 0
        } = req.query;

        if (!userAddress) {
            return res.status(400).json({
                message: 'User address is required',
                error: 'Invalid request'
            });
        }

        // Get user holdings across all tokens
        const holdings = await TokenHolder.find({
            holderAddress: { $regex: new RegExp('^' + userAddress + '$', 'i') },
            isActive: true
        })
        .sort({ balance: -1 })
        .limit(Math.min(parseInt(limit), 1000))
        .skip(parseInt(offset))
        .select('tokenAddress balance percentage firstTransactionDate lastTransactionDate transactionCount')
        .lean();

        // Get total count
        const totalCount = await TokenHolder.countDocuments({
            holderAddress: { $regex: new RegExp('^' + userAddress + '$', 'i') },
            isActive: true
        });

        // Format holdings data
        const formattedHoldings = holdings.map(holding => ({
            tokenAddress: holding.tokenAddress,
            balance: holding.balance,
            percentage: holding.percentage,
            firstTransactionDate: holding.firstTransactionDate,
            lastTransactionDate: holding.lastTransactionDate,
            transactionCount: holding.transactionCount
        }));

        return res.status(200).json({
            success: true,
            data: {
                holdings: formattedHoldings,
                pagination: {
                    total: totalCount,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + formattedHoldings.length < totalCount
                }
            }
        });

    } catch (error) {
        console.error('Error fetching user holdings:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: 'Internal server error'
        });
    }
});

/**
 * Get overall holder statistics across the platform
 */
router.get('/holders/overview', optionalSession, async (req, res) => {
    try {
        // Get overall platform statistics
        const overallStats = await TokenHolder.aggregate([
            {
                $match: {
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalHolders: { $sum: 1 },
                    uniqueTokens: { $addToSet: '$tokenAddress' },
                    avgBalance: { $avg: { $toDouble: '$balance' } }
                }
            },
            {
                $project: {
                    totalHolders: 1,
                    uniqueTokens: { $size: '$uniqueTokens' },
                    avgBalance: 1
                }
            }
        ]);

        // Get top tokens by holder count
        const topTokensByHolders = await TokenHolder.aggregate([
            {
                $match: {
                    isActive: true
                }
            },
            {
                $group: {
                    _id: '$tokenAddress',
                    holderCount: { $sum: 1 },
                    totalVolume: { $sum: { $toDouble: '$balance' } }
                }
            },
            {
                $sort: { holderCount: -1 }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    tokenAddress: '$_id',
                    holderCount: 1,
                    totalVolume: 1,
                    _id: 0
                }
            }
        ]);

        const stats = overallStats[0] || {
            totalHolders: 0,
            uniqueTokens: 0,
            avgBalance: 0
        };

        return res.status(200).json({
            success: true,
            data: {
                totalHolders: stats.totalHolders,
                uniqueTokens: stats.uniqueTokens,
                avgBalance: stats.avgBalance,
                topTokensByHolders: topTokensByHolders
            }
        });

    } catch (error) {
        console.error('Error fetching holder overview:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: 'Internal server error'
        });
    }
});

module.exports = router;
