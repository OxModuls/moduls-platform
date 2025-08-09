const express = require('express');
const TradingTransaction = require('../core/models/trading-transaction');
const TradingMetrics = require('../core/models/trading-metrics');
const { optionalSession } = require('../core/middlewares/session');

const router = express.Router();

/**
 * Get trading metrics for a specific token
 */
router.get('/metrics/:tokenAddress', optionalSession, async (req, res) => {
    try {
        const { tokenAddress } = req.params;

        if (!tokenAddress) {
            return res.status(400).json({
                message: 'Token address is required',
                error: 'Invalid request'
            });
        }

        const metrics = await TradingMetrics.findOne({
            tokenAddress: { $regex: new RegExp('^' + tokenAddress + '$', 'i') }
        }).lean();

        if (!metrics) {
            // Return default metrics if none exist
            return res.status(200).json({
                success: true,
                data: {
                    tokenAddress: tokenAddress.toLowerCase(),
                    currentPrice: '0',
                    volume24h: '0',
                    priceChange24h: 0,
                    priceChange24hAbs: '0',
                    high24h: '0',
                    low24h: '0',
                    volume7d: '0',
                    priceChange7d: 0,
                    priceChange7dAbs: '0',
                    high7d: '0',
                    low7d: '0',
                    totalVolume: '0',
                    totalTrades: 0,
                    totalBuys: 0,
                    totalSells: 0,
                    allTimeHigh: '0',
                    allTimeLow: '0',
                    lastTradePrice: '0',
                    lastTradeTime: null,
                    lastTradeType: null,
                    marketCap: '0',
                    lastUpdated: new Date()
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: metrics
        });

    } catch (error) {
        console.error('Error fetching trading metrics:', error);
        return res.status(500).json({
            message: 'Failed to fetch trading metrics',
            error: 'Internal server error'
        });
    }
});

/**
 * Get trading history for a specific token
 */
router.get('/history/:tokenAddress', optionalSession, async (req, res) => {
    try {
        const { tokenAddress } = req.params;
        const {
            limit = 50,
            offset = 0,
            timeframe = '24h',
            type = 'all' // 'all', 'buy', 'sell'
        } = req.query;

        if (!tokenAddress) {
            return res.status(400).json({
                message: 'Token address is required',
                error: 'Invalid request'
            });
        }

        // Calculate time filter
        const now = new Date();
        let timeFilter = {};

        switch (timeframe) {
            case '1h':
                timeFilter.blockTimestamp = { $gte: new Date(now.getTime() - 60 * 60 * 1000) };
                break;
            case '24h':
                timeFilter.blockTimestamp = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
                break;
            case '7d':
                timeFilter.blockTimestamp = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
                break;
            case '30d':
                timeFilter.blockTimestamp = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
                break;
            case 'all':
            default:
                // No time filter
                break;
        }

        // Build query
        const query = {
            tokenAddress: { $regex: new RegExp('^' + tokenAddress + '$', 'i') },
            ...timeFilter
        };

        if (type !== 'all') {
            query.type = type;
        }

        // Get transactions
        const transactions = await TradingTransaction.find(query)
            .sort({ blockTimestamp: -1 })
            .limit(Math.min(parseInt(limit), 1000)) // Cap at 1000
            .skip(parseInt(offset))
            .select('transactionHash tokenAddress userAddress type tokenAmount ethAmount price blockTimestamp')
            .lean();

        // Get total count for pagination
        const totalCount = await TradingTransaction.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total: totalCount,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: totalCount > parseInt(offset) + transactions.length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching trading history:', error);
        return res.status(500).json({
            message: 'Failed to fetch trading history',
            error: 'Internal server error'
        });
    }
});

/**
 * Get chart data for a specific token
 */
router.get('/chart/:tokenAddress', optionalSession, async (req, res) => {
    try {
        const { tokenAddress } = req.params;
        const {
            timeframe = '24h',
            interval = '1h' // '5m', '15m', '1h', '4h', '1d'
        } = req.query;

        if (!tokenAddress) {
            return res.status(400).json({
                message: 'Token address is required',
                error: 'Invalid request'
            });
        }

        // Calculate time range
        const now = new Date();
        let timeAgo;

        switch (timeframe) {
            case '1h':
                timeAgo = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '24h':
                timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                timeAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        // Calculate interval milliseconds based on actual interval parameter
        let intervalMs;
        switch (interval) {
            case '5m':
                intervalMs = 5 * 60 * 1000;
                break;
            case '10m':
                intervalMs = 10 * 60 * 1000;
                break;
            case '15m':
                intervalMs = 15 * 60 * 1000;
                break;
            case '30m':
                intervalMs = 30 * 60 * 1000;
                break;
            case '1h':
                intervalMs = 60 * 60 * 1000;
                break;
            case '4h':
                intervalMs = 4 * 60 * 60 * 1000;
                break;
            case '6h':
                intervalMs = 6 * 60 * 60 * 1000;
                break;
            case '12h':
                intervalMs = 12 * 60 * 60 * 1000;
                break;
            case '1d':
                intervalMs = 24 * 60 * 60 * 1000;
                break;
            default:
                intervalMs = 60 * 60 * 1000;
        }

        // Create dynamic grouping based on interval
        let grouping = {
            year: { $year: '$blockTimestamp' },
            month: { $month: '$blockTimestamp' },
            day: { $dayOfMonth: '$blockTimestamp' }
        };

        // Add time components based on interval
        switch (interval) {
            case '5m':
                grouping.hour = { $hour: '$blockTimestamp' };
                grouping.minute = { $multiply: [{ $floor: { $divide: [{ $minute: '$blockTimestamp' }, 5] } }, 5] };
                break;
            case '10m':
                grouping.hour = { $hour: '$blockTimestamp' };
                grouping.minute = { $multiply: [{ $floor: { $divide: [{ $minute: '$blockTimestamp' }, 10] } }, 10] };
                break;
            case '15m':
                grouping.hour = { $hour: '$blockTimestamp' };
                grouping.minute = { $multiply: [{ $floor: { $divide: [{ $minute: '$blockTimestamp' }, 15] } }, 15] };
                break;
            case '30m':
                grouping.hour = { $hour: '$blockTimestamp' };
                grouping.minute = { $multiply: [{ $floor: { $divide: [{ $minute: '$blockTimestamp' }, 30] } }, 30] };
                break;
            case '1h':
                grouping.hour = { $hour: '$blockTimestamp' };
                break;
            case '4h':
            case '6h':
            case '12h':
                const hourInterval = parseInt(interval);
                grouping.hour = { $multiply: [{ $floor: { $divide: [{ $hour: '$blockTimestamp' }, hourInterval] } }, hourInterval] };
                break;
            case '1d':
                // Only group by day (already included in base grouping)
                break;
            default:
                grouping.hour = { $hour: '$blockTimestamp' };
        }

        // Simple aggregation pipeline for chart data
        const pipeline = [
            {
                $match: {
                    tokenAddress: { $regex: new RegExp('^' + tokenAddress + '$', 'i') },
                    blockTimestamp: { $gte: timeAgo }
                }
            },
            {
                $sort: { blockTimestamp: 1 }
            },
            {
                $group: {
                    _id: grouping,
                    open: { $first: '$price' },
                    high: { $max: '$price' },
                    low: { $min: '$price' },
                    close: { $last: '$price' },
                    volume: { $sum: { $toDouble: '$ethAmount' } },
                    trades: { $sum: 1 },
                    timestamp: { $first: '$blockTimestamp' }
                }
            },
            {
                $sort: { timestamp: 1 }
            }
        ];

        const chartData = await TradingTransaction.aggregate(pipeline);



        // Format and fill missing data points
        let filledData = [];

        if (chartData.length > 0) {
            // Sort by timestamp to ensure correct order
            chartData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            filledData = chartData.map(item => ({
                timestamp: item.timestamp,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume.toString(),
                trades: item.trades
            }));

            // If we have very few data points, add some mock intervals to show progression
            if (filledData.length < 3) {
                const now = new Date();
                const startTime = timeAgo;
                const intervals = [];

                // Limit the number of intervals to prevent performance issues
                const maxIntervals = timeframe === '30d' ? 30 : 50; // Limit 30d to 30 intervals
                const adjustedIntervalMs = timeframe === '30d'
                    ? Math.max(intervalMs, (now.getTime() - startTime.getTime()) / maxIntervals)
                    : intervalMs;

                // Generate time intervals based on the timeframe
                let currentTime = new Date(startTime);
                let intervalCount = 0;
                while (currentTime <= now && intervalCount < maxIntervals) {
                    intervals.push(new Date(currentTime));
                    currentTime = new Date(currentTime.getTime() + adjustedIntervalMs);
                    intervalCount++;
                }

                // If we have some data, use the last price for filling
                const lastPrice = filledData.length > 0 ? filledData[filledData.length - 1].close : '0';

                // Fill gaps with the last known price
                const fullData = intervals.map(timestamp => {
                    const existingData = filledData.find(d =>
                        Math.abs(new Date(d.timestamp) - timestamp) < adjustedIntervalMs / 2
                    );

                    if (existingData) {
                        return existingData;
                    } else {
                        return {
                            timestamp: timestamp,
                            open: lastPrice,
                            high: lastPrice,
                            low: lastPrice,
                            close: lastPrice,
                            volume: '0',
                            trades: 0
                        };
                    }
                });

                filledData = fullData;
            }
        } else {
            // No data available, create a simple progression
            const now = new Date();
            const startTime = timeAgo;

            filledData = [
                {
                    timestamp: startTime,
                    open: '0',
                    high: '0',
                    low: '0',
                    close: '0',
                    volume: '0',
                    trades: 0
                },
                {
                    timestamp: now,
                    open: '0',
                    high: '0',
                    low: '0',
                    close: '0',
                    volume: '0',
                    trades: 0
                }
            ];
        }

        return res.status(200).json({
            success: true,
            data: {
                chartData: filledData,
                timeframe,
                interval
            }
        });

    } catch (error) {
        console.error('Error fetching chart data:', error);
        return res.status(500).json({
            message: 'Failed to fetch chart data',
            error: 'Internal server error'
        });
    }
});

/**
 * Get user trading history
 */
router.get('/user/:userAddress', optionalSession, async (req, res) => {
    try {
        const { userAddress } = req.params;
        const { limit = 50, offset = 0, tokenAddress } = req.query;

        if (!userAddress) {
            return res.status(400).json({
                message: 'User address is required',
                error: 'Invalid request'
            });
        }

        const query = {
            userAddress: userAddress.toLowerCase()
        };

        if (tokenAddress) {
            query.tokenAddress = { $regex: new RegExp('^' + tokenAddress + '$', 'i') };
        }

        const transactions = await TradingTransaction.find(query)
            .sort({ blockTimestamp: -1 })
            .limit(Math.min(parseInt(limit), 1000))
            .skip(parseInt(offset))
            .lean();

        const totalCount = await TradingTransaction.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total: totalCount,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: totalCount > parseInt(offset) + transactions.length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching user trading history:', error);
        return res.status(500).json({
            message: 'Failed to fetch user trading history',
            error: 'Internal server error'
        });
    }
});

/**
 * Get overview statistics for all tokens
 */
router.get('/overview', optionalSession, async (req, res) => {
    try {
        const { limit = 20, sortBy = 'volume24h' } = req.query;

        const sortOptions = {
            volume24h: { volume24h: -1 },
            priceChange24h: { priceChange24h: -1 },
            totalVolume: { totalVolume: -1 },
            totalTrades: { totalTrades: -1 }
        };

        const sort = sortOptions[sortBy] || sortOptions.volume24h;

        const metrics = await TradingMetrics.find({})
            .sort(sort)
            .limit(Math.min(parseInt(limit), 100))
            .select('tokenAddress currentPrice volume24h priceChange24h high24h low24h totalVolume totalTrades lastTradeTime')
            .lean();

        return res.status(200).json({
            success: true,
            data: metrics
        });

    } catch (error) {
        console.error('Error fetching trading overview:', error);
        return res.status(500).json({
            message: 'Failed to fetch trading overview',
            error: 'Internal server error'
        });
    }
});

module.exports = router;
