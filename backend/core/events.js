const { createPublicClient, webSocket, getAddress, getEventSelector, http } = require('viem');
const { sei, seiTestnet } = require('viem/chains');
const Agent = require('./models/agents');
const config = require('../config');

// Create viem client based on environment
const chain = config.chainMode === 'mainnet' ? sei : seiTestnet;

// Try WebSocket first, fallback to HTTP
let client;
try {
    client = createPublicClient({
        chain,
        // transport: webSocket(config.rpcUrls[config.chainMode].webSocket)
        transport: http(config.rpcUrls[config.chainMode].http)
    });
    console.log('✅ Using WebSocket transport for real-time events');
} catch (error) {
    console.warn('⚠️ WebSocket transport failed, falling back to HTTP');
    const { http } = require('viem');
    client = createPublicClient({
        chain,
        transport: http(config.rpcUrls[config.chainMode].http)
    });
}

// Event name to callback mapping
const eventCallbacks = new Map();

// ModulsDeployer contract ABI for events
// Using the exact ABI from the contract
const MODULS_DEPLOYER_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "initialSupply",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "agentWallet",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "salesManager",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint8",
                "name": "taxPercent",
                "type": "uint8"
            },
            {
                "indexed": false,
                "internalType": "uint8",
                "name": "agentSplit",
                "type": "uint8"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "intentId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "metadataURI",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "creator",
                "type": "address"
            }
        ],
        "name": "ModulsTokenCreated",
        "type": "event"
    }
];

// Register ModulsTokenCreated event callback
eventCallbacks.set('ModulsTokenCreated', async (event) => {
    try {
        console.log('Processing ModulsTokenCreated event:', event);

        const {
            tokenAddress,
            name,
            symbol,
            initialSupply,
            agentWallet,
            salesManager,
            taxPercent,
            agentSplit,
            intentId,
            metadataURI,
            creator,
            blockNumber,
            transactionHash
        } = event.args;

        // Find the corresponding agent by intentId
        const agent = await Agent.findOne({ intentId: Number(intentId) });

        if (!agent) {
            console.log(`Agent not found for intentId: ${intentId}`);
            return;
        }

        if (agent.status === 'ACTIVE') {
            console.log(`Agent ${agent.uniqueId} is already active`);
            return;
        }

        // Update agent with token deployment data
        agent.status = 'ACTIVE';
        agent.tokenAddress = getAddress(tokenAddress);
        agent.deploymentBlock = Number(blockNumber);
        agent.tokenSymbol = symbol;

        // Store additional data in a metadata field or log it
        console.log(`Token deployment details:`);
        console.log(`  Name: ${name}`);
        console.log(`  Initial Supply: ${initialSupply}`);
        console.log(`  Agent Wallet: ${agentWallet}`);
        console.log(`  Sales Manager: ${salesManager}`);
        console.log(`  Tax Percent: ${taxPercent}`);
        console.log(`  Agent Split: ${agentSplit}`);
        console.log(`  Metadata URI: ${metadataURI}`);
        console.log(`  Creator: ${creator}`);

        await agent.save();

        console.log(`✅ Agent ${agent.uniqueId} activated with token ${tokenAddress}`);
        console.log(`   Token: ${name} (${symbol})`);
        console.log(`   Initial Supply: ${initialSupply}`);
        console.log(`   Block: ${blockNumber}`);
        console.log(`   Transaction: ${transactionHash}`);

    } catch (error) {
        console.error('Error processing ModulsTokenCreated event:', error);
    }
});

/**
 * Listen and process on-chain events from ModulsDeployer contract
 * @param {string} contractAddress - The ModulsDeployer contract address
 * @param {number} fromBlock - Starting block number (optional)
 */
