#!/usr/bin/env node

const ModulsMCPServer = require('./core/services/mcp/mcp-server');

/**
 * Standalone MCP Server Starter
 * This script starts the MCP server with stdio transport
 */

async function startMCPServer() {
    console.log('🚀 Starting Moduls Platform MCP Server...');

    try {
        // Create and start the MCP server
        const mcpServer = new ModulsMCPServer();

        // Start the server
        await mcpServer.start();

        console.log('✅ MCP Server is now running and ready to accept connections');
        console.log('📊 Server Status:', mcpServer.getStatus());
        console.log('🛠️ Registered Tools:', mcpServer.getRegisteredTools().map(t => t.name));

        // Keep the process alive
        process.on('SIGINT', async () => {
            console.log('\n🛑 Received SIGINT, shutting down gracefully...');
            await mcpServer.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
            await mcpServer.stop();
            process.exit(0);
        });

        // Handle uncaught errors
        process.on('uncaughtException', async (error) => {
            console.error('❌ Uncaught Exception:', error);
            await mcpServer.stop();
            process.exit(1);
        });

        process.on('unhandledRejection', async (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            await mcpServer.stop();
            process.exit(1);
        });

    } catch (error) {
        console.error('❌ Failed to start MCP Server:', error);
        process.exit(1);
    }
}

// Start the server if this script is run directly
if (require.main === module) {
    startMCPServer();
}

module.exports = { startMCPServer };
