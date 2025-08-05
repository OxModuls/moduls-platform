const { getAddress } = require('viem');
const Agent = require('../models/agents');
const TokenHolder = require('../models/token-holder');
const TokenEvent = require('../models/token-event');
const WebhookManager = require('./webhook-manager');

class WebhookProvider {
    constructor() {
        this.isInitialized = false;
    }

    async initialize() {
        this.isInitialized = true;
    }

    async handleWebhook(webhookData) {
        throw new Error('handleWebhook must be implemented by provider');
    }

    validateWebhookSignature(webhookData) {
        throw new Error('validateWebhookSignature must be implemented by provider');
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            provider: this.constructor.name
        };
    }

    static getInstance() {
        if (!WebhookProvider.instance) {
            WebhookProvider.instance = new WebhookProvider();
        }
        return WebhookProvider.instance;
    }

    static resetInstance() {
        WebhookProvider.instance = null;
    }
}

class WebhookHandler extends WebhookProvider {
    constructor() {
        super();
        this.webhookManager = new WebhookManager();
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('Initializing webhook handler...');

        // Initialize webhook manager
        await this.webhookManager.initialize();

        this.isInitialized = true;
        console.log('Webhook handler initialized successfully');
    }

    async handleWebhook(webhookData) {
        try {
            console.log('Processing webhook:', webhookData?.id || 'unknown');

            // Check if webhook data is valid
            if (!webhookData || Object.keys(webhookData).length === 0) {
                console.log('Empty or invalid webhook data received');
                return { success: false, error: 'Empty or invalid webhook data' };
            }

            // Validate webhook signature
            if (!this.validateWebhookSignature(webhookData)) {
                console.error('Invalid webhook signature');
                return { success: false, error: 'Invalid signature' };
            }

            // Process each event in the webhook
            const events = this.extractEvents(webhookData);

            if (!events || events.length === 0) {
                console.log('No events found in webhook data');
                return { success: true, message: 'No events to process' };
            }

            for (const event of events) {
                await this.processEvent(event);
            }

            return { success: true };
        } catch (error) {
            console.error('Error processing webhook:', error);
            return { success: false, error: error.message };
        }
    }

    validateWebhookSignature(webhookData) {
        // TODO: Implement signature validation based on provider
        return true;
    }

    extractEvents(webhookData) {
        // Handle QuickNode webhook format: array of blocks with receipts
        if (Array.isArray(webhookData)) {
            const events = [];

            for (const blockData of webhookData) {
                if (blockData.receipts && Array.isArray(blockData.receipts)) {
                    for (const receipt of blockData.receipts) {
                        if (receipt.logs && Array.isArray(receipt.logs)) {
                            for (const log of receipt.logs) {
                                // Add block context to each log
                                const eventWithContext = {
                                    ...log,
                                    blockNumber: blockData.block?.number,
                                    blockHash: blockData.block?.hash,
                                    timestamp: blockData.block?.timestamp,
                                    transactionHash: receipt.transactionHash,
                                    transactionIndex: receipt.transactionIndex
                                };
                                events.push(eventWithContext);
                            }
                        }
                    }
                }
            }

            console.log(`Extracted ${events.length} events from QuickNode webhook`);
            return events;
        }

        // Fallback for other formats
        if (webhookData.events) {
            return webhookData.events;
        }
        if (webhookData.event) {
            return [webhookData.event];
        }
        if (webhookData.activity) {
            return webhookData.activity;
        }

        console.log('No events found in webhook data');
        return [];
    }

    async processEvent(event) {
        try {
            // Check if this is a ModulsTokenCreated event by topic signature
            // ModulsTokenCreated(address,string,string,uint256,address,address,uint8,uint8,uint256,string,address)
            if (event.topics && event.topics[0] === '0x...') { // TODO: Add actual ModulsTokenCreated signature
                await this.processModulsTokenCreatedEvent(event);
            }
            // Check if this is a Transfer event by topic signature
            else if (event.topics && event.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                await this.processTransferEvent(event);
            }
            // Legacy checks
            else if (event.eventName === 'ModulsTokenCreated' || event.name === 'ModulsTokenCreated') {
                await this.processModulsTokenCreatedEvent(event);
            }
            else if (event.eventName === 'Transfer' || event.name === 'Transfer') {
                await this.processTransferEvent(event);
            }
            else {
                console.log('Unknown event type, skipping:', event.topics?.[0] || 'no topics');
            }
        } catch (error) {
            console.error('Error processing event:', error);
        }
    }

