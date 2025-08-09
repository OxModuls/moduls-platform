const { createPublicClient, webSocket, getAddress, http } = require('viem');
const { sei, seiTestnet } = require('viem/chains');
const TradingTransaction = require('./models/trading-transaction');
const TradingMetrics = require('./models/trading-metrics');
const config = require('../config');
const ModulsSalesManagerAbi = require('./abi/ModulsSalesManager.json');

// Extract trading events from the ABI
const tradingEvents = ModulsSalesManagerAbi.filter(item =>
    item.type === 'event' &&
    ['ModulsTokenPurchase', 'ModulsTokenSell'].includes(item.name)
);

// Create viem client based on environment
const chain = config.chainMode === 'mainnet' ? sei : seiTestnet;

// Try WebSocket first, fallback to HTTP
let client;
try {
    client = createPublicClient({
        chain,
        transport: webSocket(config.rpcUrls[config.chainMode].webSocket)
    });
    console.log(`🛒 Trading: WebSocket connected (${chain.name})`);
} catch (error) {
    console.log('⚠️ Trading: WebSocket failed, using HTTP transport');
    const { http } = require('viem');
    client = createPublicClient({
        chain,
        transport: http(config.rpcUrls[config.chainMode].http)
    });
}

// Event name to callback mapping
const eventCallbacks = new Map();

// Utility function to convert BigInt to string safely
function bigIntToString(value) {
    return typeof value === 'bigint' ? value.toString() : String(value);
}

// Calculate percentage change
function calculatePercentageChange(oldPrice, newPrice) {
    if (!oldPrice || oldPrice === '0') return 0;
    const oldPriceBN = BigInt(oldPrice);
    const newPriceBN = BigInt(newPrice);
    const change = newPriceBN - oldPriceBN;
    return Number((change * 100n) / oldPriceBN);
}

// Register ModulsTokenPurchase event callback
eventCallbacks.set('ModulsTokenPurchase', async (event) => {
    try {
        const { token, buyer, amount, ethSpent, price, timestamp } = event.args;
        const { blockNumber, transactionHash, logIndex } = event;

        // Create trading transaction record
        const transaction = new TradingTransaction({
            transactionHash,
            tokenAddress: getAddress(token),
            userAddress: getAddress(buyer),
            type: 'buy',
            tokenAmount: bigIntToString(amount),
            ethAmount: bigIntToString(ethSpent),
            price: bigIntToString(price),
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            blockTimestamp: new Date(Number(timestamp) * 1000),
        });

        await transaction.save();

        // Update trading metrics
        await updateTradingMetrics(getAddress(token), 'buy', {
            price: bigIntToString(price),
            ethAmount: bigIntToString(ethSpent),
            timestamp: new Date(Number(timestamp) * 1000),
        });

        console.log(`📈 Buy: ${getAddress(token)} | ${bigIntToString(amount)} tokens | ${bigIntToString(ethSpent)} wei`);

    } catch (error) {
        console.error('❌ ModulsTokenPurchase error:', error.message);
    }
});

// Register ModulsTokenSell event callback
eventCallbacks.set('ModulsTokenSell', async (event) => {
    try {
        const { token, seller, amount, ethReceived, price, timestamp } = event.args;
        const { blockNumber, transactionHash, logIndex } = event;

        // Create trading transaction record
        const transaction = new TradingTransaction({
            transactionHash,
            tokenAddress: getAddress(token),
            userAddress: getAddress(seller),
            type: 'sell',
            tokenAmount: bigIntToString(amount),
            ethAmount: bigIntToString(ethReceived),
            price: bigIntToString(price),
            blockNumber: Number(blockNumber),
            logIndex: Number(logIndex),
            blockTimestamp: new Date(Number(timestamp) * 1000),
        });

        await transaction.save();

        // Update trading metrics
        await updateTradingMetrics(getAddress(token), 'sell', {
            price: bigIntToString(price),
            ethAmount: bigIntToString(ethReceived),
            timestamp: new Date(Number(timestamp) * 1000),
        });

        console.log(`📉 Sell: ${getAddress(token)} | ${bigIntToString(amount)} tokens | ${bigIntToString(ethReceived)} wei`);

    } catch (error) {
        console.error('❌ ModulsTokenSell error:', error.message);
    }
});

/**
 * Update trading metrics for a token
 */