async function listenAndProcessOnchainEvents(contractAddress, fromBlock = 'latest') {
    try {
        console.log(`🎧 Starting event listener for ModulsDeployer at ${contractAddress}`);
        console.log(`   Chain: ${chain.name} (${chain.id})`);
        console.log(`   From block: ${fromBlock}`);
        console.log(`   Registered events: ${Array.from(eventCallbacks.keys()).join(', ')}`);

        // Log the event signature for debugging
        const eventSignature = getEventSelector(MODULS_DEPLOYER_ABI[0]);
        console.log(`   Event signature: ${eventSignature}`);

        // First, try to get any recent events that might have been missed
        try {
            const recentLogs = await client.getLogs({
                address: getAddress(contractAddress),
                event: MODULS_DEPLOYER_ABI[0],
                fromBlock: fromBlock === 'latest' ? 'latest' : BigInt(fromBlock),
                toBlock: 'latest'
            });

            if (recentLogs.length > 0) {
                console.log(`📡 Found ${recentLogs.length} recent ModulsTokenCreated event(s)`);
                await processLogs(recentLogs);
            } else {
                console.log('⚠️ No recent ModulsTokenCreated event(s) found');
            }
        } catch (error) {
            console.warn('⚠️ Could not fetch recent logs:', error.message);
        }

        // Watch for new ModulsTokenCreated events
        let unwatch;
        try {
            unwatch = client.watchEvent({
                address: getAddress(contractAddress),
                event: MODULS_DEPLOYER_ABI[0], // ModulsTokenCreated event
                onLogs: async (logs) => {
                    console.log(`📡 Received ${logs.length} new ModulsTokenCreated event(s)`);
                    await processLogs(logs);
                },
                onError: (error) => {
                    console.error('❌ Event listener error:', error);
                }
            });
        } catch (error) {
            console.error('❌ Failed to start watchEvent:', error);
            console.log('⚠️ Falling back to polling mode...');

            // Fallback to polling if watchEvent fails
            let lastBlock = await client.getBlockNumber();
            const pollInterval = setInterval(async () => {
                try {
                    const currentBlock = await client.getBlockNumber();
                    if (currentBlock > lastBlock) {
                        const logs = await client.getLogs({
                            address: getAddress(contractAddress),
                            event: MODULS_DEPLOYER_ABI[0],
                            fromBlock: lastBlock + 1n,
                            toBlock: currentBlock
                        });

                        if (logs.length > 0) {
                            console.log(`📡 Found ${logs.length} new ModulsTokenCreated event(s) via polling`);
                            await processLogs(logs);
                        }
                        lastBlock = currentBlock;
                    }
                } catch (error) {
                    console.error('❌ Polling error:', error);
                }
            }, 5000); // Poll every 5 seconds

            unwatch = () => clearInterval(pollInterval);
        }

        console.log('✅ Event listener started successfully');

        // Return the unwatch function for cleanup
        return unwatch;

    } catch (error) {
        console.error('❌ Failed to start event listener:', error);
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
            console.log('Raw log:', JSON.stringify(log, null, 2));

            // Parse the event data - log.args contains the decoded parameters
            const event = {
                args: {
                    tokenAddress: log.args.tokenAddress,
                    intentId: log.args.intentId,
                    creator: log.args.creator,
                    name: log.args.name,
                    symbol: log.args.symbol,
                    initialSupply: log.args.initialSupply,
                    agentWallet: log.args.agentWallet,
                    salesManager: log.args.salesManager,
                    taxPercent: log.args.taxPercent,
                    agentSplit: log.args.agentSplit,
                    metadataURI: log.args.metadataURI
                },
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                logIndex: log.logIndex,
                address: log.address
            };

            console.log('Parsed event:', JSON.stringify(event, null, 2));

            // Get the callback for this event
            const callback = eventCallbacks.get('ModulsTokenCreated');
            if (callback) {
                await callback(event);
            } else {
                console.warn('No callback registered for ModulsTokenCreated event');
            }
        } catch (error) {
            console.error('Error processing event log:', error);
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
    console.log(`✅ Registered callback for event: ${eventName}`);
}

/**
 * Remove an event callback
 * @param {string} eventName - The name of the event
 */
function removeEventCallback(eventName) {
    const removed = eventCallbacks.delete(eventName);
    if (removed) {
        console.log(`🗑️ Removed callback for event: ${eventName}`);
    } else {
        console.log(`⚠️ No callback found for event: ${eventName}`);
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
            console.log('🛑 Event listener stopped');
        }
    } catch (error) {
        console.error('❌ Error stopping event listener:', error);
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
