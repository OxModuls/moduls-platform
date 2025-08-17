const TradingMetrics = require('../models/trading-metrics');
const TradingTransaction = require('../models/trading-transaction');
const TokenHolder = require('../models/token-holder');
const Agent = require('../models/agents');

class ModulService {
    constructor(modulType, agentId) {
        this.modulType = modulType;
        this.agentId = agentId;
        this.tools = this.initializeTools();
    }

    initializeTools() {
        const tools = {};

        switch (this.modulType) {
            case 'MEME':
                tools.getTokenMetrics = {
                    name: 'getTokenMetrics',
                    description: 'Get comprehensive token metrics including price, volume, market cap, and trading data',
                    parameters: {
                        type: 'object',
                        properties: {
                            tokenAddress: { type: 'string', description: 'Token contract address' },
                            timeRange: { type: 'string', enum: ['1h', '24h', '7d', '30d'], description: 'Time range for metrics' }
                        },
                        required: ['tokenAddress']
                    }
                };

                tools.detectHype = {
                    name: 'detectHype',
                    description: 'Analyze token hype potential based on social sentiment, volume spikes, and holder growth',
                    parameters: {
                        type: 'object',
                        properties: {
                            tokenAddress: { type: 'string', description: 'Token contract address' },
                            analysisDepth: { type: 'string', enum: ['basic', 'detailed'], description: 'Depth of hype analysis' }
                        },
                        required: ['tokenAddress']
                    }
                };

                tools.predictMoonPotential = {
                    name: 'predictMoonPotential',
                    description: 'Predict moon potential based on technical indicators, holder distribution, and market trends',
                    parameters: {
                        type: 'object',
                        properties: {
                            tokenAddress: { type: 'string', description: 'Token contract address' },
                            timeframe: { type: 'string', enum: ['short', 'medium', 'long'], description: 'Prediction timeframe' }
                        },
                        required: ['tokenAddress']
                    }
                };

                tools.getHolderAnalysis = {
                    name: 'getHolderAnalysis',
                    description: 'Analyze token holder distribution, whale concentration, and holder behavior patterns',
                    parameters: {
                        type: 'object',
                        properties: {
                            tokenAddress: { type: 'string', description: 'Token contract address' },
                            includeStats: { type: 'boolean', description: 'Include detailed holder statistics' }
                        },
                        required: ['tokenAddress']
                    }
                };
                break;

            case 'GAMING_BUDDY':
                tools.suggestGames = {
                    name: 'suggestGames',
                    description: 'Suggest games based on user preferences and current gaming trends',
                    parameters: {
                        type: 'object',
                        properties: {
                            genre: { type: 'string', description: 'Preferred game genre' },
                            platform: { type: 'string', description: 'Gaming platform preference' }
                        }
                    }
                };
                break;

            case 'TRADING_ASSISTANT':
                tools.analyzeMarket = {
                    name: 'analyzeMarket',
                    description: 'Analyze market conditions and provide trading insights',
                    parameters: {
                        type: 'object',
                        properties: {
                            asset: { type: 'string', description: 'Asset to analyze' },
                            timeframe: { type: 'string', description: 'Analysis timeframe' }
                        },
                        required: ['asset']
                    }
                };
                break;

            case 'PORTFOLIO_WATCHER':
                tools.trackPortfolio = {
                    name: 'trackPortfolio',
                    description: 'Track portfolio performance and provide insights',
                    parameters: {
                        type: 'object',
                        properties: {
                            walletAddress: { type: 'string', description: 'Wallet address to track' }
                        },
                        required: ['walletAddress']
                    }
                };
                break;

            case 'SOCIAL_SENTINEL':
                tools.gatherSocialData = {
                    name: 'gatherSocialData',
                    description: 'Gather social media data based on keywords and topics',
                    parameters: {
                        type: 'object',
                        properties: {
                            keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to search for' },
                            platforms: { type: 'array', items: { type: 'string' }, description: 'Social platforms to search' }
                        },
                        required: ['keywords']
                    }
                };
                break;

            default:
                // Fallback to basic tools for unsupported types
                tools.basicChat = {
                    name: 'basicChat',
                    description: 'Basic chat functionality for unsupported modul types',
                    parameters: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                };
        }

        return tools;
    }

