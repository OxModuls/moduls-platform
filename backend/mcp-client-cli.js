#!/usr/bin/env node

const MCPClient = require('./core/services/mcp/mcp-client');
const readline = require('readline');

async function main() {
    console.log('🚀 Moduls Platform MCP Client CLI');
    console.log('=====================================\n');

    const client = new MCPClient();

    try {
        // Connect to the MCP server
        console.log('🔌 Connecting to MCP server...');
        await client.connectToServer('./start-mcp-server.js');
        console.log('✅ Connected successfully!\n');

        // Create readline interface
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('💬 Type your queries (type "quit" to exit):\n');

        // Interactive loop
        const askQuestion = () => {
            rl.question('> ', async (input) => {
                if (input.toLowerCase() === 'quit') {
                    rl.close();
                    return;
                }

                if (input.trim()) {
                    try {
                        console.log('\n🔄 Processing query...');
                        const result = await client.processQuery(input);
                        console.log('\n📊 Result:');
                        console.log(result);
                        console.log('\n' + '─'.repeat(50) + '\n');
                    } catch (error) {
                        console.error('\n❌ Error:', error.message);
                        console.log('\n' + '─'.repeat(50) + '\n');
                    }
                }

                askQuestion();
            });
        };

        askQuestion();

    } catch (error) {
        console.error('❌ Failed to start client:', error.message);
        process.exit(1);
    }

    // Handle cleanup
    process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down...');
        await client.disconnect();
        process.exit(0);
    });
}

// Run the CLI
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