    async processModulsTokenCreatedEvent(event) {
        try {
            console.log('Processing ModulsTokenCreated event');

            // Extract event data (provider-agnostic)
            const eventData = this.extractEventData(event);
            if (!eventData) {
                console.log('Could not extract event data');
                return;
            }

            const { intentId, tokenAddress, blockNumber, transactionHash } = eventData;

            // Find corresponding agent
            const agent = await Agent.findOne({ intentId });

            if (!agent) {
                console.log(`Agent not found for intentId: ${intentId}`);
                return;
            }

            if (agent.status === 'ACTIVE') {
                console.log(`Agent ${agent.uniqueId} is already active`);
                return;
            }

            // Update agent status and details
            agent.status = 'ACTIVE';
            agent.tokenAddress = tokenAddress;
            agent.deploymentBlock = blockNumber;
            agent.deploymentTransaction = transactionHash;
            await agent.save();

            console.log(`Agent ${agent.uniqueId} activated with token ${tokenAddress}`);

            // Register Transfer webhook for the new token
            // ModulsTokenCreated webhook is already registered for ModulsDeployer
            await this.webhookManager.ensureTransferWebhookForToken(tokenAddress);

        } catch (error) {
            console.error('Error processing ModulsTokenCreated event:', error);
        }
    }

    async processTransferEvent(event) {
        try {
            console.log('Processing Transfer event');

            // Extract Transfer event data (provider-agnostic)
            const transferData = this.extractTransferData(event);
            if (!transferData) {
                console.log('Could not extract transfer data');
                return;
            }

            const { tokenAddress, from, to, value, blockNumber, transactionHash, logIndex } = transferData;

            // Save event to database
            await this.saveTransferEvent(tokenAddress, {
                from,
                to,
                value,
                blockNumber,
                transactionHash,
                logIndex
            });

            // Update holder balances
            await this.updateHolderBalances(tokenAddress, from, to, value);

            console.log(`Transfer processed: ${from} -> ${to} (${value.toString()}) for token ${tokenAddress}`);

        } catch (error) {
            console.error('Error processing Transfer event:', error)
        }
    }

    extractEventData(event) {
        try {
            let intentId, tokenAddress, blockNumber, transactionHash;

            // QuickNode log format: topics and data
            if (event.topics && event.topics.length >= 3) {
                // ModulsTokenCreated event signature: 0x...
                // topics[0] = event signature
                // topics[1] = intentId (indexed)
                // topics[2] = tokenAddress (indexed)

                // Extract intentId from topics[1] (remove padding)
                const intentIdHex = event.topics[1];
                intentId = Number(BigInt(intentIdHex));

                // Extract tokenAddress from topics[2] (remove padding)
                const tokenAddressHex = event.topics[2];
                tokenAddress = getAddress('0x' + tokenAddressHex.slice(26)); // Remove padding

                blockNumber = Number(event.blockNumber);
                transactionHash = event.transactionHash;
            }
            // Legacy formats
            else if (event.intentId !== undefined) {
                intentId = Number(event.intentId);
                tokenAddress = getAddress(event.tokenAddress);
                blockNumber = Number(event.blockNumber || event.blockNum);
                transactionHash = event.transactionHash || event.hash;
            } else if (event.rawContract && event.rawContract.value) {
                intentId = Number(event.rawContract.value.intentId);
                tokenAddress = getAddress(event.rawContract.value.tokenAddress);
                blockNumber = Number(event.blockNum);
                transactionHash = event.hash;
            } else if (event.decoded && event.decoded.params) {
                const params = event.decoded.params;
                intentId = Number(params.find(p => p.name === 'intentId')?.value);
                tokenAddress = getAddress(params.find(p => p.name === 'tokenAddress')?.value);
                blockNumber = Number(event.blockNumber);
                transactionHash = event.transactionHash;
            }

            if (intentId && tokenAddress) {
                return { intentId, tokenAddress, blockNumber, transactionHash };
            }

            return null;
        } catch (error) {
            console.error('Error extracting event data:', error);
            return null;
        }
    }

