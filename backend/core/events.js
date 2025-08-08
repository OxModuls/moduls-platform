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
        // transport: http(config.rpcUrls[config.chainMode].http)
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
            launchDate
        } = event.args;

        const { blockNumber, transactionHash } = event;

        // Debug log the received values
        console.log(`🔍 Debug values received:`);
        console.log(`  blockNumber: ${blockNumber} (type: ${typeof blockNumber})`);
        console.log(`  transactionHash: ${transactionHash}`);
        console.log(`  intentId: ${intentId} (type: ${typeof intentId})`);

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

        // Safely convert blockNumber to number
        const deploymentBlockNumber = blockNumber ? Number(blockNumber) : 0;
        if (isNaN(deploymentBlockNumber)) {
            console.warn(`⚠️ Invalid blockNumber received: ${blockNumber}, using 0 as fallback`);
            agent.deploymentBlock = 0;
        } else {
            agent.deploymentBlock = deploymentBlockNumber;
        }

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
        console.log(`  Launch Date: ${launchDate} (${launchDate === 0n || launchDate === '0' ? 'Immediate' : new Date(Number(launchDate) * 1000).toISOString()})`);

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



        // First, try to get any recent events that might have been missed
        try {
            let scanFromBlock;
            const currentBlock = await client.getBlockNumber();

            if (fromBlock === 'latest') {
                // Get current block and scan from last 1500 blocks
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

                console.log(`📡 Scanning chunk: blocks ${currentFromBlock} to ${currentToBlock}`);

                try {
                    const chunkLogs = await client.getLogs({
                        address: getAddress(contractAddress),
                        events: contractEvents,
                        fromBlock: currentFromBlock,
                        toBlock: currentToBlock
                    });

                    allLogs.push(...chunkLogs);
                    console.log(`   Found ${chunkLogs.length} events in this chunk`);
                } catch (chunkError) {
                    console.warn(`⚠️ Failed to fetch chunk ${currentFromBlock} to ${currentToBlock}:`, chunkError.message);
                }

                currentFromBlock = currentToBlock + 1n;
            }

            if (allLogs.length > 0) {
                console.log(`📡 Found ${allLogs.length} total recent event(s) from contract`);
                await processLogs(allLogs);
            } else {
                console.log('⚠️ No recent events found from contract');
            }
        } catch (error) {
            console.warn('⚠️ Could not fetch recent logs:', error.message);
        }

        // Watch for new events from the contract
        let unwatch;
        try {
            unwatch = client.watchEvent({
                address: getAddress(contractAddress),
                events: contractEvents,
                onLogs: async (logs) => {
                    console.log(`📡 Received ${logs.length} new event(s) from contract`);
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
                            events: contractEvents,
                            fromBlock: lastBlock + 1n,
                            toBlock: currentBlock
                        });

                        if (logs.length > 0) {
                            console.log(`📡 Found ${logs.length} new event(s) via polling`);
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
 * Helper function to serialize objects with BigInt values
 * @param {*} value - Value to serialize
 * @returns {string} - JSON string with BigInt converted to string
 */
function serializeWithBigInt(value) {
    return JSON.stringify(value, (key, val) => {
        if (typeof val === 'bigint') {
            return val.toString();
        }
        return val;
    }, 2);
}

/**
 * Process event logs
 * @param {Array} logs - Array of event logs
 */
async function processLogs(logs) {
    for (const log of logs) {
        try {
            console.log('Raw log:', serializeWithBigInt(log));

            // Get the event name from the log
            const eventName = log.eventName;
            console.log(`Processing event: ${eventName}`);

            // Check if we have a callback for this event
            const callback = eventCallbacks.get(eventName);
            if (callback) {
                // Create standardized event object
                const event = {
                    args: log.args,
                    blockNumber: log.blockNumber,
                    transactionHash: log.transactionHash,
                    logIndex: log.logIndex,
                    address: log.address,
                    eventName: eventName
                };

                console.log('Parsed event:', serializeWithBigInt(event));
                await callback(event);
            } else {
                console.log(`⚠️ No callback registered for event: ${eventName} - skipping`);
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
