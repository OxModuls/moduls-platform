const { createPublicClient, webSocket, getAddress, http } = require('viem');
const { sei, seiTestnet } = require('viem/chains');
const Agent = require('./models/agents');
const TokenHolder = require('./models/token-holder');
const config = require('../config');
const ModulsTokenABI = require('../../frontend/src/lib/abi/ModulsToken.json');

// Extract Transfer event from the ABI
const transferEvent = ModulsTokenABI.find(item => item.type === 'event' && item.name === 'Transfer');
console.log(`📋 Transfer event found in ModulsToken ABI: ${transferEvent ? 'Yes' : 'No'}`);

// Create viem client based on environment
const chain = config.chainMode === 'mainnet' ? sei : seiTestnet;

// Try WebSocket first, fallback to HTTP
let client;
try {
    client = createPublicClient({
        chain,
        transport: webSocket(config.rpcUrls[config.chainMode].webSocket)
    });
    console.log(`🎧 Token Events: WebSocket connected (${chain.name})`);
} catch (error) {
    console.log('⚠️ Token Events: WebSocket failed, using HTTP transport');
    client = createPublicClient({
        chain,
        transport: http(config.rpcUrls[config.chainMode].http)
    });
}

// Event name to callback mapping
const eventCallbacks = new Map();

// Track active watchers for cleanup
const activeWatchers = new Map();

// Set up event callbacks
eventCallbacks.set('Transfer', async (event) => {
    try {
        const { from, to, value } = event.args;
        const tokenAddress = event.address;
        const transactionHash = event.transactionHash;
        const blockNumber = event.blockNumber;

        console.log(`🔄 Transfer event: ${from} → ${to} | Amount: ${value.toString()} | Token: ${tokenAddress}`);

        // Get total supply for percentage calculation
        let totalSupply = null;
        try {
            totalSupply = await client.readContract({
                address: tokenAddress,
                abi: ModulsTokenABI,
                functionName: 'totalSupply',
            });
        } catch (error) {
            console.warn(`⚠️ Could not get total supply for ${tokenAddress}:`, error.message);
        }

        // Update sender balance (from address)
        if (from !== '0x0000000000000000000000000000000000000000') {
            try {
                const fromBalance = await client.readContract({
                    address: tokenAddress,
                    abi: ModulsTokenABI,
                    functionName: 'balanceOf',
                    args: [from],
                });

                await TokenHolder.updateHolderBalance(
                    tokenAddress,
                    from,
                    fromBalance.toString(),
                    totalSupply?.toString()
                );

                console.log(`✅ Updated sender balance: ${from} = ${fromBalance.toString()}`);
            } catch (error) {
                console.error(`❌ Error updating sender balance for ${from}:`, error);
            }
        }

        // Update receiver balance (to address)
        if (to !== '0x0000000000000000000000000000000000000000') {
            try {
                const toBalance = await client.readContract({
                    address: tokenAddress,
                    abi: ModulsTokenABI,
                    functionName: 'balanceOf',
                    args: [to],
                });

                await TokenHolder.updateHolderBalance(
                    tokenAddress,
                    to,
                    toBalance.toString(),
                    totalSupply?.toString()
                );

                console.log(`✅ Updated receiver balance: ${to} = ${toBalance.toString()}`);
            } catch (error) {
                console.error(`❌ Error updating receiver balance for ${to}:`, error);
            }
        }

        // Update holder percentages for all holders of this token if needed
        if (totalSupply) {
            try {
                await updateAllHolderPercentages(tokenAddress, totalSupply.toString());
            } catch (error) {
                console.error(`❌ Error updating holder percentages:`, error);
            }
        }

    } catch (error) {
        console.error('❌ Error processing Transfer event:', error);
    }
});

