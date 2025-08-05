const express = require('express');
const { getAddress, formatEther } = require('viem');
const WebhookHandler = require('./webhook-handler');
const TokenHolder = require('../models/token-holder');
const config = require('../../config');

const router = express.Router();
const webhookHandler = WebhookHandler.getInstance();

// Webhook endpoint for provider
router.post('', async (req, res) => {
    try {
        console.log('Received webhook from provider');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Request headers:', req.headers);

        // Check if request body is empty or malformed
        if (!req.body || Object.keys(req.body).length === 0) {
            console.log('Empty webhook payload received - ignoring');
            return res.status(200).json({ success: true, message: 'Empty payload ignored' });
        }

        const result = await webhookHandler.handleWebhook(req.body);

        if (result.success) {
            res.status(200).json({ success: true, message: 'Webhook processed successfully' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Get webhook handler status
router.get('/status', async (req, res) => {
    try {
        const handler = WebhookHandler.getInstance();
        const status = handler.getStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting webhook status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all webhook subscriptions
router.get('/subscriptions', async (req, res) => {
    try {
        const handler = WebhookHandler.getInstance();
        const webhooks = await handler.listAllWebhooks();
        res.json(webhooks);
    } catch (error) {
        console.error('Error listing webhooks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register webhooks for a specific token
router.post('/register/:tokenAddress', async (req, res) => {
    try {
        const { tokenAddress } = req.params;
        const handler = WebhookHandler.getInstance();
        await handler.registerWebhooksForToken(tokenAddress);
        res.json({ success: true, message: `Webhooks registered for token ${tokenAddress}` });
    } catch (error) {
        console.error('Error registering webhooks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete webhooks for a specific token
router.delete('/delete/:tokenAddress', async (req, res) => {
    try {
        const { tokenAddress } = req.params;
        const handler = WebhookHandler.getInstance();
        await handler.deleteWebhooksForToken(tokenAddress);
        res.json({ success: true, message: `Webhooks deleted for token ${tokenAddress}` });
    } catch (error) {
        console.error('Error deleting webhooks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cleanup inactive webhooks
router.post('/cleanup', async (req, res) => {
    try {
        const handler = WebhookHandler.getInstance();
        await handler.cleanupInactiveWebhooks();
        res.json({ success: true, message: 'Inactive webhooks cleaned up' });
    } catch (error) {
        console.error('Error cleaning up webhooks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Re-register failed webhooks
router.post('/reregister', async (req, res) => {
    try {
        const handler = WebhookHandler.getInstance();
        await handler.reRegisterFailedWebhooks();
        res.json({ success: true, message: 'Failed webhooks re-registered' });
    } catch (error) {
        console.error('Error re-registering webhooks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get webhook status by ID
router.get('/subscription/:webhookId', async (req, res) => {
    try {
        const { webhookId } = req.params;
        const handler = WebhookHandler.getInstance();
        const webhookManager = await handler.getWebhookManager();
        const status = await webhookManager.getWebhookStatus(webhookId);
        res.json(status);
    } catch (error) {
        console.error('Error getting webhook status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Compare local webhooks with QuickNode
router.get('/compare', async (req, res) => {
    try {
        const handler = WebhookHandler.getInstance();
        const webhookManager = await handler.getWebhookManager();
        const comparison = await webhookManager.compareWebhooksWithQuickNode();
        res.json(comparison);
    } catch (error) {
        console.error('Error comparing webhooks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get QuickNode webhooks directly
router.get('/quicknode', async (req, res) => {
    try {
        const handler = WebhookHandler.getInstance();
        const webhookManager = await handler.getWebhookManager();
        const webhooks = await webhookManager.getQuickNodeWebhooks();
        res.json(webhooks);
    } catch (error) {
        console.error('Error getting QuickNode webhooks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get holder balances for a token
router.get('/holders/:tokenAddress', async (req, res) => {
    try {
        const { tokenAddress } = req.params;
        const { limit = 50, offset = 0, sort = 'balance' } = req.query;

        // Validate token address
        try {
            getAddress(tokenAddress);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token address'
            });
        }

        // Validate query parameters
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                error: 'Limit must be between 1 and 100'
            });
        }

        if (isNaN(offsetNum) || offsetNum < 0) {
            return res.status(400).json({
                success: false,
                error: 'Offset must be non-negative'
            });
        }

        // Get holder data
        const [holders, totalCount, totalSupply] = await Promise.all([
            TokenHolder.getHoldersForToken(getAddress(tokenAddress), limitNum, offsetNum, sort),
            TokenHolder.getHolderCount(getAddress(tokenAddress)),
            TokenHolder.getTotalSupply(getAddress(tokenAddress))
        ]);

        // Get sales manager balance
        const salesManagerAddress = config.contractAddresses[config.chainMode].modulsSalesManager;
        const salesManagerHolder = holders.find(h => h.holderAddress.toLowerCase() === salesManagerAddress.toLowerCase());
        let salesManagerBalance = null;

        if (salesManagerHolder) {
            const balanceNum = BigInt(salesManagerHolder.balance);
            const supplyNum = BigInt(totalSupply || '0');
            const percentage = supplyNum > 0n ? Number((balanceNum * 10000n) / supplyNum) / 100 : 0;

            salesManagerBalance = {
                address: salesManagerAddress,
                balance: salesManagerHolder.balance,
                balanceFormatted: formatEther(salesManagerHolder.balance),
                percentage: percentage.toFixed(2),
                lastUpdated: salesManagerHolder.lastUpdated,
                firstSeen: salesManagerHolder.createdAt || salesManagerHolder.lastUpdated,
                transferCount: 0,
                isPool: true
            };
        }

        // Format holder data
        const formattedHolders = holders.map(holder => {
            const balanceNum = BigInt(holder.balance);
            const supplyNum = BigInt(totalSupply || '0');
            const percentage = supplyNum > 0n ? Number((balanceNum * 10000n) / supplyNum) / 100 : 0;

            return {
                address: holder.holderAddress,
                balance: holder.balance,
                balanceFormatted: formatEther(holder.balance),
                percentage: percentage.toFixed(2),
                lastUpdated: holder.lastUpdated,
                firstSeen: holder.createdAt || holder.lastUpdated,
                transferCount: 0
            };
        });

        res.json({
            success: true,
            data: {
                tokenAddress: getAddress(tokenAddress),
                totalSupply: totalSupply,
                totalSupplyFormatted: totalSupply ? formatEther(totalSupply) : '0',
                salesManagerBalance: salesManagerBalance,
                holders: formattedHolders,
                pagination: {
                    total: totalCount,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: offsetNum + limitNum < totalCount
                }
            }
        });
    } catch (error) {
        console.error('Error getting holder balances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get holder balances'
        });
    }
});

// Get holder statistics for a token
router.get('/holders/:tokenAddress/stats', async (req, res) => {
    try {
        const { tokenAddress } = req.params;

        // Validate token address
        try {
            getAddress(tokenAddress);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token address'
            });
        }

        const [holderCount, totalSupply] = await Promise.all([
            TokenHolder.getHolderCount(getAddress(tokenAddress)),
            TokenHolder.getTotalSupply(getAddress(tokenAddress))
        ]);

        res.json({
            success: true,
            data: {
                tokenAddress: getAddress(tokenAddress),
                holderCount,
                totalSupply,
                totalSupplyFormatted: totalSupply ? formatEther(totalSupply) : '0'
            }
        });
    } catch (error) {
        console.error('Error getting holder stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get holder stats'
        });
    }
});

module.exports = router; 