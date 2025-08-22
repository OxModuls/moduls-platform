const { z } = require('zod');
const TradingMetrics = require('../../models/trading-metrics');
const TradingTransaction = require('../../models/trading-transaction');
const TokenHolder = require('../../models/token-holder');

/**
 * MEME Modul Type Tools
 * Implements token analysis tools for meme tokens using MCP standards
 */

// Tool 1: Get Token Metrics
const getTokenMetrics = {
    name: 'getTokenMetrics',
    title: 'Token Metrics Analysis',
    description: 'Get comprehensive token metrics including price, volume, market cap, and trading data',
    inputSchema: z.object({
        tokenAddress: z.string().describe('Token contract address'),
        timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h').describe('Time range for metrics')
    }),
    async handler({ tokenAddress, timeRange }) {
        try {
            console.log(`🔍 MCP Tool: getTokenMetrics called for ${tokenAddress}, range: ${timeRange}`);

            // Get trading metrics from database
            const metrics = await TradingMetrics.findOne({ tokenAddress }).sort({ timestamp: -1 });
            const transactions = await TradingTransaction.find({ tokenAddress })
                .sort({ blockTimestamp: -1 })
                .limit(100);

            // Get holder count
            const holderCount = await TokenHolder.countDocuments({
                tokenAddress,
                isActive: true,
                balance: { $gt: '0' }
            });

            // Calculate time-based metrics
            const now = new Date();
            let volume = 0, priceChange = 0, high = 0, low = 0;

            switch (timeRange) {
                case '1h':
                    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                    const hourlyTransactions = await TradingTransaction.find({
                        tokenAddress,
                        blockTimestamp: { $gte: oneHourAgo }
                    });
                    volume = hourlyTransactions.reduce((sum, t) => {
                        const amount = parseFloat(t.ethAmount) || 0;
                        return sum + (isNaN(amount) ? 0 : amount);
                    }, 0);
                    break;

                case '24h':
                    volume = parseFloat(metrics?.volume24h || '0');
                    priceChange = metrics?.priceChange24h || 0;
                    high = parseFloat(metrics?.high24h || '0');
                    low = parseFloat(metrics?.low24h || '0');
                    break;

                case '7d':
                    volume = parseFloat(metrics?.volume7d || '0');
                    priceChange = metrics?.priceChange7d || 0;
                    high = parseFloat(metrics?.high7d || '0');
                    low = parseFloat(metrics?.low7d || '0');
                    break;

                case '30d':
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    const monthlyTransactions = await TradingTransaction.find({
                        tokenAddress,
                        blockTimestamp: { $gte: thirtyDaysAgo }
                    });
                    volume = monthlyTransactions.reduce((sum, t) => {
                        const amount = parseFloat(t.ethAmount) || 0;
                        return sum + (isNaN(amount) ? 0 : amount);
                    }, 0);
                    break;
            }

            // Format price properly (convert from wei to ETH)
            const currentPrice = metrics?.currentPrice && !isNaN(parseFloat(metrics.currentPrice)) ?
                (parseFloat(metrics.currentPrice) / 1e18).toFixed(8) : '0';

            // Calculate market cap
            const totalSupply = await getTokenTotalSupply(tokenAddress);
            const marketCap = totalSupply && currentPrice !== '0' && !isNaN(parseFloat(currentPrice)) ?
                (parseFloat(totalSupply) * parseFloat(currentPrice)).toFixed(2) : '0';

            const result = {
                tokenAddress: tokenAddress.toLowerCase(),
                currentPrice: metrics?.currentPrice || '0',
                volume24h: metrics?.volume24h || '0',
                priceChange24h: metrics?.priceChange24h || 0,
                priceChange24hAbs: metrics?.priceChange24hAbs || '0',
                high24h: metrics?.high24h || '0',
                low24h: metrics?.low24h || '0',
                volume7d: metrics?.volume7d || '0',
                priceChange7d: metrics?.priceChange7d || 0,
                priceChange7dAbs: metrics?.priceChange7dAbs || '0',
                high7d: metrics?.high7d || '0',
                low7d: metrics?.low7d || '0',
                totalVolume: metrics?.totalVolume || '0',
                totalTrades: metrics?.totalTrades || 0,
                totalBuys: metrics?.totalBuys || 0,
                totalSells: metrics?.totalSells || 0,
                allTimeHigh: metrics?.allTimeHigh || '0',
                allTimeLow: metrics?.allTimeLow || '0',
                lastTradePrice: metrics?.lastTradePrice || '0',
                lastTradeTime: metrics?.lastTradeTime || null,
                lastTradeType: metrics?.lastTradeType || null,
                marketCap: metrics?.marketCap || '0',
                lastUpdated: metrics?.lastUpdated || new Date()
            };

            console.log(`✅ MCP Tool: getTokenMetrics result:`, result);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };

        } catch (error) {
            console.error('❌ MCP Tool: getTokenMetrics error:', error);
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }]
            };
        }
    }
};