// Helper function to update all holder percentages
async function updateAllHolderPercentages(tokenAddress, totalSupply) {
    const supplyNum = parseFloat(totalSupply) / 1e18;

    if (supplyNum === 0) return;

    // Update all active holders in batches
    const batchSize = 100;
    let skip = 0;

    while (true) {
        const holders = await TokenHolder.find({
            tokenAddress: tokenAddress.toLowerCase(),
            isActive: true
        })
            .limit(batchSize)
            .skip(skip)
            .lean();

        if (holders.length === 0) break;

        const updatePromises = holders.map(async (holder) => {
            const balanceNum = parseFloat(holder.balance) / 1e18;
            const percentage = (balanceNum / supplyNum) * 100;

            return TokenHolder.updateOne(
                { _id: holder._id },
                { $set: { percentage } }
            );
        });

        await Promise.all(updatePromises);
        skip += batchSize;
    }
}

/**
 * Start watching Transfer events for a specific token
 * @param {string} tokenAddress - The token contract address
 */
async function startWatchingToken(tokenAddress) {
    if (activeWatchers.has(tokenAddress.toLowerCase())) {
        console.log(`📍 Token Events: Already watching token: ${tokenAddress}`);
        return;
    }

    try {
        console.log(`🎯 Token Events: Starting to watch Transfer events for: ${tokenAddress}`);

        // First, scan recent events to initialize state
        try {
            const currentBlock = await client.getBlockNumber();
            const scanFromBlock = currentBlock - 2000n; // Last 2000 blocks

            console.log(`📡 Token Events: Scanning last 2000 blocks for ${tokenAddress}`);

            // Split into chunks of 500 blocks to respect RPC limits
            const chunkSize = 500n;
            const allLogs = [];
            let currentFromBlock = scanFromBlock;

            while (currentFromBlock <= currentBlock) {
                const currentToBlock = currentFromBlock + chunkSize - 1n > currentBlock
                    ? currentBlock
                    : currentFromBlock + chunkSize - 1n;

                try {
                    const chunkLogs = await client.getLogs({
                        address: getAddress(tokenAddress),
                        event: transferEvent,
                        fromBlock: currentFromBlock,
                        toBlock: currentToBlock
                    });

                    allLogs.push(...chunkLogs);
                } catch (chunkError) {
                    console.warn(`⚠️ Token Events: Chunk scan failed for ${tokenAddress} (${currentFromBlock}-${currentToBlock}):`, chunkError.message);
                }

                currentFromBlock = currentToBlock + 1n;
            }

            if (allLogs.length > 0) {
                console.log(`📡 Token Events: Processing ${allLogs.length} recent Transfer events for ${tokenAddress}`);
                await processTokenLogs(allLogs, tokenAddress);
            }
        } catch (error) {
            console.warn(`⚠️ Token Events: Recent scan failed for ${tokenAddress}:`, error.message);
        }

        // Watch for new events
        let unwatch;
        try {
            unwatch = client.watchEvent({
                address: getAddress(tokenAddress),
                event: transferEvent,
                onLogs: async (logs) => {
                    if (logs.length > 0) {
                        console.log(`📡 Token Events: Received ${logs.length} new Transfer event(s) for ${tokenAddress}`);
                        await processTokenLogs(logs, tokenAddress);
                    }
                },
                onError: (error) => {
                    console.error(`❌ Token Events: Watch error for ${tokenAddress}:`, error.message);
                }
            });
        } catch (error) {
            console.log(`⚠️ Token Events: WebSocket watch failed for ${tokenAddress}, using polling`);

            // Fallback to polling if watchEvent fails
            let lastBlock = await client.getBlockNumber();
            const pollInterval = setInterval(async () => {
                try {
                    const currentBlock = await client.getBlockNumber();
                    if (currentBlock > lastBlock) {
                        const logs = await client.getLogs({
                            address: getAddress(tokenAddress),
                            event: transferEvent,
                            fromBlock: lastBlock + 1n,
                            toBlock: currentBlock
                        });

                        if (logs.length > 0) {
                            console.log(`📡 Token Events: Polled ${logs.length} new Transfer event(s) for ${tokenAddress}`);
                            await processTokenLogs(logs, tokenAddress);
                        }
                        lastBlock = currentBlock;
                    }
                } catch (error) {
                    console.error(`❌ Token Events: Poll error for ${tokenAddress}:`, error.message);
                }
            }, 5000);

            unwatch = () => clearInterval(pollInterval);
        }

        activeWatchers.set(tokenAddress.toLowerCase(), unwatch);
        console.log(`✅ Token Events: Successfully started watching ${tokenAddress}`);

    } catch (error) {
        console.error(`❌ Token Events: Failed to start watching ${tokenAddress}:`, error);
    }
}