async function updateTradingMetrics(tokenAddress, tradeType, tradeData) {
    try {
        const { price, ethAmount, timestamp } = tradeData;

        // Get or create metrics document
        let metrics = await TradingMetrics.findOne({ tokenAddress });
        if (!metrics) {
            metrics = new TradingMetrics({ tokenAddress });
        }

        // Update current price and last trade info
        const oldPrice = metrics.currentPrice;
        metrics.currentPrice = price;
        metrics.lastTradePrice = price;
        metrics.lastTradeTime = timestamp;
        metrics.lastTradeType = tradeType;

        // Calculate time periods
        const now = new Date();
        const day24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get transactions for time-based calculations
        const [transactions24h, transactions7d, allTransactions] = await Promise.all([
            TradingTransaction.find({
                tokenAddress,
                blockTimestamp: { $gte: day24Ago }
            }).sort({ blockTimestamp: 1 }),
            TradingTransaction.find({
                tokenAddress,
                blockTimestamp: { $gte: days7Ago }
            }).sort({ blockTimestamp: 1 }),
            TradingTransaction.find({ tokenAddress }).sort({ blockTimestamp: 1 })
        ]);

        // Calculate 24h metrics
        if (transactions24h.length > 0) {
            const volume24h = transactions24h.reduce((sum, tx) => sum + BigInt(tx.ethAmount), 0n);
            metrics.volume24h = volume24h.toString();

            const firstPrice24h = transactions24h[0].price;
            metrics.priceChange24h = calculatePercentageChange(firstPrice24h, price);
            metrics.priceChange24hAbs = (BigInt(price) - BigInt(firstPrice24h)).toString();

            const prices24h = transactions24h.map(tx => BigInt(tx.price));
            metrics.high24h = prices24h.reduce((max, p) => p > max ? p : max, 0n).toString();
            metrics.low24h = prices24h.reduce((min, p) => p < min ? p : min, BigInt(price)).toString();
        }

        // Calculate 7d metrics
        if (transactions7d.length > 0) {
            const volume7d = transactions7d.reduce((sum, tx) => sum + BigInt(tx.ethAmount), 0n);
            metrics.volume7d = volume7d.toString();

            const firstPrice7d = transactions7d[0].price;
            metrics.priceChange7d = calculatePercentageChange(firstPrice7d, price);
            metrics.priceChange7dAbs = (BigInt(price) - BigInt(firstPrice7d)).toString();

            const prices7d = transactions7d.map(tx => BigInt(tx.price));
            metrics.high7d = prices7d.reduce((max, p) => p > max ? p : max, 0n).toString();
            metrics.low7d = prices7d.reduce((min, p) => p < min ? p : min, BigInt(price)).toString();
        }

        // Calculate all-time metrics
        if (allTransactions.length > 0) {
            const totalVolume = allTransactions.reduce((sum, tx) => sum + BigInt(tx.ethAmount), 0n);
            metrics.totalVolume = totalVolume.toString();
            metrics.totalTrades = allTransactions.length;
            metrics.totalBuys = allTransactions.filter(tx => tx.type === 'buy').length;
            metrics.totalSells = allTransactions.filter(tx => tx.type === 'sell').length;

            const allPrices = allTransactions.map(tx => BigInt(tx.price));
            metrics.allTimeHigh = allPrices.reduce((max, p) => p > max ? p : max, 0n).toString();
            metrics.allTimeLow = allPrices.reduce((min, p) => p < min ? p : min, BigInt(price)).toString();
        }

        // Update counters for current transaction
        metrics.totalTrades += 1;
        if (tradeType === 'buy') {
            metrics.totalBuys += 1;
        } else {
            metrics.totalSells += 1;
        }

        // Add current transaction volume
        metrics.totalVolume = (BigInt(metrics.totalVolume || '0') + BigInt(ethAmount)).toString();

        metrics.lastUpdated = now;
        await metrics.save();

    } catch (error) {
        console.error('❌ Trading metrics update error:', error.message);
    }
}

/**
 * Listen and process trading events from ModulsSalesManager contract
 */
