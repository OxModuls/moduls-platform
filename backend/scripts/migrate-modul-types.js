const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import the Agent model
const Agent = require('../core/models/agents');

const migrationMap = {
    'GAME_FI_NPC': 'GAMING_BUDDY',
    'DEFI_AI': 'TRADING_ASSISTANT',
    'ORACLE_FEED': 'PORTFOLIO_WATCHER'
};

async function migrateModulTypes() {
    try {
        // Connect to MongoDB
        const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/test';
        await mongoose.connect(dbUrl);
        console.log('Connected to MongoDB');

        // Find all agents with old modul types
        const agentsToUpdate = await Agent.find({
            modulType: { $in: Object.keys(migrationMap) }
        });

        console.log(`Found ${agentsToUpdate.length} agents to migrate`);

        if (agentsToUpdate.length === 0) {
            console.log('No agents need migration');
            return;
        }

        // Update each agent
        for (const agent of agentsToUpdate) {
            const oldType = agent.modulType;
            const newType = migrationMap[oldType];

            console.log(`Migrating agent ${agent.name} from ${oldType} to ${newType}`);

            await Agent.updateOne(
                { _id: agent._id },
                {
                    $set: { modulType: newType },
                    $push: {
                        migrationLog: {
                            action: 'modul_type_migration',
                            oldValue: oldType,
                            newValue: newType,
                            migratedAt: new Date()
                        }
                    }
                }
            );
        }

        console.log('Migration completed successfully');

        // Verify the migration
        const remainingOldTypes = await Agent.find({
            modulType: { $in: Object.keys(migrationMap) }
        });

        if (remainingOldTypes.length === 0) {
            console.log('✅ All agents have been successfully migrated');
        } else {
            console.log(`⚠️  ${remainingOldTypes.length} agents still have old modul types`);
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    migrateModulTypes();
}

module.exports = { migrateModulTypes };
