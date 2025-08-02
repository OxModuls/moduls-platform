const { createPublicClient, http, parseAbiItem, getAddress } = require('viem');
const { watchContractEvent, getBlockNumber } = require('viem/actions');
const { mainnet } = require('viem/chains');
const { db } = require('../db');
const HolderBalance = require('./models/holder-balance');
const TokenEvent = require('./models/token-event');
const { ZERO_ADDRESS, INDEXER_CONFIG } = require('./constants');
const { chainMode, contractAddresses, rpcUrls } = require("../../config");
const ModulsDeployerAbi = require('../abi/ModulsDeployer.json');

class IndexerService {
    constructor() {
        // Prevent multiple instances
        if (IndexerService.instance) {
            return IndexerService.instance;
        }

        // SEI Mainnet settings
        const seiMainnet = {
            ...mainnet,
            id: 1329,
            name: "Sei Mainnet",
            rpcUrls: {
                default: {
                    http: [rpcUrls.mainnet.http],
                    webSocket: [rpcUrls.mainnet.webSocket]
                },
            },
        };

        // SEI Testnet settings
        const seiTestnet = {
            ...mainnet,
            id: 1328,
            name: "Sei Testnet",
            rpcUrls: {
                default: {
                    http: [rpcUrls.testnet.http],
                    webSocket: [rpcUrls.testnet.webSocket]
                },
            },
        };

        // Create client based on chain mode
        const chain = chainMode === 'mainnet' ? seiMainnet : seiTestnet;
        this.client = createPublicClient({
            chain: chain,
            transport: http(chain.rpcUrls.default.http[0]),
        });

        this.watchedTokens = new Map(); // tokenAddress -> { lastBlock, balances }
        this.isRunning = false;

        // Contract watching state
        this.modulsDeployerAddress = this.getModulsDeployerAddress();
        this.contractWatcher = null;
        this.isContractWatching = false;
        this.healthCheckInterval = null;

        // Store the instance
        IndexerService.instance = this;
    }