    async executeTool(toolName, parameters) {
        const tool = this.tools[toolName];
        if (!tool) {
            throw new Error(`Tool '${toolName}' not found for modul type '${this.modulType}'`);
        }

        switch (this.modulType) {
            case 'MEME':
                return await this.executeMemeTool(toolName, parameters);
            case 'GAMING_BUDDY':
                return await this.executeGamingTool(toolName, parameters);
            case 'TRADING_ASSISTANT':
                return await this.executeTradingTool(toolName, parameters);
            case 'PORTFOLIO_WATCHER':
                return await this.executePortfolioTool(toolName, parameters);
            case 'SOCIAL_SENTINEL':
                return await this.executeSocialTool(toolName, parameters);
            default:
                return await this.executeBasicTool(toolName, parameters);
        }
    }

    async executeMemeTool(toolName, parameters) {
        switch (toolName) {
            case 'getTokenMetrics':
                return await this.getTokenMetrics(parameters);
            case 'detectHype':
                return await this.detectHype(parameters);
            case 'predictMoonPotential':
                return await this.predictMoonPotential(parameters);
            case 'getHolderAnalysis':
                return await this.getHolderAnalysis(parameters);
            default:
                throw new Error(`Unknown meme tool: ${toolName}`);
        }
    }

    async getTokenMetrics(parameters) {
        const { tokenAddress, timeRange = '24h' } = parameters;

        // Get trading metrics from database
        const metrics = await TradingMetrics.findOne({ tokenAddress }).sort({ timestamp: -1 });
        const transactions = await TradingTransaction.find({ tokenAddress })
            .sort({ timestamp: -1 })
            .limit(100);

        return {
            tokenAddress,
            timeRange,
            price: metrics?.price || 0,
            volume24h: metrics?.volume24h || 0,
            marketCap: metrics?.marketCap || 0,
            holderCount: metrics?.holderCount || 0,
            recentTransactions: transactions.length,
            priceChange: metrics?.priceChange || 0
        };
    }

    async detectHype(parameters) {
        const { tokenAddress, analysisDepth = 'basic' } = parameters;

        // Analyze trading patterns for hype indicators
        const recentTransactions = await TradingTransaction.find({ tokenAddress })
            .sort({ timestamp: -1 })
            .limit(100);

        const volumeSpike = this.calculateVolumeSpike(recentTransactions);
        const holderGrowth = await this.calculateHolderGrowth(tokenAddress);

        return {
            tokenAddress,
            hypeScore: Math.min(100, (volumeSpike * 0.6 + holderGrowth * 0.4) * 100),
            volumeSpike,
            holderGrowth,
            analysisDepth
        };
    }

    async predictMoonPotential(parameters) {
        const { tokenAddress, timeframe = 'medium' } = parameters;

        // Calculate moon potential based on various factors
        const metrics = await this.getTokenMetrics({ tokenAddress });
        const hype = await this.detectHype({ tokenAddress });

        let moonScore = 0;
        moonScore += (metrics.holderCount / 1000) * 20; // Holder count factor
        moonScore += (hype.hypeScore / 100) * 30; // Hype factor
        moonScore += Math.min(metrics.volume24h / 1000000, 1) * 25; // Volume factor
        moonScore += Math.min(metrics.priceChange, 100) * 0.25; // Price change factor

        return {
            tokenAddress,
            timeframe,
            moonScore: Math.min(100, Math.max(0, moonScore)),
            factors: {
                holderStrength: Math.min(100, (metrics.holderCount / 1000) * 100),
                hypeLevel: hype.hypeScore,
                volumeStrength: Math.min(100, (metrics.volume24h / 1000000) * 100),
                priceMomentum: Math.min(100, Math.max(0, metrics.priceChange))
            }
        };
    }

