const { createPublicClient, http, getAddress } = require('viem');
const { seiMainnet, seiTestnet } = require('viem/chains');
const Agent = require('./models/agents');
const config = require('../config');



// Create viem client based on environment
const chain = config.chainMode === 'mainnet' ? seiMainnet : seiTestnet;
const client = createPublicClient({
    chain,
    transport: http(config.rpcUrls[config.chainMode].http)
});

// Event name to callback mapping
const eventCallbacks = new Map();

// ModulsDeployer contract ABI for events
const MODULS_DEPLOYER_ABI = [
    {
        type: 'event',
        name: 'ModulsTokenCreated',
        inputs: [
            { type: 'address', name: 'tokenAddress', indexed: true },
            { type: 'string', name: 'name', indexed: false },
            { type: 'string', name: 'symbol', indexed: false },
            { type: 'uint256', name: 'initialSupply', indexed: false },
            { type: 'address', name: 'agentWallet', indexed: false },
            { type: 'address', name: 'salesManager', indexed: false },
            { type: 'uint8', name: 'taxPercent', indexed: false },
            { type: 'uint8', name: 'agentSplit', indexed: false },
            { type: 'uint256', name: 'intentId', indexed: true },
            { type: 'string', name: 'metadataURI', indexed: false },
            { type: 'address', name: 'creator', indexed: true }
        ]
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

        // Watch for ModulsTokenCreated events
        const unwatch = client.watchEvent({
            address: getAddress(contractAddress),
            event: MODULS_DEPLOYER_ABI[0], // ModulsTokenCreated event
            onLogs: async (logs) => {
                console.log(`📡 Received ${logs.length} ModulsTokenCreated event(s)`);

                for (const log of logs) {
                    try {
                        // Parse the event data
                        const event = {
                            args: log.args,
                            blockNumber: log.blockNumber,
                            transactionHash: log.transactionHash,
                            logIndex: log.logIndex,
                            address: log.address
                        };

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
            },
            onError: (error) => {
                console.error('❌ Event listener error:', error);
            }
        });

        console.log('✅ Event listener started successfully');

        // Return the unwatch function for cleanup
        return unwatch;

    } catch (error) {
        console.error('❌ Failed to start event listener:', error);
        throw error;
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
