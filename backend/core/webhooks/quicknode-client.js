const axios = require('axios');
const config = require('../../config');

class QuickNodeClient {
    constructor() {
        this.baseURL = 'https://api.quicknode.com/webhooks/rest/v1';
        this.apiKey = config.quicknodeApiKey;
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    async createWebhook(webhookData) {
        try {
            const response = await this.client.post('/webhooks', webhookData);
            return response.data;
        } catch (error) {
            console.error('Error creating webhook:', error.response?.data || error.message);
            return null;
        }
    }

    async createWebhookFromTemplate(templateData) {

        conosle.log(templateData)
        try {
            const response = await this.client.post('/webhooks/template/evmAbiFilter', templateData);
            return response.data;
        } catch (error) {
            console.error('Error creating webhook from template:', error.response?.data || error.message);
            return null;
        }
    }

    async getWebhook(webhookId) {
        try {
            const response = await this.client.get(`/webhooks/${webhookId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting webhook:', error.response?.data || error.message);
            return null;
        }
    }

    async deleteWebhook(webhookId) {
        try {
            const response = await this.client.delete(`/webhooks/${webhookId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting webhook:', error.response?.data || error.message);
            return null;
        }
    }

    async listWebhooks() {
        try {
            const response = await this.client.get('/webhooks');
            // QuickNode returns { data: [...] } structure
            return response.data.data || response.data;
        } catch (error) {
            console.error('Error listing webhooks:', error.response?.data || error.message);
            return null;
        }
    }

    async updateWebhook(webhookId, updateData) {
        try {
            const response = await this.client.put(`/webhooks/${webhookId}`, updateData);
            return response.data;
        } catch (error) {
            console.error('Error updating webhook:', error.response?.data || error.message);
            return null;
        }
    }

    // Helper method to create webhook payload for ModulsTokenCreated events
    createModulsTokenCreatedWebhookPayload(contractAddress, network, webhookUrl) {
        return {
            name: `ModulsTokenCreated-${contractAddress.slice(0, 10)}`,
            network: network,
            destination_attributes: {
                url: webhookUrl,
                compression: 'none',

            },
            status: 'active',
            templateArgs: {
                abi: `[{
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "internalType": "uint256",
                            "name": "intentId",
                            "type": "uint256"
                        },
                        {
                            "indexed": true,
                            "internalType": "address",
                            "name": "tokenAddress",
                            "type": "address"
                        }
                    ],
                    "name": "ModulsTokenCreated",
                    "type": "event"
                }]`,

                contracts: [contractAddress],

            },

        };
    }

    // Helper method to create webhook payload for Transfer events
    createTransferWebhookPayload(contractAddresses, network, webhookUrl) {
        // Ensure contractAddresses is an array
        const addresses = Array.isArray(contractAddresses) ? contractAddresses : [contractAddresses];

        // Create a name based on the first address and count
        const name = addresses.length === 1
            ? `Transfer-${addresses[0].slice(0, 10)}`
            : `Transfer-Batch-${addresses.length}-${addresses[0].slice(0, 10)}`;

        return {
            name: name,
            network: network,
            destination_attributes: {
                url: webhookUrl,
                compression: 'none',
            },
            status: 'active',
            templateArgs: {
                abi: `[{
                    "anonymous": false,
                    "inputs": [
                        {
                            "indexed": true,
                            "internalType": "address",
                            "name": "from",
                            "type": "address"
                        },
                        {
                            "indexed": true,
                            "internalType": "address",
                            "name": "to",
                            "type": "address"
                        },
                        {
                            "indexed": false,
                            "internalType": "uint256",
                            "name": "value",
                            "type": "uint256"
                        }
                    ],
                    "name": "Transfer",
                    "type": "event"
                }]`,
                contracts: addresses,
            },
        };
    }
}

module.exports = QuickNodeClient; 