    async getHolderAnalysis(parameters) {
        const { tokenAddress, includeStats = false } = parameters;

        const holders = await TokenHolder.find({ tokenAddress })
            .sort({ balance: -1 })
            .limit(100);

        const totalHolders = await TokenHolder.countDocuments({ tokenAddress });
        const whaleThreshold = totalHolders * 0.01; // Top 1% are whales

        const analysis = {
            tokenAddress,
            totalHolders,
            whaleCount: holders.filter(h => h.balance > whaleThreshold).length,
            topHolders: holders.slice(0, 10).map(h => ({
                address: h.walletAddress,
                balance: h.balance,
                percentage: (h.balance / totalHolders) * 100
            }))
        };

        if (includeStats) {
            analysis.distribution = this.calculateHolderDistribution(holders);
        }

        return analysis;
    }

    calculateVolumeSpike(transactions) {
        if (transactions.length < 2) return 0;

        const recentVolume = transactions.slice(0, 10).reduce((sum, t) => sum + t.amount, 0);
        const olderVolume = transactions.slice(10, 20).reduce((sum, t) => sum + t.amount, 0);

        return olderVolume > 0 ? (recentVolume - olderVolume) / olderVolume : 0;
    }

    async calculateHolderGrowth(tokenAddress) {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const currentHolders = await TokenHolder.countDocuments({ tokenAddress });
        const previousHolders = await TokenHolder.countDocuments({
            tokenAddress,
            createdAt: { $lt: oneDayAgo }
        });

        return previousHolders > 0 ? (currentHolders - previousHolders) / previousHolders : 0;
    }

    calculateHolderDistribution(holders) {
        const total = holders.reduce((sum, h) => sum + h.balance, 0);
        return {
            top1Percent: holders.slice(0, Math.ceil(holders.length * 0.01)).reduce((sum, h) => sum + h.balance, 0) / total,
            top10Percent: holders.slice(0, Math.ceil(holders.length * 0.1)).reduce((sum, h) => sum + h.balance, 0) / total,
            top50Percent: holders.slice(0, Math.ceil(holders.length * 0.5)).reduce((sum, h) => sum + h.balance, 0) / total
        };
    }

    async executeGamingTool(toolName, parameters) {
        if (toolName === 'suggestGames') {
            return {
                suggestions: [
                    'CryptoKitties - Collect and breed digital cats',
                    'Axie Infinity - Battle with NFT creatures',
                    'The Sandbox - Build and monetize virtual worlds',
                    'Decentraland - Explore and create in virtual reality'
                ],
                genre: parameters.genre || 'all',
                platform: parameters.platform || 'all'
            };
        }
        throw new Error(`Unknown gaming tool: ${toolName}`);
    }

    async executeTradingTool(toolName, parameters) {
        if (toolName === 'analyzeMarket') {
            return {
                asset: parameters.asset,
                timeframe: parameters.timeframe || '24h',
                analysis: 'Market analysis would be implemented here',
                recommendation: 'Hold position'
            };
        }
        throw new Error(`Unknown trading tool: ${toolName}`);
    }

    async executePortfolioTool(toolName, parameters) {
        if (toolName === 'trackPortfolio') {
            return {
                walletAddress: parameters.walletAddress,
                totalValue: 0,
                assets: [],
                performance: 'Portfolio tracking would be implemented here'
            };
        }
        throw new Error(`Unknown portfolio tool: ${toolName}`);
    }

    async executeSocialTool(toolName, parameters) {
        if (toolName === 'gatherSocialData') {
            return {
                keywords: parameters.keywords,
                platforms: parameters.platforms || ['twitter', 'reddit', 'telegram'],
                data: 'Social data gathering would be implemented here',
                sentiment: 'neutral'
            };
        }
        throw new Error(`Unknown social tool: ${toolName}`);
    }

    async executeBasicTool(toolName, parameters) {
        if (toolName === 'basicChat') {
            return {
                response: 'I can help you with basic questions. For specialized features, please use a supported modul type.',
                modulType: this.modulType
            };
        }
        throw new Error(`Unknown basic tool: ${toolName}`);
    }

    getAvailableTools() {
        return Object.values(this.tools);
    }
}

module.exports = ModulService;