// Tool 2: Detect Hype
const detectHype = {
    name: 'detectHype',
    title: 'Hype Detection Analysis',
    description: 'Analyze token hype potential based on social sentiment, volume spikes, and holder growth',
    inputSchema: z.object({
        tokenAddress: z.string().describe('Token contract address'),
        analysisDepth: z.enum(['basic', 'detailed']).default('basic').describe('Depth of hype analysis')
    }),
    async handler({ tokenAddress, analysisDepth }) {
        try {
            console.log(`🎯 MCP Tool: detectHype called for ${tokenAddress}, depth: ${analysisDepth}`);

            // Analyze trading patterns for hype indicators
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            // Get recent transactions
            const recentTransactions = await TradingTransaction.find({
                tokenAddress,
                blockTimestamp: { $gte: oneDayAgo }
            }).sort({ blockTimestamp: -1 });

            const weeklyTransactions = await TradingTransaction.find({
                tokenAddress,
                blockTimestamp: { $gte: oneWeekAgo }
            }).sort({ blockTimestamp: -1 });

            // Calculate hype indicators
            const volumeSpike = calculateVolumeSpike(recentTransactions, weeklyTransactions);
            const holderGrowth = await calculateHolderGrowth(tokenAddress);
            const priceVolatility = await calculatePriceVolatility(tokenAddress);

            // Calculate weighted hype score
            let hypeScore = 0;
            hypeScore += Math.min(100, Math.max(0, volumeSpike * 100)) * 0.4;
            hypeScore += Math.min(100, Math.max(0, holderGrowth * 100)) * 0.3;
            hypeScore += Math.min(100, Math.max(0, priceVolatility * 100)) * 0.3;

            // Determine hype level
            let hypeLevel = 'Low';
            if (hypeScore >= 70) hypeLevel = 'Very High';
            else if (hypeScore >= 50) hypeLevel = 'High';
            else if (hypeScore >= 30) hypeLevel = 'Medium';
            else if (hypeScore >= 15) hypeLevel = 'Low';

            const result = {
                tokenAddress,
                hypeScore: Math.round(hypeScore),
                hypeLevel,
                analysisDepth,
                indicators: {
                    volumeSpike: {
                        value: volumeSpike,
                        score: Math.min(100, Math.max(0, volumeSpike * 100)),
                        description: getVolumeSpikeDescription(volumeSpike)
                    },
                    holderGrowth: {
                        value: holderGrowth,
                        score: Math.min(100, Math.max(0, holderGrowth * 100)),
                        description: getHolderGrowthDescription(holderGrowth)
                    },
                    priceVolatility: {
                        value: priceVolatility,
                        score: Math.min(100, Math.max(0, priceVolatility * 100)),
                        description: getVolatilityDescription(priceVolatility)
                    }
                }
            };

            console.log(`✅ MCP Tool: detectHype result:`, result);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };

        } catch (error) {
            console.error('❌ MCP Tool: detectHype error:', error);
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }]
            };
        }
    }
};