async function listenAndProcessTradingEvents(contractAddress, fromBlock = 'latest') {
    try {
        console.log(`🛒 Trading: Listening to ${contractAddress} on ${chain.name}`);

        // Scan for recent events
        try {
            let scanFromBlock;
            const currentBlock = await client.getBlockNumber();

            if (fromBlock === 'latest') {
                scanFromBlock = currentBlock - 2000n;
            } else {
                scanFromBlock = BigInt(fromBlock);
            }

            // Split into chunks of 500 blocks
            const chunkSize = 500n;
            const allLogs = [];
            let currentFromBlock = scanFromBlock;

            while (currentFromBlock <= currentBlock) {
                const currentToBlock = currentFromBlock + chunkSize - 1n > currentBlock
                    ? currentBlock
                    : currentFromBlock + chunkSize - 1n;

                try {
                    const chunkLogs = await client.getLogs({
                        address: getAddress(contractAddress),
                        events: tradingEvents,
                        fromBlock: currentFromBlock,
                        toBlock: currentToBlock
                    });

                    allLogs.push(...chunkLogs);
                } catch (chunkError) {
                    console.warn(`⚠️ Trading: Chunk scan failed (${currentFromBlock}-${currentToBlock}):`, chunkError.message);
                }

                currentFromBlock = currentToBlock + 1n;
            }

            if (allLogs.length > 0) {
                console.log(`🛒 Trading: Processing ${allLogs.length} recent events`);
                await processLogs(allLogs);
            }
        } catch (error) {
            console.warn('⚠️ Trading: Recent scan failed:', error.message);
        }

        // Watch for new events
        let unwatch;
        try {
            unwatch = client.watchEvent({
                address: getAddress(contractAddress),
                events: tradingEvents,
                onLogs: async (logs) => {
                    if (logs.length > 0) {
                        console.log(`🛒 Trading: Received ${logs.length} new event(s)`);
                        await processLogs(logs);
                    }
                },
                onError: (error) => {
                    console.error('❌ Trading: Watch error:', error.message);
                }
            });
        } catch (error) {
            console.log('⚠️ Trading: WebSocket watch failed, using polling');

            // Fallback to polling
            let lastBlock = await client.getBlockNumber();
            const pollInterval = setInterval(async () => {
                try {
                    const currentBlock = await client.getBlockNumber();
                    if (currentBlock > lastBlock) {
                        const logs = await client.getLogs({
                            address: getAddress(contractAddress),
                            events: tradingEvents,
                            fromBlock: lastBlock + 1n,
                            toBlock: currentBlock
                        });

                        if (logs.length > 0) {
                            console.log(`🛒 Trading: Polled ${logs.length} new event(s)`);
                            await processLogs(logs);
                        }
                        lastBlock = currentBlock;
                    }
                } catch (error) {
                    console.error('❌ Trading: Poll error:', error.message);
                }
            }, 5000);

            unwatch = () => clearInterval(pollInterval);
        }

        console.log('✅ Trading: Listener active');
        return unwatch;

    } catch (error) {
        console.error('❌ Trading: Failed to start listener:', error.message);
        throw error;
    }
}

/**
 * Process event logs
 */
async function processLogs(logs) {
    for (const log of logs) {
        try {
            const eventName = log.eventName;
            const callback = eventCallbacks.get(eventName);

            if (callback) {
                const event = {
                    args: log.args,
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    logIndex: log.logIndex,
                    address: log.address,
                    eventName: eventName
                };

                await callback(event);
            } else {
                console.log(`⚠️ Trading: No handler for ${eventName}`);
            }
        } catch (error) {
            console.error('❌ Trading: Processing error:', error.message);
        }
    }
}

/**
 * Register a new event callback
 */
function registerEventCallback(eventName, callback) {
    if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
    }

    eventCallbacks.set(eventName, callback);
    console.log(`✅ Trading: Registered ${eventName} handler`);
}

/**
 * Remove an event callback
 */
function removeEventCallback(eventName) {
    const removed = eventCallbacks.delete(eventName);
    if (removed) {
        console.log(`🗑️ Trading: Removed ${eventName} handler`);
    } else {
        console.log(`⚠️ Trading: No handler found for ${eventName}`);
    }
}

/**
 * Get all registered event names
 */
function getRegisteredEvents() {
    return Array.from(eventCallbacks.keys());
}

/**
 * Stop listening for events
 */
async function stopTradingEventListening(unwatch) {
    try {
        if (typeof unwatch === 'function') {
            unwatch();
            console.log('🛑 Trading: Listener stopped');
        }
    } catch (error) {
        console.error('❌ Trading: Stop error:', error.message);
    }
}

module.exports = {
    listenAndProcessTradingEvents,
    registerEventCallback,
    removeEventCallback,
    getRegisteredEvents,
    stopTradingEventListening,
    updateTradingMetrics,
    eventCallbacks
};