/**
 * Process Transfer event logs
 * @param {Array} logs - Array of Transfer event logs  
 * @param {string} tokenAddress - The token contract address
 */
async function processTokenLogs(logs, tokenAddress) {
    for (const log of logs) {
        try {
            const callback = eventCallbacks.get('Transfer');
            if (callback) {
                const event = {
                    args: log.args,
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    logIndex: log.logIndex,
                    address: tokenAddress,
                    eventName: 'Transfer'
                };

                await callback(event);
            } else {
                console.log(`⚠️ Token Events: No handler for Transfer`);
            }
        } catch (error) {
            console.error(`❌ Token Events: Processing error for ${tokenAddress}:`, error.message);
        }
    }
}

// Function to stop watching a specific token
function stopWatchingToken(tokenAddress) {
    const unwatch = activeWatchers.get(tokenAddress.toLowerCase());
    if (unwatch) {
        unwatch();
        activeWatchers.delete(tokenAddress.toLowerCase());
        console.log(`🛑 Stopped watching token: ${tokenAddress}`);
    }
}

/**
 * Listen and process Transfer events from all active agent tokens
 */
async function listenAndProcessTokenEvents() {
    try {
        console.log('🚀 Token Events: Starting agent token event listeners...');

        // Get all active agents
        const activeAgents = await Agent.find({
            status: 'ACTIVE'
        }).select('tokenAddress uniqueId').lean();

        console.log(`📊 Token Events: Found ${activeAgents.length} active agents to monitor`);

        // Start watching each active token
        for (const agent of activeAgents) {
            if (agent.tokenAddress) {
                await startWatchingToken(agent.tokenAddress);
                // Add small delay to avoid overwhelming the RPC
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log('✅ Token Events: All active agent token listeners started');

        // Set up periodic refresh for new active agents
        setInterval(async () => {
            try {
                await refreshActiveTokenWatchers();
            } catch (error) {
                console.error('❌ Token Events: Error refreshing token watchers:', error);
            }
        }, 5 * 60 * 1000); // Check every 5 minutes

        return () => stopAllTokenWatchers();

    } catch (error) {
        console.error('❌ Token Events: Failed to start agent token event listeners:', error);
        throw error;
    }
}

// Function to refresh active token watchers
async function refreshActiveTokenWatchers() {
    try {
        const activeAgents = await Agent.find({
            status: 'ACTIVE'
        }).select('tokenAddress').lean();

        const currentActiveTokens = new Set(
            activeAgents
                .map(agent => agent.tokenAddress?.toLowerCase())
                .filter(Boolean)
        );

        // Start watching new tokens
        for (const tokenAddress of currentActiveTokens) {
            if (!activeWatchers.has(tokenAddress)) {
                await startWatchingToken(tokenAddress);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Stop watching tokens that are no longer active
        for (const tokenAddress of activeWatchers.keys()) {
            if (!currentActiveTokens.has(tokenAddress)) {
                stopWatchingToken(tokenAddress);
            }
        }

    } catch (error) {
        console.error('❌ Error refreshing active token watchers:', error);
    }
}

// Function to stop all token watchers
function stopAllTokenWatchers() {
    console.log('🛑 Stopping all agent token event listeners...');

    for (const [tokenAddress, unwatch] of activeWatchers.entries()) {
        try {
            unwatch();
            console.log(`✅ Stopped watching token: ${tokenAddress}`);
        } catch (error) {
            console.error(`❌ Error stopping watcher for ${tokenAddress}:`, error);
        }
    }

    activeWatchers.clear();
    console.log('✅ All agent token listeners stopped');
}

module.exports = {
    listenAndProcessTokenEvents,
    stopAllTokenWatchers,
    startWatchingToken,
    stopWatchingToken,
    eventCallbacks
};