// Tool 3: Predict Moon Potential
const predictMoonPotential = {
    name: 'predictMoonPotential',
    title: 'Moon Potential Prediction',
    description: 'Predict moon potential based on technical indicators, holder distribution, and market trends',
    inputSchema: z.object({
        tokenAddress: z.string().describe('Token contract address'),
        timeframe: z.enum(['short', 'medium', 'long']).default('medium').describe('Prediction timeframe')
    }),
    async handler({ tokenAddress, timeframe }) {
        try {
            console.log(`🚀 MCP Tool: predictMoonPotential called for ${tokenAddress}, timeframe: ${timeframe}`);

            // Get basic metrics for calculation
            const metrics = await TradingMetrics.findOne({ tokenAddress }).sort({ timestamp: -1 });
            const holderCount = await TokenHolder.countDocuments({
                tokenAddress,
                isActive: true,
                balance: { $gt: '0' }
            });

            // Calculate moon potential factors
            let moonScore = 0;
            const factors = {};

            // Holder strength factor (0-25 points)
            const holderStrength = Math.min(100, Math.max(0, (holderCount / 100) * 25));
            moonScore += holderStrength;
            factors.holderStrength = {
                score: Math.round(holderStrength),
                value: holderCount,
                weight: '25%',
                description: getHolderStrengthDescription(holderCount)
            };

            // Volume strength factor (0-25 points)
            const volume = parseFloat(metrics?.volume24h || '0');
            const volumeStrength = Math.min(100, Math.max(0, (volume / 1000) * 25));
            moonScore += volumeStrength;
            factors.volumeStrength = {
                score: Math.round(volumeStrength),
                value: volume,
                weight: '25%',
                description: getVolumeStrengthDescription(volume)
            };

            // Price momentum factor (0-25 points)
            const priceChange = Math.abs(metrics?.priceChange24h || 0);
            const priceMomentum = Math.min(100, Math.max(0, (priceChange / 100) * 25));
            moonScore += priceMomentum;
            factors.priceMomentum = {
                score: Math.round(priceMomentum),
                value: priceChange,
                weight: '25%',
                description: getPriceMomentumDescription(priceChange)
            };

            // Community factor (0-25 points)
            const communityFactor = Math.min(100, Math.max(0, (holderCount / 500) * 25));
            moonScore += communityFactor;
            factors.communityFactor = {
                score: Math.round(communityFactor),
                value: holderCount,
                weight: '25%',
                description: getCommunityFactorDescription(holderCount)
            };

            // Determine moon potential level
            let moonPotential = 'Low';
            if (moonScore >= 80) moonPotential = 'Moon Shot';
            else if (moonScore >= 65) moonPotential = 'High Potential';
            else if (moonScore >= 50) moonPotential = 'Medium Potential';
            else if (moonScore >= 35) moonPotential = 'Low Potential';
            else moonPotential = 'Not Looking Good';

            const result = {
                tokenAddress,
                timeframe,
                moonScore: Math.round(moonScore),
                moonPotential,
                factors,
                recommendation: getMoonRecommendation(moonScore, timeframe)
            };

            console.log(`✅ MCP Tool: predictMoonPotential result:`, result);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };

        } catch (error) {
            console.error('❌ MCP Tool: predictMoonPotential error:', error);
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }]
            };
        }
    }
};

