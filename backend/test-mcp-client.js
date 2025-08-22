#!/usr/bin/env node

const MCPClient = require('./core/services/mcp/mcp-client');

async function testMCPClient() {
    console.log('🧪 Testing MCP Client...');

    const client = new MCPClient();

    try {
        // Connect to the MCP server
        console.log('🔌 Connecting to MCP server...');
        await client.connectToServer('./start-mcp-server.js');

        // Test a query
        console.log('\n📝 Testing query processing...');
        const query = "What are the token metrics for 0x1234567890abcdef?";
        const result = await client.processQuery(query);

        console.log('\n📊 Query Result:');
        console.log(result);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Cleanup
        await client.disconnect();
        console.log('🔌 Client disconnected');
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testMCPClient().catch(console.error);
}

module.exports = { testMCPClient };
