const QuickNodeClient = require('./quicknode-client');
const WebhookSubscription = require('../models/webhook-subscription');
const config = require('../../config');

class WebhookManager {
    constructor() {
        this.quicknodeClient = new QuickNodeClient();
        this.webhookUrl = config.webhookUrl;
        this.networks = ['sei-mainnet', 'sei-testnet'];
    }

    async initialize() {
        console.log('Initializing webhook manager...');

        try {
            // Verify all existing webhooks
            await this.verifyAllWebhooks();

            // Register missing webhooks for active tokens
            await this.registerMissingWebhooks();

            console.log('Webhook manager initialized successfully');
        } catch (error) {
            console.error('Error initializing webhook manager:', error);
            throw error;
        }
    }

    async verifyAllWebhooks() {
        console.log('Verifying existing webhooks...');

        try {
            // Get all webhook subscriptions from database
            const subscriptions = await WebhookSubscription.find({});

            for (const subscription of subscriptions) {
                try {
                    // Verify webhook with QuickNode
                    const webhookData = await this.quicknodeClient.getWebhook(subscription.webhookId);

                    // Check if webhook actually exists in QuickNode
                    if (!webhookData) {
                        console.log(`❌ Webhook ${subscription.webhookId} not found in QuickNode`);

                        // Mark as inactive and schedule for re-registration
                        subscription.status = 'inactive';
                        subscription.lastVerified = new Date();
                        await subscription.save();
                        continue;
                    }

                    // Update subscription status and last verified
                    subscription.status = 'active';
                    subscription.lastVerified = new Date();
                    await subscription.save();

                    console.log(`✅ Webhook ${subscription.webhookId} verified successfully`);
                } catch (error) {
                    console.log(`❌ Webhook ${subscription.webhookId} verification failed:`, error.message);

                    // Mark as inactive and schedule for re-registration
                    subscription.status = 'inactive';
                    subscription.lastVerified = new Date();
                    await subscription.save();
                }
            }
        } catch (error) {
            console.error('Error verifying webhooks:', error);
            throw error;
        }
    }

    async registerMissingWebhooks() {
        console.log('Registering missing webhooks...');

        try {
            // Register ModulsTokenCreated webhook for ModulsDeployer (single instance)
            await this.ensureModulsTokenCreatedWebhook();

            // Get all active agents with token addresses and register Transfer webhooks in batches
            const Agent = require('../models/agents');
            const activeAgents = await Agent.find({
                status: 'ACTIVE',
                tokenAddress: { $exists: true, $ne: null }
            });

            // Extract token addresses that need Transfer webhooks
            const tokenAddresses = activeAgents.map(agent => agent.tokenAddress);

            // Register Transfer webhooks in batches
            await this.registerTransferWebhooksInBatches(tokenAddresses);
        } catch (error) {
            console.error('Error registering missing webhooks:', error);
            throw error;
        }
    }

    async ensureModulsTokenCreatedWebhook() {
        try {
            // Check if ModulsTokenCreated webhook already exists for ModulsDeployer
            const existingModulsTokenCreated = await WebhookSubscription.findOne({
                eventType: 'ModulsTokenCreated',
                contractAddress: config.contractAddresses[config.chainMode].modulsDeployer
            });

            if (!existingModulsTokenCreated) {
                await this.registerModulsTokenCreatedWebhook();
            }
        } catch (error) {
            console.error('Error ensuring ModulsTokenCreated webhook:', error);
        }
    }

    async ensureTransferWebhookForToken(tokenAddress) {
        try {
            // Check if Transfer webhook already exists for this token
            const existingTransfer = await WebhookSubscription.findByContractAndEvent(
                tokenAddress,
                'Transfer'
            );

            // Register Transfer webhook if missing
            if (!existingTransfer) {
                // For single token registration, use the individual method
                await this.registerTransferWebhook(tokenAddress);
            }
        } catch (error) {
            console.error(`Error ensuring Transfer webhook for token ${tokenAddress}:`, error);
        }
    }

    async ensureWebhooksForToken(tokenAddress) {
        try {
            // Only register Transfer webhook for the token
            // ModulsTokenCreated webhook is handled separately for ModulsDeployer
            await this.ensureTransferWebhookForToken(tokenAddress);
        } catch (error) {
            console.error(`Error ensuring webhooks for token ${tokenAddress}:`, error);
        }
    }