// Tool 4: Get Holder Analysis
const getHolderAnalysis = {
    name: 'getHolderAnalysis',
    title: 'Holder Distribution Analysis',
    description: 'Analyze token holder distribution, whale concentration, and holder behavior patterns',
    inputSchema: z.object({
        tokenAddress: z.string().describe('Token contract address'),
        includeStats: z.boolean().default(false).describe('Include detailed holder statistics')
    }),
    async handler({ tokenAddress, includeStats }) {
        try {
            console.log(`👥 MCP Tool: getHolderAnalysis called for ${tokenAddress}, includeStats: ${includeStats}`);

            // Get active holders with non-zero balance
            const holders = await TokenHolder.find({
                tokenAddress,
                isActive: true,
                balance: { $gt: '0' }
            }).sort({ balance: -1 }).limit(100);

            const totalHolders = await TokenHolder.countDocuments({
                tokenAddress,
                isActive: true,
                balance: { $gt: '0' }
            });

            if (totalHolders === 0) {
                return {
                    content: [{
                        type: 'text', text: JSON.stringify({
                            tokenAddress,
                            totalHolders: 0,
                            message: 'No active holders found for this token'
                        }, null, 2)
                    }]
                };
            }

            // Calculate total supply from holders
            const totalSupply = holders.reduce((sum, h) => sum + parseFloat(h.balance), 0);

            // Calculate whale threshold (top 1% by balance)
            const sortedHolders = holders.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
            const whaleThreshold = sortedHolders[Math.floor(sortedHolders.length * 0.01)]?.balance || '0';

            // Identify whales (top 1% holders)
            const whales = holders.filter(h => parseFloat(h.balance) >= parseFloat(whaleThreshold));

            // Calculate concentration metrics
            const top10Holders = holders.slice(0, 10);
            const top10Percentage = top10Holders.reduce((sum, h) => sum + parseFloat(h.balance), 0) / totalSupply * 100;

            const analysis = {
                tokenAddress,
                totalHolders,
                totalSupply: formatTokenAmount(totalSupply),
                concentration: {
                    top10Holders: top10Percentage.toFixed(2) + '%',
                    whaleConcentration: (whales.reduce((sum, h) => sum + parseFloat(h.balance), 0) / totalSupply * 100).toFixed(2) + '%'
                },
                whaleAnalysis: {
                    count: whales.length,
                    threshold: formatTokenAmount(parseFloat(whaleThreshold)),
                    totalWhaleBalance: formatTokenAmount(whales.reduce((sum, h) => sum + parseFloat(h.balance), 0))
                },
                holderDistribution: {
                    smallHolders: holders.filter(h => parseFloat(h.balance) < parseFloat(whaleThreshold) * 0.1).length,
                    mediumHolders: holders.filter(h =>
                        parseFloat(h.balance) >= parseFloat(whaleThreshold) * 0.1 &&
                        parseFloat(h.balance) < parseFloat(whaleThreshold)
                    ).length,
                    largeHolders: whales.length
                }
            };

            console.log(`✅ MCP Tool: getHolderAnalysis result:`, analysis);
            return {
                content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }]
            };

        } catch (error) {
            console.error('❌ MCP Tool: getHolderAnalysis error:', error);
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }]
            };
        }
    }
};

// Tool 5: Get Token Info
const getTokenInfo = {
    name: 'getTokenInfo',
    title: 'Token Information',
    description: 'Get comprehensive token information including supply, description, and links',
    inputSchema: z.object({
        tokenAddress: z.string().describe('Token contract address')
    }),
    async handler({ tokenAddress }) {
        try {
            console.log(`ℹ️ MCP Tool: getTokenInfo called for ${tokenAddress}`);

            // Get agent data
            const agent = await Agent.findOne({ tokenAddress }).lean();
            if (!agent) {
                return {
                    content: [{
                        type: 'text', text: JSON.stringify({
                            error: 'Token not found'
                        }, null, 2)
                    }]
                };
            }

            const result = {
                tokenAddress: agent.tokenAddress,
                name: agent.name,
                description: agent.description,
                tokenSymbol: agent.tokenSymbol,
                tokenDecimals: agent.tokenDecimals,
                totalSupply: agent.totalSupply,
                tokenConfirmation: agent.status === 'active' ? 'Confirmed' : 'Unconfirmed',
                links: {
                    website: agent.websiteUrl,
                    twitter: agent.twitterUrl,
                    telegram: agent.telegramUrl
                },
                tags: agent.tags,
                launchDate: agent.launchDate,
                createdAt: agent.createdAt
            };

            console.log(`✅ MCP Tool: getTokenInfo result:`, result);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };

        } catch (error) {
            console.error('❌ MCP Tool: getTokenInfo error:', error);
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }]
            };
        }
    }
};

