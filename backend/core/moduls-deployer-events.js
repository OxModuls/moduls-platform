const { createPublicClient, webSocket, getAddress, getEventSelector, http } = require('viem');
const { sei, seiTestnet } = require('viem/chains');
const Agent = require('./models/agents');
const config = require('../config');
const ModulsDeployerAbi = require('./abi/ModulsDeployer.json');

// Extract all events from the ABI
const contractEvents = ModulsDeployerAbi.filter(item => item.type === 'event');
console.log(`📋 Available events in ModulsDeployer ABI: ${contractEvents.map(e => e.name).join(', ')}`);

// Create viem client based on environment
const chain = config.chainMode === 'mainnet' ? sei : seiTestnet;

// Try WebSocket first, fallback to HTTP
let client;
try {
    client = createPublicClient({
        chain,
        transport: webSocket(config.rpcUrls[config.chainMode].webSocket)
    });
    console.log(`🎧 Events: WebSocket connected (${chain.name})`);
} catch (error) {
    console.log('⚠️ Events: WebSocket failed, using HTTP transport');
    const { http } = require('viem');
    client = createPublicClient({
        chain,
        transport: http(config.rpcUrls[config.chainMode].http)
    });
}

// Event name to callback mapping
const eventCallbacks = new Map();



// Register ModulsTokenCreated event callback
eventCallbacks.set('ModulsTokenCreated', async (event) => {
    try {
        const { tokenAddress, name, symbol, intentId, launchDate } = event.args;
        const { blockNumber, transactionHash } = event;

        // Find the corresponding agent by intentId
        const agent = await Agent.findOne({ intentId: Number(intentId) });

        if (!agent) {
            console.log(`⚠️ Token deployed but no agent found for intentId: ${intentId}`);
            return;
        }

        if (agent.status === 'ACTIVE') {
            console.log(`⚠️ Agent ${agent.uniqueId} already active`);
            return;
        }

        // Update agent with token deployment data
        agent.status = 'ACTIVE';
        agent.tokenAddress = getAddress(tokenAddress);
        agent.tokenSymbol = symbol;

        // Safely convert blockNumber to number
        const deploymentBlockNumber = blockNumber ? Number(blockNumber) : 0;
        if (isNaN(deploymentBlockNumber)) {
            console.warn(`⚠️ Invalid blockNumber: ${blockNumber}, using 0`);
            agent.deploymentBlock = 0;
        } else {
            agent.deploymentBlock = deploymentBlockNumber;
        }

        await agent.save();

        const launchStatus = launchDate === 0n ? 'immediate' : new Date(Number(launchDate) * 1000).toISOString();
        console.log(`✅ Agent activated: ${agent.uniqueId} | Token: ${name} (${symbol}) | Launch: ${launchStatus}`);

    } catch (error) {
        console.error('❌ ModulsTokenCreated error:', error.message);
    }
});

/**
 * Listen and process on-chain events from ModulsDeployer contract
 * @param {string} contractAddress - The ModulsDeployer contract address
 * @param {number} fromBlock - Starting block number (optional)
 */
async function listenAndProcessOnchainEvents(contractAddress, fromBlock = 'latest') {
    try {
        console.log(`🎧 Events: Listening to ${contractAddress} on ${chain.name}`);

        // First, try to get any recent events that might have been missed
        try {
            let scanFromBlock;
            const currentBlock = await client.getBlockNumber();

            if (fromBlock === 'latest') {
                scanFromBlock = currentBlock - 2000n;
                console.log(`📡 Scanning last 2000 blocks (from ${scanFromBlock} to ${currentBlock})`);
            } else {
                scanFromBlock = BigInt(fromBlock);
                console.log(`📡 Scanning from specified block: ${scanFromBlock}`);
            }

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
                        address: getAddress(contractAddress),
                        events: contractEvents,
                        fromBlock: currentFromBlock,
                        toBlock: currentToBlock
                    });

                    allLogs.push(...chunkLogs);
                } catch (chunkError) {
                    console.warn(`⚠️ Events: Chunk scan failed (${currentFromBlock}-${currentToBlock}):`, chunkError.message);
                }

                currentFromBlock = currentToBlock + 1n;
            }

            if (allLogs.length > 0) {
                console.log(`📡 Events: Processing ${allLogs.length} recent events`);
                await processLogs(allLogs);
            }
        } catch (error) {
            console.warn('⚠️ Events: Recent scan failed:', error.message);
        }

        // Watch for new events from the contract
        let unwatch;
        try {
            unwatch = client.watchEvent({
                address: getAddress(contractAddress),
                events: contractEvents,
                onLogs: async (logs) => {
                    if (logs.length > 0) {
                        console.log(`📡 Events: Received ${logs.length} new event(s)`);
                        await processLogs(logs);
                    }
                },
                onError: (error) => {
                    console.error('❌ Events: Watch error:', error.message);
                }
            });
        } catch (error) {
            console.log('⚠️ Events: WebSocket watch failed, using polling');

            // Fallback to polling if watchEvent fails
            let lastBlock = await client.getBlockNumber();
            const pollInterval = setInterval(async () => {
                try {
                    const currentBlock = await client.getBlockNumber();
                    if (currentBlock > lastBlock) {
                        const logs = await client.getLogs({
                            address: getAddress(contractAddress),
                            events: contractEvents,
                            fromBlock: lastBlock + 1n,
                            toBlock: currentBlock
                        });

                        if (logs.length > 0) {
                            console.log(`📡 Events: Polled ${logs.length} new event(s)`);
                            await processLogs(logs);
                        }
                        lastBlock = currentBlock;
                    }
                } catch (error) {
                    console.error('❌ Events: Poll error:', error.message);
                }
            }, 5000);

            unwatch = () => clearInterval(pollInterval);
        }

        console.log('✅ Events: Listener active');
        return unwatch;

    } catch (error) {
        console.error('❌ Events: Failed to start listener:', error.message);
        throw error;
    }
}


/**
 * Process event logs
 * @param {Array} logs - Array of event logs
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
                console.log(`⚠️ Events: No handler for ${eventName}`);
            }
        } catch (error) {
            console.error('❌ Events: Processing error:', error.message);
        }
    }
}

/**
 * Register a new event callback
 * @param {string} eventName - The name of the event
 * @param {Function} callback - The callback function to execute when event is received
 */
function registerEventCallback(eventName, callback) {
    if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
    }

    eventCallbacks.set(eventName, callback);
    console.log(`✅ Events: Registered ${eventName} handler`);
}

/**
 * Remove an event callback
 * @param {string} eventName - The name of the event
 */
function removeEventCallback(eventName) {
    const removed = eventCallbacks.delete(eventName);
    if (removed) {
        console.log(`🗑️ Events: Removed ${eventName} handler`);
    } else {
        console.log(`⚠️ Events: No handler found for ${eventName}`);
    }
}

/**
 * Get all registered event names
 * @returns {string[]} Array of registered event names
 */
function getRegisteredEvents() {
    return Array.from(eventCallbacks.keys());
}

/**
 * Stop listening for events
 * @param {Function} unwatch - The unwatch function returned from listenAndProcessOnchainEvents
 */
async function stopEventListening(unwatch) {
    try {
        if (typeof unwatch === 'function') {
            unwatch();
            console.log('🛑 Events: Listener stopped');
        }
    } catch (error) {
        console.error('❌ Events: Stop error:', error.message);
    }
}

module.exports = {
    listenAndProcessOnchainEvents,
    registerEventCallback,
    removeEventCallback,
    getRegisteredEvents,
    stopEventListening,
    eventCallbacks
};