    async registerModulsTokenCreatedWebhook() {
        try {
            const modulsDeployerAddress = config.contractAddresses[config.chainMode].modulsDeployer;
            console.log(`Registering ModulsTokenCreated webhook for ModulsDeployer: ${modulsDeployerAddress}`);

            const payload = this.quicknodeClient.createModulsTokenCreatedWebhookPayload(
                modulsDeployerAddress,
                config.network,
                this.webhookUrl
            );

            const response = await this.quicknodeClient.createWebhook(payload);

            if (!response) {
                console.log('Failed to register ModulsTokenCreated webhook - API call failed');
                return null;
            }

            // Save to database
            const subscription = new WebhookSubscription({
                webhookId: response.id,
                name: payload.name,
                url: payload.destination_attributes.url,
                network: payload.network,
                eventType: 'ModulsTokenCreated',
                contractAddress: modulsDeployerAddress,
                status: response.status || 'active'
            });

            await subscription.save();
            console.log(`✅ ModulsTokenCreated webhook registered: ${response.id}`);

            return response.id;
        } catch (error) {
            console.error(`Error registering ModulsTokenCreated webhook:`, error);
            return null;
        }
    }

    async registerTransferWebhook(contractAddress) {
        try {
            console.log(`Registering Transfer webhook for ${contractAddress}`);

            const payload = this.quicknodeClient.createTransferWebhookPayload(
                contractAddress,
                config.network,
                this.webhookUrl
            );

            const response = await this.quicknodeClient.createWebhook(payload);

            if (!response) {
                console.log(`Failed to register Transfer webhook for ${contractAddress} - API call failed`);
                return null;
            }

            // Save to database
            const subscription = new WebhookSubscription({
                webhookId: response.id,
                name: payload.name,
                url: payload.destination_attributes.url,
                network: payload.network,
                eventType: 'Transfer',
                contractAddress: contractAddress,
                status: response.status || 'active'
            });

            await subscription.save();
            console.log(`✅ Transfer webhook registered: ${response.id}`);

            return response.id;
        } catch (error) {
            console.error(`Error registering Transfer webhook for ${contractAddress}:`, error);
            return null;
        }
    }