    /**
     * Start the indexer service
     */
    async start() {
        if (this.isRunning) {
            console.log('Indexer is already running');
            return;
        }

        console.log('Starting indexer service...');
        this.isRunning = true;

        try {
            // Load existing tokens from database
            await this.loadExistingTokens();

            // Start watching events for all tokens
            await this.startEventWatching();

            // Start watching ModulsDeployer contract for new token deployments
            await this.startContractWatcher();

            // Start health check interval
            this.startHealthCheck();

            console.log('Indexer service started successfully');
        } catch (error) {
            console.error('Failed to start indexer service:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Stop the indexer service
     */
    async stop() {
        if (!this.isRunning) {
            console.log('Indexer is not running');
            return;
        }

        console.log('Stopping indexer service...');
        this.isRunning = false;

        // Stop contract watcher
        await this.stopContractWatcher();

        // Stop health check interval
        this.stopHealthCheck();

        // Clear all token watchers
        this.watchedTokens.clear();

        console.log('Indexer service stopped');
    }

    /**
     * Load existing tokens from database and initialize their tracking
     */
    async loadExistingTokens() {
        try {
            const Agent = require('../models/agents');
            const agents = await Agent.find({
                tokenAddress: { $exists: true, $ne: null }
            });

            console.log(`Loading ${agents.length} existing tokens for indexing`);

            for (const agent of agents) {
                if (agent.tokenAddress) {
                    await this.addTokenToWatch(agent.tokenAddress, agent.uniqueId);
                }
            }
        } catch (error) {
            console.error('Error loading existing tokens:', error);
            throw error;
        }
    }

    /**
     * Add a new token to watch for events
     */
    async addTokenToWatch(tokenAddress, agentId) {
        const normalizedAddress = getAddress(tokenAddress);

        if (this.watchedTokens.has(normalizedAddress)) {
            console.log(`Token ${normalizedAddress} is already being watched`);
            return;
        }

        console.log(`Adding token ${normalizedAddress} to watch list`);

        try {
            // Initialize token tracking
            const tokenData = {
                agentId,
                lastBlock: await this.getLatestBlockNumber(),
                balances: new Map(),
                isWatching: false
            };

            this.watchedTokens.set(normalizedAddress, tokenData);

            // Backfill historical data
            await this.backfillTokenData(normalizedAddress);

            // Start watching events
            await this.startWatchingToken(normalizedAddress);

        } catch (error) {
            console.error(`Error adding token ${normalizedAddress} to watch:`, error);
            throw error;
        }
    }

    /**
     * Remove a token from watching
     */
    async removeTokenFromWatch(tokenAddress) {
        const normalizedAddress = getAddress(tokenAddress);

        if (!this.watchedTokens.has(normalizedAddress)) {
            console.log(`Token ${normalizedAddress} is not being watched`);
            return;
        }

        console.log(`Removing token ${normalizedAddress} from watch list`);

        const tokenData = this.watchedTokens.get(normalizedAddress);
        if (tokenData.isWatching) {
            // Stop watching events (viem will handle cleanup)
            tokenData.isWatching = false;
        }

        this.watchedTokens.delete(normalizedAddress);
    }

    /**
 * Backfill historical transfer data for a token
 */
    async backfillTokenData(tokenAddress) {
        const normalizedAddress = getAddress(tokenAddress);
        const tokenData = this.watchedTokens.get(normalizedAddress);

        if (!tokenData) {
            throw new Error(`Token ${normalizedAddress} not found in watched tokens`);
        }

        console.log(`Backfilling data for token ${normalizedAddress}`);

        try {
            // Get deployment block
            const deploymentBlock = await this.getTokenDeploymentBlock(normalizedAddress);
            const latestBlock = await this.getLatestBlockNumber();

            // If deployment block is 0 (genesis), use batch processing to be safe
            if (deploymentBlock === 0n) {
                console.log(`Token ${normalizedAddress} deployment block is 0, using batch processing from recent blocks`);
                const recentBlock = latestBlock - BigInt(INDEXER_CONFIG.BLOCK_RANGE_LIMIT);
                await this.backfillTokenDataInBatches(normalizedAddress, recentBlock, latestBlock);
            }
            // Check if we need to backfill (if deployment block is too far back)
            // Use BLOCK_RANGE_LIMIT as the limit to be safe (RPC counts range as inclusive)
            else if (latestBlock - deploymentBlock > BigInt(INDEXER_CONFIG.BLOCK_RANGE_LIMIT)) {
                console.log(`Token ${normalizedAddress} has ${latestBlock - deploymentBlock} blocks to process, using batch processing`);
                await this.backfillTokenDataInBatches(normalizedAddress, deploymentBlock, latestBlock);
            } else {
                // Get all transfer events since deployment (within 9,999 block limit)
                const logs = await this.client.getLogs({
                    address: normalizedAddress,
                    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
                    fromBlock: deploymentBlock,
                    toBlock: 'latest',
                });

                console.log(`Found ${logs.length} transfer events for backfill`);

                // Process all transfer events
                for (const log of logs) {
                    await this.handleTransferEvent(normalizedAddress, log);
                }
            }

            // Save initial balances to database
            await this.saveBalancesToDatabase(normalizedAddress);

        } catch (error) {
            console.error(`Error backfilling data for token ${normalizedAddress}:`, error);
            throw error;
        }
    }

    /**
     * Backfill token data in batches to handle RPC limitations
     */
    async backfillTokenDataInBatches(tokenAddress, fromBlock, toBlock) {
        const normalizedAddress = getAddress(tokenAddress);
        const BATCH_SIZE = BigInt(INDEXER_CONFIG.BLOCK_RANGE_LIMIT); // RPC limit (use 2000 to be safe)
        const DELAY_BETWEEN_BATCHES = INDEXER_CONFIG.DELAY_BETWEEN_BATCHES; // Delay between batches

        let currentFromBlock = fromBlock;
        let totalEvents = 0;
        let batchCount = 0;

        console.log(`Starting batch backfill for token ${normalizedAddress} from block ${fromBlock} to ${toBlock}`);

        while (currentFromBlock < toBlock) {
            const currentToBlock = currentFromBlock + BATCH_SIZE > toBlock ? toBlock : currentFromBlock + BATCH_SIZE;

            try {
                console.log(`Processing batch ${++batchCount}: blocks ${currentFromBlock} to ${currentToBlock}`);

                const logs = await this.client.getLogs({
                    address: normalizedAddress,
                    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
                    fromBlock: currentFromBlock,
                    toBlock: currentToBlock,
                });

                console.log(`Batch ${batchCount}: Found ${logs.length} transfer events`);

                // Process all transfer events in this batch
                for (const log of logs) {
                    await this.handleTransferEvent(normalizedAddress, log);
                }

                totalEvents += logs.length;
                currentFromBlock = currentToBlock + 1n;

                // Add delay between batches to avoid rate limiting
                if (currentFromBlock < toBlock) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
                }

            } catch (error) {
                console.error(`Error processing batch ${batchCount} for token ${normalizedAddress}:`, error);

                // If it's a range error, try with a smaller batch
                if (error.message.includes('eth_getLogs is limited to a') ||
                    error.message.includes('block range too large') ||
                    error.message.includes('maximum allowed is') ||
                    error.message.includes('range too large')) {
                    console.log(`Reducing batch size for token ${normalizedAddress}`);
                    const smallerBatchSize = BATCH_SIZE / 2n;
                    const currentToBlock = currentFromBlock + smallerBatchSize > toBlock ? toBlock : currentFromBlock + smallerBatchSize;

                    const logs = await this.client.getLogs({
                        address: normalizedAddress,
                        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
                        fromBlock: currentFromBlock,
                        toBlock: currentToBlock,
                    });

                    console.log(`Smaller batch: Found ${logs.length} transfer events`);

                    for (const log of logs) {
                        await this.handleTransferEvent(normalizedAddress, log);
                    }

                    totalEvents += logs.length;
                    currentFromBlock = currentToBlock + 1n;
                } else {
                    throw error;
                }
            }
        }

        console.log(`Completed batch backfill for token ${normalizedAddress}: ${totalEvents} total events processed in ${batchCount} batches`);
    }

    /**
     * Start watching events for a specific token
     */
    async startWatchingToken(tokenAddress) {
        const normalizedAddress = getAddress(tokenAddress);
        const tokenData = this.watchedTokens.get(normalizedAddress);

        if (!tokenData || tokenData.isWatching) {
            return;
        }

        console.log(`Starting event watching for token ${normalizedAddress}`);

        try {
            // Watch for Transfer events with error handling
            const unwatch = this.client.watchEvent({
                address: normalizedAddress,
                event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
                onLogs: (logs) => {
                    for (const log of logs) {
                        this.handleTransferEvent(normalizedAddress, log).catch(error => {
                            console.error(`Error handling transfer event for ${normalizedAddress}:`, error);
                        });
                    }
                },
                onError: (error) => {
                    console.error(`Error in event watcher for token ${normalizedAddress}:`, error);

                    // Handle filter does not exist error by restarting the watcher
                    if (error.message.includes('filter does not exist') ||
                        error.message.includes('Filter not found') ||
                        error.code === -32000) {
                        console.log(`Restarting event watcher for token ${normalizedAddress} due to filter error`);
                        this.restartTokenWatcher(normalizedAddress);
                    }
                },
                pollingInterval: 2_000, // Poll every 2 seconds instead of WebSocket
            });

            // Store unwatch function for cleanup
            tokenData.unwatch = unwatch;
            tokenData.isWatching = true;

        } catch (error) {
            console.error(`Error starting event watching for token ${normalizedAddress}:`, error);
            throw error;
        }
    }

    /**
     * Restart event watcher for a specific token
     */
    async restartTokenWatcher(tokenAddress) {
        const normalizedAddress = getAddress(tokenAddress);
        const tokenData = this.watchedTokens.get(normalizedAddress);

        if (!tokenData) {
            console.warn(`Token ${normalizedAddress} not found for restart`);
            return;
        }

        try {
            // Stop current watcher
            if (tokenData.unwatch) {
                try {
                    tokenData.unwatch();
                } catch (error) {
                    console.warn(`Error stopping watcher for ${normalizedAddress}:`, error);
                }
            }

            tokenData.isWatching = false;
            tokenData.unwatch = null;

            // Wait a bit before restarting
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Restart watcher
            await this.startWatchingToken(normalizedAddress);
            console.log(`Successfully restarted event watcher for token ${normalizedAddress}`);

        } catch (error) {
            console.error(`Error restarting event watcher for token ${normalizedAddress}:`, error);
            // Mark as not watching so it can be retried later
            tokenData.isWatching = false;
        }
    }

    /**
     * Handle a transfer event and update balances
     */
    async handleTransferEvent(tokenAddress, log) {
        const { from, to, value } = log.args;

        // Skip if both addresses are zero (shouldn't happen but safety check)
        if (from === ZERO_ADDRESS && to === ZERO_ADDRESS) {
            return;
        }

        const tokenData = this.watchedTokens.get(tokenAddress);
        if (!tokenData) {
            console.warn(`Token ${tokenAddress} not found in watched tokens`);
            return;
        }

        // Update balances in memory
        if (from !== ZERO_ADDRESS) {
            const currentBalance = tokenData.balances.get(from) || 0n;
            const newBalance = currentBalance - value;

            if (newBalance <= 0n) {
                // Remove address if balance is zero or negative
                tokenData.balances.delete(from);
            } else {
                tokenData.balances.set(from, newBalance);
            }
        }

        if (to !== ZERO_ADDRESS) {
            const currentBalance = tokenData.balances.get(to) || 0n;
            const newBalance = currentBalance + value;
            tokenData.balances.set(to, newBalance);
        }

        // Save event to database
        await this.saveEventToDatabase(tokenAddress, log);

        // Save balances to database on every event
        await this.saveBalancesToDatabase(tokenAddress);
    }

    /**
     * Save transfer event to database
     */
    async saveEventToDatabase(tokenAddress, log) {
        try {
            // Check if event already exists
            const existingEvent = await TokenEvent.eventExists(log.transactionHash, Number(log.logIndex));
            if (existingEvent) {
                console.log(`Event already exists: ${log.transactionHash}:${log.logIndex}, skipping`);
                return;
            }

            const event = new TokenEvent({
                tokenAddress: getAddress(tokenAddress),
                from: getAddress(log.args.from),
                to: getAddress(log.args.to),
                value: log.args.value.toString(),
                blockNumber: Number(log.blockNumber),
                transactionHash: log.transactionHash,
                logIndex: Number(log.logIndex),
                timestamp: new Date(),
            });

            await event.save();
        } catch (error) {
            // Handle duplicate key error gracefully
            if (error.code === 11000) {
                console.log(`Duplicate event detected: ${log.transactionHash}:${log.logIndex}, skipping`);
                return;
            }
            console.error('Error saving event to database:', error);
        }
    }

    /**
     * Save current balances to database
     */
    async saveBalancesToDatabase(tokenAddress) {
        const normalizedAddress = getAddress(tokenAddress);
        const tokenData = this.watchedTokens.get(normalizedAddress);

        if (!tokenData) {
            return;
        }

        try {
            // Clear existing balances for this token
            await HolderBalance.deleteMany({ tokenAddress: normalizedAddress });

            // Save new balances (filter out zero and negative balances)
            const balanceDocuments = Array.from(tokenData.balances.entries())
                .filter(([address, balance]) => balance > 0n) // Only save positive balances
                .map(([address, balance]) => ({
                    tokenAddress: normalizedAddress,
                    holderAddress: getAddress(address),
                    balance: balance.toString(),
                    lastUpdated: new Date(),
                }));

            if (balanceDocuments.length > 0) {
                await HolderBalance.insertMany(balanceDocuments);
            }

        } catch (error) {
            console.error('Error saving balances to database:', error);
        }
    }

    /**
     * Get holder balances for a token
     */
    async getHolderBalances(tokenAddress) {
        const normalizedAddress = getAddress(tokenAddress);

        try {
            const balances = await HolderBalance.find({
                tokenAddress: normalizedAddress
            }).sort({ balance: -1 });

            return balances.map(balance => ({
                holderAddress: balance.holderAddress,
                balance: balance.balance,
                lastUpdated: balance.lastUpdated,
            }));
        } catch (error) {
            console.error('Error getting holder balances:', error);
            throw error;
        }
    }

    /**
     * Get holder count for a token
     */
    async getHolderCount(tokenAddress) {
        const normalizedAddress = getAddress(tokenAddress);

        try {
            return await HolderBalance.countDocuments({
                tokenAddress: normalizedAddress
            });
        } catch (error) {
            console.error('Error getting holder count:', error);
            throw error;
        }
    }

    /**
     * Get latest block number
     */
    async getLatestBlockNumber() {
        try {
            return await this.client.getBlockNumber();
        } catch (error) {
            console.error('Error getting latest block number:', error);
            throw error;
        }
    }

    /**
 * Get token deployment block from agent model
 */
    async getTokenDeploymentBlock(tokenAddress) {
        try {
            const Agent = require('../models/agents');
            const agent = await Agent.findOne({ tokenAddress });

            if (agent && agent.deploymentBlock) {
                return BigInt(agent.deploymentBlock);
            }

            // Fallback to a reasonable default if not found
            return 0n; // Start from genesis
        } catch (error) {
            console.error('Error getting deployment block:', error);
            return 0n; // Start from genesis
        }
    }

    /**
     * Manually backfill token data from a specific block range
     */
    async backfillTokenDataFromRange(tokenAddress, fromBlock, toBlock) {
        const normalizedAddress = getAddress(tokenAddress);

        if (!this.watchedTokens.has(normalizedAddress)) {
            throw new Error(`Token ${normalizedAddress} is not being watched`);
        }

        console.log(`Manual backfill for token ${normalizedAddress} from block ${fromBlock} to ${toBlock}`);

        try {
            const fromBlockBigInt = BigInt(fromBlock);
            const toBlockBigInt = BigInt(toBlock);

            // Always use batch processing for manual backfill to be safe
            await this.backfillTokenDataInBatches(normalizedAddress, fromBlockBigInt, toBlockBigInt);

            // Save balances to database
            await this.saveBalancesToDatabase(normalizedAddress);

            console.log(`Manual backfill completed for token ${normalizedAddress}`);

        } catch (error) {
            console.error(`Error in manual backfill for token ${normalizedAddress}:`, error);
            throw error;
        }
    }

    /**
     * Start watching events for all tokens
     */
    async startEventWatching() {
        for (const [tokenAddress, tokenData] of this.watchedTokens) {
            if (!tokenData.isWatching) {
                await this.startWatchingToken(tokenAddress);
            }
        }
    }

    /**
     * Get ModulsDeployer address based on chain mode
     */
    getModulsDeployerAddress() {
        if (chainMode === 'mainnet') {
            return contractAddresses.mainnet.modulsDeployer;
        } else {
            return contractAddresses.testnet.modulsDeployer;
        }
    }

    /**
     * Get current chain information
     */
    getChainInfo() {
        return {
            mode: chainMode,
            chainId: chainMode === 'mainnet' ? 1329 : 1328,
            name: chainMode === 'mainnet' ? 'Sei Mainnet' : 'Sei Testnet',
            rpcUrl: chainMode === 'mainnet' ? rpcUrls.mainnet.http : rpcUrls.testnet.http
        };
    }

    /**
     * Start watching ModulsDeployer contract for new token deployments
     */
    async startContractWatcher() {
        if (this.isContractWatching) {
            console.log('Contract watcher is already running');
            return;
        }

        try {
            console.log(`Starting contract watcher for ${this.modulsDeployerAddress}`);

            const lastBlock = await getBlockNumber(this.client);

            this.contractWatcher = watchContractEvent(this.client, {
                address: this.modulsDeployerAddress,
                abi: ModulsDeployerAbi,
                onLogs: (logs) => this.handleContractLogs(logs),
                batch: false,
                onError: (error) => {
                    console.error('Error watching contract event:', error);

                    // Handle filter does not exist error by restarting the contract watcher
                    if (error.message.includes('filter does not exist') ||
                        error.message.includes('Filter not found') ||
                        error.code === -32000) {
                        console.log('Restarting contract watcher due to filter error');
                        this.restartContractWatcher();
                    } else {
                        this.isContractWatching = false;
                    }
                },
                fromBlock: lastBlock - BigInt(100),
                pollingInterval: 2_000,
            });

            this.isContractWatching = true;
            console.log('Contract watcher started successfully');
        } catch (error) {
            console.error('Failed to start contract watcher:', error);
            this.isContractWatching = false;
            throw error;
        }
    }

    /**
     * Stop watching ModulsDeployer contract
     */
    async stopContractWatcher() {
        if (!this.isContractWatching || !this.contractWatcher) {
            return;
        }

        try {
            this.contractWatcher();
            this.contractWatcher = null;
            this.isContractWatching = false;
            console.log('Contract watcher stopped');
        } catch (error) {
            console.error('Error stopping contract watcher:', error);
        }
    }

    /**
     * Restart contract watcher
     */
    async restartContractWatcher() {
        try {
            console.log('Restarting contract watcher...');

            // Stop current watcher
            await this.stopContractWatcher();

            // Wait a bit before restarting
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Restart watcher
            await this.startContractWatcher();
            console.log('Contract watcher restarted successfully');

        } catch (error) {
            console.error('Error restarting contract watcher:', error);
            this.isContractWatching = false;
        }
    }

    /**
     * Start health check interval
     */
    startHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        // Run health check every 5 minutes
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                console.error('Error during health check:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes

        console.log('Health check interval started');
    }

    /**
     * Stop health check interval
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            console.log('Health check interval stopped');
        }
    }

    /**
     * Perform health check on all watchers
     */
    async performHealthCheck() {
        console.log('Performing health check...');

        // Check contract watcher
        if (!this.isContractWatching) {
            console.log('Contract watcher is down, restarting...');
            await this.startContractWatcher();
        }

        // Check token watchers
        for (const [tokenAddress, tokenData] of this.watchedTokens) {
            if (!tokenData.isWatching) {
                console.log(`Token watcher for ${tokenAddress} is down, restarting...`);
                await this.startWatchingToken(tokenAddress);
            }
        }

        console.log('Health check completed');
    }

    /**
     * Handle logs from ModulsDeployer contract
     */
    async handleContractLogs(logs) {
        console.log(`Received ${logs.length} logs from ModulsDeployer`);

        for (const log of logs) {
            try {
                if (log.eventName === "ModulsTokenCreated") {
                    const { tokenAddress, intentId } = log.args;

                    // Find corresponding agent
                    const Agent = require('../models/agents');
                    const correspondingAgent = await Agent.findOne({
                        intentId: Number(intentId)
                    });

                    if (correspondingAgent && correspondingAgent.status === "PENDING") {
                        // Update agent status and token address
                        correspondingAgent.status = "ACTIVE";
                        correspondingAgent.tokenAddress = tokenAddress;
                        correspondingAgent.deploymentBlock = Number(log.blockNumber);
                        await correspondingAgent.save();

                        console.log("Agent updated", correspondingAgent.uniqueId);

                        // Add token to indexer watch list
                        await this.addTokenToWatch(tokenAddress, correspondingAgent.uniqueId);
                        console.log(`Token ${tokenAddress} added to indexer for agent ${correspondingAgent.uniqueId}`);
                    } else {
                        console.log("Agent not found or already active", intentId);
                    }
                } else {
                    console.log("Unknown event", log.eventName);
                }
            } catch (error) {
                console.error('Error handling contract log:', error);
            }
        }
    }

    /**
     * Get indexer status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            watchedTokensCount: this.watchedTokens.size,
            watchedTokens: Array.from(this.watchedTokens.keys()),
            contractWatcher: {
                isWatching: this.isContractWatching,
                contractAddress: this.modulsDeployerAddress,
            },
            healthCheck: {
                isActive: this.healthCheckInterval !== null,
                interval: this.healthCheckInterval ? '5 minutes' : null
            },
            chain: this.getChainInfo(),
        };
    }

    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!IndexerService.instance) {
            IndexerService.instance = new IndexerService();
        }
        return IndexerService.instance;
    }

    /**
     * Reset singleton instance (for testing)
     */
    static resetInstance() {
        IndexerService.instance = null;
    }
}

module.exports = IndexerService; 