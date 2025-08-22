const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

class MCPClient {
    constructor() {
        this.mcp = new Client({ name: "moduls-mcp-client", version: "1.0.0" });
        this.transport = null;
        this.isConnected = false;
        this.tools = [];
    }

    async connectToServer(serverScriptPath) {
        try {
            const command = process.execPath;
            this.transport = new StdioClientTransport({
                command,
                args: [serverScriptPath],
            });

            await this.mcp.connect(this.transport);
            this.isConnected = true;

            // Fetch available tools
            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema
            }));

            console.log(`✅ MCP Client connected to server with ${this.tools.length} tools`);
        } catch (error) {
            console.error("❌ Failed to connect to MCP server:", error);
            throw error;
        }
    }

    async executeTool(toolName, toolArguments) {
        if (!this.isConnected) {
            throw new Error("MCP Client not connected to server");
        }

        try {
            const result = await this.mcp.callTool({
                name: toolName,
                arguments: toolArguments,
            });
            return result;
        } catch (error) {
            console.error(`❌ Tool execution failed for ${toolName}:`, error);
            throw error;
        }
    }

    async disconnect() {
        if (this.transport && this.isConnected) {
            await this.transport.close();
            this.isConnected = false;
        }
    }
}

module.exports = MCPClient;
