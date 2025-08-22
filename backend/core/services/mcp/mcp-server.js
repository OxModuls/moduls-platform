const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const memeTools = require('./meme-tools');

/**
 * MCP Server for Moduls Platform
 * Exposes tools and resources via Model Context Protocol
 */
class ModulsMCPServer {
    constructor() {
        this.server = new McpServer({
            name: "moduls-platform-server",
            version: "1.0.0"
        });

        this.transport = null;
        this.registeredTools = [];
    }

    /**
     * Initialize the MCP server with tools and resources
     */
    async initializeServer() {
        console.log('🔧 Initializing MCP Server...');

        // Register MEME modul type tools
        await this.registerMemeTools();

        // Future modul types can be added here
        // this.registerGamingTools();
        // this.registerTradingTools();
        // this.registerPortfolioTools();
        // this.registerSocialTools();

        console.log('✅ MCP Server initialized with tools and resources');
    }

    /**
 * Register MEME modul type tools
 */
    async registerMemeTools() {
        console.log('📦 Registering MEME modul type tools...');

        const tools = Object.values(memeTools);
        for (const tool of tools) {
            try {
                // Register tool using the correct MCP SDK API
                this.server.tool(
                    tool.name,
                    tool.description,
                    tool.inputSchema,
                    async (args) => {
                        // Tool execution callback
                        try {
                            const result = await tool.handler(args);
                            return result;
                        } catch (error) {
                            console.log(`❌ MCP Server: Tool ${tool.name} execution failed:`, error);
                            throw error;
                        }
                    }
                );

                // Store registered tool info
                this.registeredTools.push({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema
                });

                // Tool registered successfully
            } catch (error) {
                console.error(`  ❌ Failed to register tool ${tool.name}:`, error);
            }
        }
    }

    /**
     * Start the MCP server with stdio transport
     */
    async start() {
        try {
            console.log('🚀 Starting MCP Server...');

            // Initialize server with tools
            await this.initializeServer();

            // Connect transport
            this.transport = new StdioServerTransport();
            await this.server.connect(this.transport);

            console.log('✅ MCP Server started successfully with stdio transport');

        } catch (error) {
            console.error('❌ Failed to start MCP Server:', error);
            throw error;
        }
    }


    /**
     * Stop the MCP server
     */
    async stop() {
        try {
            console.log('🛑 Stopping MCP Server...');

            if (this.transport && this.server.isConnected()) {
                await this.transport.close();
            }

            console.log('✅ MCP Server stopped successfully');

        } catch (error) {
            console.error('❌ Error stopping MCP Server:', error);
            throw error;
        }
    }

    /**
     * Get server status
     */
    getStatus() {
        return {
            name: "moduls-platform-server",
            version: "1.0.0",
            isConnected: this.server.isConnected(),
            transport: this.transport ? 'stdio' : 'none'
        };
    }

    /**
     * Get registered tools
     */
    getRegisteredTools() {
        return this.registeredTools;
    }
}

module.exports = ModulsMCPServer;
