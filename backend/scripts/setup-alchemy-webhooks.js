#!/usr/bin/env node

/**
 * Alchemy Webhook Setup Script
 * 
 * This script sets up Alchemy webhook subscriptions for all active tokens.
 * Run this script after deploying the new webhook-based indexer system.
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const AlchemyClient = require('../core/indexer/alchemy-client');
const config = require('../config');

async function setupAlchemyWebhooks() {
    try {
        console.log('Setting up Alchemy webhook subscriptions...');

        // Connect to database
        await mongoose.connect(config.dbUrl);
        console.log('Connected to MongoDB');

        // Get all active agents with token addresses
        const Agent = require('../core/models/agents');
        const agents = await Agent.find({
            status: 'ACTIVE',
            tokenAddress: { $exists: true, $ne: null }
        });

        console.log(`Found ${agents.length} active agents with tokens`);

        const alchemyClient = new AlchemyClient();

        // Get existing webhook subscriptions
        const existingWebhooks = await alchemyClient.getWebhookSubscriptions();
        console.log(`Found ${existingWebhooks.length} existing webhook subscriptions`);

        // Create webhook subscriptions for each token
        for (const agent of agents) {
            const tokenAddress = agent.tokenAddress;
            console.log(`Setting up webhook for token: ${tokenAddress}`);

            try {
                // Check if webhook already exists for this token
                const existingWebhook = existingWebhooks.find(webhook =>
                    webhook.webhook.addresses.includes(tokenAddress)
                );

                if (existingWebhook) {
                    console.log(`Webhook already exists for ${tokenAddress}, updating...`);
                    await alchemyClient.createWebhookSubscription(tokenAddress, existingWebhook.id);
                } else {
                    console.log(`Creating new webhook for ${tokenAddress}...`);
                    await alchemyClient.createWebhookSubscription(tokenAddress);
                }

                console.log(`✅ Webhook setup completed for ${tokenAddress}`);

            } catch (error) {
                console.error(`❌ Failed to setup webhook for ${tokenAddress}:`, error.message);
            }
        }

        console.log('\n🎉 Alchemy webhook setup completed!');
        console.log('\nNext steps:');
        console.log('1. Ensure your webhook URL is publicly accessible');
        console.log('2. Test webhook delivery using Alchemy dashboard');
        console.log('3. Monitor webhook events in your application logs');

    } catch (error) {
        console.error('Error setting up Alchemy webhooks:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the setup
if (require.main === module) {
    setupAlchemyWebhooks();
}

module.exports = setupAlchemyWebhooks; 