    extractTransferData(eventData) {
        // Provider-agnostic Transfer event data extraction
        try {
            let tokenAddress, from, to, value, blockNumber, transactionHash, logIndex;

            // QuickNode log format: topics and data
            if (eventData.topics && eventData.topics.length >= 3 && eventData.data) {
                // Transfer event signature: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
                // topics[0] = event signature
                // topics[1] = from address (indexed)
                // topics[2] = to address (indexed)
                // data = value (non-indexed)

                tokenAddress = getAddress(eventData.address);
                from = getAddress('0x' + eventData.topics[1].slice(26)); // Remove padding
                to = getAddress('0x' + eventData.topics[2].slice(26)); // Remove padding
                value = BigInt(eventData.data);
                blockNumber = Number(eventData.blockNumber);
                transactionHash = eventData.transactionHash;
                logIndex = Number(eventData.logIndex);
            }
            // Structure 1: Direct properties
            else if (eventData.from && eventData.to) {
                tokenAddress = getAddress(eventData.tokenAddress || eventData.address);
                from = getAddress(eventData.from);
                to = getAddress(eventData.to);
                value = BigInt(eventData.value);
                blockNumber = Number(eventData.blockNumber);
                transactionHash = eventData.transactionHash;
                logIndex = Number(eventData.logIndex);
            }
            // Structure 2: Decoded data
            else if (eventData.decoded && eventData.decoded.params) {
                const params = eventData.decoded.params;
                tokenAddress = getAddress(eventData.tokenAddress || eventData.address);
                from = getAddress(params.find(p => p.name === 'from')?.value);
                to = getAddress(params.find(p => p.name === 'to')?.value);
                value = BigInt(params.find(p => p.name === 'value')?.value);
                blockNumber = Number(eventData.blockNumber);
                transactionHash = eventData.transactionHash;
                logIndex = Number(eventData.logIndex);
            }
            // Structure 3: Raw log data (legacy)
            else if (eventData.topics && eventData.data) {
                tokenAddress = getAddress(eventData.address);
                from = '0x' + eventData.topics[1].slice(26);
                to = '0x' + eventData.topics[2].slice(26);
                value = BigInt(eventData.data);
                blockNumber = Number(eventData.blockNumber);
                transactionHash = eventData.transactionHash;
                logIndex = Number(eventData.logIndex);
            }

            if (tokenAddress && from && to && value !== undefined) {
                return {
                    tokenAddress,
                    from,
                    to,
                    value,
                    blockNumber,
                    transactionHash,
                    logIndex
                };
            }

            return null;
        } catch (error) {
            console.error('Error extracting transfer data:', error);
            return null;
        }
    }

    async saveTransferEvent(tokenAddress, eventData) {
        try {
            const existingEvent = await TokenEvent.findOne({
                transactionHash: eventData.transactionHash,
                logIndex: eventData.logIndex
            });

            if (existingEvent) {
                return; // Event already exists
            }

            const event = new TokenEvent({
                tokenAddress: getAddress(tokenAddress),
                from: getAddress(eventData.from),
                to: getAddress(eventData.to),
                value: eventData.value.toString(),
                blockNumber: eventData.blockNumber,
                transactionHash: eventData.transactionHash,
                logIndex: eventData.logIndex,
                timestamp: new Date()
            });

            await event.save();
        } catch (error) {
            if (error.code === 11000) {
                return; // Duplicate event
            }
            console.error('Error saving transfer event:', error);
        }
    }

    async updateHolderBalances(tokenAddress, from, to, value) {
        try {
            const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

            if (from !== ZERO_ADDRESS) {
                await this.updateBalance(tokenAddress, from, -value);
            }

            if (to !== ZERO_ADDRESS) {
                await this.updateBalance(tokenAddress, to, value);
            }
        } catch (error) {
            console.error('Error updating holder balances:', error);
        }
    }

    async updateBalance(tokenAddress, address, valueChange) {
        try {
            let holder = await TokenHolder.findOne({
                tokenAddress: getAddress(tokenAddress),
                holderAddress: getAddress(address)
            });

            if (!holder) {
                if (valueChange > 0) {
                    // Create new holder
                    holder = new TokenHolder({
                        tokenAddress: getAddress(tokenAddress),
                        holderAddress: getAddress(address),
                        balance: valueChange.toString(),
                        lastUpdated: new Date()
                    });
                    await holder.save();
                }
            } else {
                const currentBalance = BigInt(holder.balance);
                const newBalance = currentBalance + valueChange;

                if (newBalance <= 0) {
                    // Remove holder if balance is zero or negative
                    await TokenHolder.deleteOne({ _id: holder._id });
                } else {
                    // Update balance
                    holder.balance = newBalance.toString();
                    holder.lastUpdated = new Date();
                    await holder.save();
                }
            }
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    }

    // Webhook management methods
    async getWebhookManager() {
        return this.webhookManager;
    }

    async registerWebhooksForToken(tokenAddress) {
        return await this.webhookManager.ensureWebhooksForToken(tokenAddress);
    }

    async deleteWebhooksForToken(tokenAddress) {
        return await this.webhookManager.deleteWebhooksForToken(tokenAddress);
    }

    async listAllWebhooks() {
        return await this.webhookManager.listAllWebhooks();
    }

    async cleanupInactiveWebhooks() {
        return await this.webhookManager.cleanupInactiveWebhooks();
    }

    async reRegisterFailedWebhooks() {
        return await this.webhookManager.reRegisterFailedWebhooks();
    }

    static getInstance() {
        if (!WebhookHandler.instance) {
            WebhookHandler.instance = new WebhookHandler();
        }
        return WebhookHandler.instance;
    }

    static resetInstance() {
        WebhookHandler.instance = null;
    }
}

module.exports = WebhookHandler; 