    async registerTransferWebhooksInBatches(tokenAddresses) {
        try {
            console.log(`Registering Transfer webhooks in batches for ${tokenAddresses.length} tokens...`);

            // Filter out addresses that already have Transfer webhooks
            const addressesNeedingWebhooks = [];
            for (const address of tokenAddresses) {
                const existingTransfer = await WebhookSubscription.findByContractAndEvent(address, 'Transfer');
                if (!existingTransfer) {
                    addressesNeedingWebhooks.push(address);
                }
            }

            if (addressesNeedingWebhooks.length === 0) {
                console.log('All tokens already have Transfer webhooks');
                return;
            }

            console.log(`${addressesNeedingWebhooks.length} tokens need Transfer webhooks`);

            // Split addresses into batches of 100
            const batchSize = 100;
            const batches = [];
            for (let i = 0; i < addressesNeedingWebhooks.length; i += batchSize) {
                batches.push(addressesNeedingWebhooks.slice(i, i + batchSize));
            }

            console.log(`Creating ${batches.length} batch(es) of Transfer webhooks`);

            // Register each batch
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`Registering batch ${i + 1}/${batches.length} with ${batch.length} addresses`);

                const payload = this.quicknodeClient.createTransferWebhookPayload(
                    batch,
                    config.network,
                    this.webhookUrl
                );

                const response = await this.quicknodeClient.createWebhook(payload);

                if (!response) {
                    console.log(`Failed to register Transfer webhook batch ${i + 1} - API call failed`);
                    continue;
                }

                // Save each address in the batch to database
                for (const contractAddress of batch) {
                    const subscription = new WebhookSubscription({
                        webhookId: response.id,
                        name: payload.name,
                        url: payload.destination_attributes.url,
                        network: payload.network,
                        eventType: 'Transfer',
                        contractAddress: contractAddress,
                        status: response.status || 'active'
                    });

                    await subscription.save();
                }

                console.log(`✅ Transfer webhook batch ${i + 1} registered: ${response.id} (${batch.length} addresses)`);
            }
        } catch (error) {
            console.error('Error registering Transfer webhooks in batches:', error);
            throw error;
        }
    }

    async deleteWebhook(webhookId) {
        try {
            console.log(`Deleting webhook: ${webhookId}`);

            // Delete from QuickNode
            const result = await this.quicknodeClient.deleteWebhook(webhookId);

            if (!result) {
                console.log(`Failed to delete webhook ${webhookId} from QuickNode - API call failed`);
            }

            // Remove from database
            await WebhookSubscription.deleteOne({ webhookId });

            console.log(`✅ Webhook ${webhookId} deleted successfully`);
        } catch (error) {
            console.error(`Error deleting webhook ${webhookId}:`, error);
        }
    }

    async deleteWebhooksForToken(contractAddress) {
        try {
            console.log(`Deleting webhooks for token: ${contractAddress}`);

            const subscriptions = await WebhookSubscription.find({ contractAddress });

            for (const subscription of subscriptions) {
                await this.deleteWebhook(subscription.webhookId);
            }

            console.log(`✅ All webhooks deleted for token ${contractAddress}`);
        } catch (error) {
            console.error(`Error deleting webhooks for token ${contractAddress}:`, error);
            throw error;
        }
    }

    async getWebhookStatus(webhookId) {
        try {
            const webhookData = await this.quicknodeClient.getWebhook(webhookId);
            return webhookData;
        } catch (error) {
            console.error(`Error getting webhook status for ${webhookId}:`, error);
            return null;
        }
    }

    async listAllWebhooks() {
        try {
            const subscriptions = await WebhookSubscription.find({});
            return subscriptions;
        } catch (error) {
            console.error('Error listing webhooks:', error);
            throw error;
        }
    }

    async getQuickNodeWebhooks() {
        try {
            const webhooks = await this.quicknodeClient.listWebhooks();
            return webhooks || [];
        } catch (error) {
            console.error('Error getting QuickNode webhooks:', error);
            return [];
        }
    }

    async compareWebhooksWithQuickNode() {
        try {
            console.log('Comparing local webhooks with QuickNode...');

            const localSubscriptions = await WebhookSubscription.find({});
            const quicknodeWebhooks = await this.getQuickNodeWebhooks();

            const localWebhookIds = new Set(localSubscriptions.map(sub => sub.webhookId));
            const quicknodeWebhookIds = new Set(quicknodeWebhooks.map(webhook => webhook.id));

            // Find webhooks that exist locally but not in QuickNode
            const missingInQuickNode = localSubscriptions.filter(sub => !quicknodeWebhookIds.has(sub.webhookId));

            // Find webhooks that exist in QuickNode but not locally
            const missingLocally = quicknodeWebhooks.filter(webhook => !localWebhookIds.has(webhook.id));

            console.log(`Local webhooks: ${localSubscriptions.length}`);
            console.log(`QuickNode webhooks: ${quicknodeWebhooks.length}`);
            console.log(`Missing in QuickNode: ${missingInQuickNode.length}`);
            console.log(`Missing locally: ${missingLocally.length}`);

            return {
                localCount: localSubscriptions.length,
                quicknodeCount: quicknodeWebhooks.length,
                missingInQuickNode,
                missingLocally
            };
        } catch (error) {
            console.error('Error comparing webhooks:', error);
            return null;
        }
    }

    async cleanupInactiveWebhooks() {
        try {
            console.log('Cleaning up inactive webhooks...');

            const inactiveSubscriptions = await WebhookSubscription.find({ status: 'inactive' });

            for (const subscription of inactiveSubscriptions) {
                try {
                    await this.deleteWebhook(subscription.webhookId);
                } catch (error) {
                    console.log(`Failed to delete inactive webhook ${subscription.webhookId}:`, error.message);
                }
            }

            console.log(`✅ Cleaned up ${inactiveSubscriptions.length} inactive webhooks`);
        } catch (error) {
            console.error('Error cleaning up inactive webhooks:', error);
            throw error;
        }
    }

    async reRegisterFailedWebhooks() {
        try {
            console.log('Re-registering failed webhooks...');

            const failedSubscriptions = await WebhookSubscription.find({ status: 'error' });

            for (const subscription of failedSubscriptions) {
                try {
                    // Delete the failed webhook
                    await this.deleteWebhook(subscription.webhookId);

                    // Re-register based on event type
                    if (subscription.eventType === 'ModulsTokenCreated') {
                        // ModulsTokenCreated webhook is for ModulsDeployer contract
                        await this.registerModulsTokenCreatedWebhook();
                    } else if (subscription.eventType === 'Transfer') {
                        // Transfer webhook is for individual token contracts
                        await this.registerTransferWebhook(subscription.contractAddress);
                    }
                } catch (error) {
                    console.log(`Failed to re-register webhook for ${subscription.contractAddress}:`, error.message);
                }
            }

            console.log(`✅ Re-registered ${failedSubscriptions.length} failed webhooks`);
        } catch (error) {
            console.error('Error re-registering failed webhooks:', error);
            throw error;
        }
    }
}

module.exports = WebhookManager; 