// Tool 6: Get Top Holders
const getTopHolders = {
    name: 'getTopHolders',
    title: 'Top Token Holders',
    description: 'Get information about the top token holders',
    inputSchema: z.object({
        tokenAddress: z.string().describe('Token contract address'),
        limit: z.number().min(1).max(100).default(10).describe('Number of top holders to return')
    }),
    async handler({ tokenAddress, limit = 10 }) {
        try {
            console.log(`👥 MCP Tool: getTopHolders called for ${tokenAddress}`);

            // Get top holders
            const holders = await TokenHolder.find({
                tokenAddress,
                isActive: true,
                balance: { $gt: '0' }
            })
                .sort({ balance: -1 })
                .limit(limit)
                .select('walletAddress balance lastTradeTime')
                .lean();

            // Get total supply from agent
            const agent = await Agent.findOne({ tokenAddress }).select('totalSupply').lean();
            const totalSupply = agent?.totalSupply || '0';

            const result = {
                tokenAddress,
                totalHolders: await TokenHolder.countDocuments({
                    tokenAddress,
                    isActive: true,
                    balance: { $gt: '0' }
                }),
                topHolders: holders.map(h => ({
                    address: h.walletAddress,
                    balance: h.balance,
                    percentage: ((parseFloat(h.balance) / parseFloat(totalSupply)) * 100).toFixed(2) + '%',
                    lastTradeTime: h.lastTradeTime
                }))
            };

            console.log(`✅ MCP Tool: getTopHolders result:`, result);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };

        } catch (error) {
            console.error('❌ MCP Tool: getTopHolders error:', error);
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }]
            };
        }
    }
};

// Tool 7: Get Latest Transactions
const getLatestTransactions = {
    name: 'getLatestTransactions',
    title: 'Latest Token Transactions',
    description: 'Get the most recent token transactions',
    inputSchema: z.object({
        tokenAddress: z.string().describe('Token contract address'),
        limit: z.number().min(1).max(50).default(10).describe('Number of transactions to return')
    }),
    async handler({ tokenAddress, limit = 10 }) {
        try {
            console.log(`💸 MCP Tool: getLatestTransactions called for ${tokenAddress}`);

            const transactions = await TradingTransaction.find({ tokenAddress })
                .sort({ blockTimestamp: -1 })
                .limit(limit)
                .select('transactionHash userAddress type tokenAmount ethAmount price blockTimestamp')
                .lean();

            const result = {
                tokenAddress,
                transactions: transactions.map(t => ({
                    hash: t.transactionHash,
                    type: t.type,
                    userAddress: t.userAddress,
                    tokenAmount: t.tokenAmount,
                    seiAmount: t.ethAmount,
                    price: t.price,
                    timestamp: t.blockTimestamp
                }))
            };

            console.log(`✅ MCP Tool: getLatestTransactions result:`, result);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };

        } catch (error) {
            console.error('❌ MCP Tool: getLatestTransactions error:', error);
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }]
            };
        }
    }
};

function calculateVolumeSpike(recentTransactions, weeklyTransactions) {
    if (recentTransactions.length < 2 || weeklyTransactions.length < 2) return 0;

    const recentVolume = recentTransactions.reduce((sum, t) => sum + parseFloat(t.ethAmount), 0);
    const weeklyVolume = weeklyTransactions.reduce((sum, t) => sum + parseFloat(t.ethAmount), 0);
    const dailyAverage = weeklyVolume / 7;

    return dailyAverage > 0 ? (recentVolume - dailyAverage) / dailyAverage : 0;
}

async function calculateHolderGrowth(tokenAddress) {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const currentHolders = await TokenHolder.countDocuments({
            tokenAddress,
            isActive: true,
            balance: { $gt: '0' }
        });

        const previousHolders = await TokenHolder.countDocuments({
            tokenAddress,
            isActive: true,
            balance: { $gt: '0' },
            createdAt: { $lt: oneDayAgo }
        });

        return previousHolders > 0 ? (currentHolders - previousHolders) / previousHolders : 0;
    } catch (error) {
        console.error('Error calculating holder growth:', error);
        return 0;
    }
}

async function calculatePriceVolatility(tokenAddress) {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const transactions = await TradingTransaction.find({
            tokenAddress,
            blockTimestamp: { $gte: oneDayAgo }
        }).sort({ blockTimestamp: 1 });

        if (transactions.length < 2) return 0;

        const prices = transactions.map(t => parseFloat(t.price));
        const priceChanges = [];

        for (let i = 1; i < prices.length; i++) {
            const change = Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]);
            priceChanges.push(change);
        }

        const averageChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
        return averageChange;
    } catch (error) {
        console.error('Error calculating price volatility:', error);
        return 0;
    }
}

// Description helper functions
function getVolumeSpikeDescription(spike) {
    if (spike > 2) return 'Massive volume surge detected';
    if (spike > 1) return 'Significant volume increase';
    if (spike > 0.5) return 'Moderate volume growth';
    if (spike > 0) return 'Slight volume increase';
    if (spike > -0.5) return 'Stable volume';
    return 'Volume declining';
}

function getHolderGrowthDescription(growth) {
    if (growth > 0.5) return 'Explosive holder growth';
    if (growth > 0.2) return 'Strong holder growth';
    if (growth > 0.1) return 'Moderate holder growth';
    if (growth > 0) return 'Steady holder growth';
    if (growth > -0.1) return 'Stable holder count';
    return 'Holder count declining';
}

function getVolatilityDescription(volatility) {
    if (volatility > 0.1) return 'Extremely volatile';
    if (volatility > 0.05) return 'Highly volatile';
    if (volatility > 0.02) return 'Moderately volatile';
    if (volatility > 0.01) return 'Slightly volatile';
    return 'Price stable';
}

function getHolderStrengthDescription(holderCount) {
    if (holderCount > 10000) return 'Massive community';
    if (holderCount > 5000) return 'Large community';
    if (holderCount > 1000) return 'Medium community';
    if (holderCount > 100) return 'Small community';
    return 'Tiny community';
}

function getVolumeStrengthDescription(volume) {
    if (volume > 1000) return 'Massive volume';
    if (volume > 100) return 'High volume';
    if (volume > 10) return 'Medium volume';
    if (volume > 1) return 'Low volume';
    return 'Minimal volume';
}

function getPriceMomentumDescription(priceChange) {
    if (priceChange > 50) return 'Rocketing up';
    if (priceChange > 20) return 'Strong upward momentum';
    if (priceChange > 10) return 'Moderate growth';
    if (priceChange > 0) return 'Slight growth';
    if (priceChange > -10) return 'Slight decline';
    if (priceChange > -20) return 'Moderate decline';
    return 'Heavy decline';
}

function getCommunityFactorDescription(holderCount) {
    if (holderCount > 10000) return 'Massive community strength';
    if (holderCount > 5000) return 'Strong community foundation';
    if (holderCount > 1000) return 'Solid community base';
    if (holderCount > 100) return 'Growing community';
    return 'Small community';
}

function getMoonRecommendation(moonScore, timeframe) {
    if (moonScore >= 80) return 'Strong buy - This token shows exceptional moon potential';
    if (moonScore >= 65) return 'Buy - Good potential for significant gains';
    if (moonScore >= 50) return 'Hold - Moderate potential, monitor closely';
    if (moonScore >= 35) return 'Caution - Limited potential, consider reducing position';
    return 'Avoid - Poor fundamentals suggest limited upside';
}

// Export all MEME tools
module.exports = {
    getTokenMetrics,
    detectHype,
    predictMoonPotential,
    getHolderAnalysis,
    getTokenInfo,
    getTopHolders,
    getLatestTransactions
};
