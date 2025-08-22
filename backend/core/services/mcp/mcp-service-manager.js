const memeTools = require('./meme-tools');
const ModulsMCPServer = require('./mcp-server');

/**
 * MCP Service Manager
 * Manages MCP-compatible tools and integrates them with the existing system
 */
class MCPServiceManager {
    constructor() {
        this.tools = new Map();
        this.mcpServer = null;
        this.isServerRunning = false;
        this.initializeTools();
    }

    /**
 * Initialize all available tools by modul type
 */
    async initializeTools() {
        console.log('🔧 Initializing MCP Service Manager...');

        // Register MEME modul type tools
        this.registerModulTools('MEME', memeTools);

        // Future modul types can be added here
        // this.registerModulTools('GAMING_BUDDY', gamingTools);
        // this.registerModulTools('TRADING_ASSISTANT', tradingTools);
        // this.registerModulTools('PORTFOLIO_WATCHER', portfolioTools);
        // this.registerModulTools('SOCIAL_SENTINEL', socialTools);

        console.log(`✅ MCP Service Manager initialized with ${this.tools.size} tools`);

        // Start the MCP server
        await this.startMCPServer();
    }

    /**
     * Register tools for a specific modul type
     */
    registerModulTools(modulType, toolsModule) {
        console.log(`📦 Registering tools for ${modulType} modul type...`);

        const tools = Object.values(toolsModule);
        tools.forEach(tool => {
            const toolKey = `${modulType}_${tool.name}`;
            this.tools.set(toolKey, {
                ...tool,
                modulType,
                fullName: tool.name
            });

            console.log(`  ✅ Registered tool: ${tool.name}`);
        });
    }

    /**
     * Get available tools for a specific modul type
     */
    getAvailableTools(modulType) {
        const tools = [];

        for (const [key, tool] of this.tools) {
            if (tool.modulType === modulType) {
                // Convert MCP tool format to the format expected by LLMInterface
                tools.push({
                    name: tool.name,
                    description: tool.description,
                    parameters: this.convertSchemaToOpenAI(tool.inputSchema)
                });
            }
        }

        console.log(`🛠️ Found ${tools.length} tools for ${modulType} modul type`);
        return tools;
    }

    /**
     * Execute a tool by name and modul type
     */
    async executeTool(toolName, parameters, modulType) {
        const toolKey = `${modulType}_${toolName}`;
        const tool = this.tools.get(toolKey);

        if (!tool) {
            throw new Error(`Tool '${toolName}' not found for modul type '${modulType}'`);
        }

        console.log(`🔧 MCP Service Manager: Executing tool ${toolName} for ${modulType}`);

        try {
            // Validate parameters using the tool's schema
            const validatedParams = tool.inputSchema.parse(parameters);

            // Execute the tool
            const result = await tool.handler(validatedParams);

            console.log(`✅ MCP Service Manager: Tool ${toolName} executed successfully`);
            return result;

        } catch (error) {
            console.error(`❌ MCP Service Manager: Tool ${toolName} execution failed:`, error);
            throw error;
        }
    }

    /**
     * Convert Zod schema to OpenAI function calling format
     */
    convertSchemaToOpenAI(zodSchema) {
        try {
            // Extract schema information from Zod schema
            const shape = zodSchema._def?.shape || {};
            const properties = {};
            const required = [];

            for (const [key, schema] of Object.entries(shape)) {
                const fieldSchema = schema._def;

                // Determine the type
                let type = 'string';
                if (fieldSchema?.typeName === 'ZodNumber') type = 'number';
                else if (fieldSchema?.typeName === 'ZodBoolean') type = 'boolean';
                else if (fieldSchema?.typeName === 'ZodArray') type = 'array';
                else if (fieldSchema?.typeName === 'ZodObject') type = 'object';
                else if (fieldSchema?.typeName === 'ZodEnum') type = 'string';

                // Build the property definition
                const property = {
                    type: type,
                    description: fieldSchema?.description || `Parameter: ${key}`
                };

                // Handle enums
                if (fieldSchema?.typeName === 'ZodEnum') {
                    property.enum = fieldSchema.values;
                }

                // Handle arrays
                if (fieldSchema?.typeName === 'ZodArray') {
                    property.items = { type: 'string' }; // Default to string array
                }

                properties[key] = property;

                // Check if required (not optional)
                if (fieldSchema?.typeName !== 'ZodOptional' && fieldSchema?.typeName !== 'ZodDefault') {
                    required.push(key);
                }
            }

            return {
                type: 'object',
                properties,
                required
            };

        } catch (error) {
            console.warn('⚠️ Could not convert Zod schema to OpenAI format, using fallback:', error.message);
            return {
                type: 'object',
                properties: {},
                required: []
            };
        }
    }

    /**
     * Get all registered tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }

    /**
     * Get tool statistics
     */
    getStats() {
        const stats = {
            totalTools: this.tools.size,
            toolsByModulType: {}
        };

        for (const [key, tool] of this.tools) {
            if (!stats.toolsByModulType[tool.modulType]) {
                stats.toolsByModulType[tool.modulType] = [];
            }
            stats.toolsByModulType[tool.modulType].push(tool.name);
        }

        return stats;
    }

    /**
     * Check if a tool exists
     */
    hasTool(toolName, modulType) {
        const toolKey = `${modulType}_${toolName}`;
        return this.tools.has(toolKey);
    }

    /**
     * Get tool information
     */
    getToolInfo(toolName, modulType) {
        const toolKey = `${modulType}_${toolName}`;
        return this.tools.get(toolKey);
    }

    /**
     * Start the MCP server
     */
    async startMCPServer() {
        try {
            console.log('🚀 Starting MCP Server...');

            this.mcpServer = new ModulsMCPServer();
            await this.mcpServer.start();

            this.isServerRunning = true;
            console.log('✅ MCP Server started successfully');

        } catch (error) {
            console.error('❌ Failed to start MCP Server:', error);
            // Don't throw error, continue without MCP server
            this.isServerRunning = false;
        }
    }

    /**
     * Stop the MCP server
     */
    async stopMCPServer() {
        try {
            if (this.mcpServer && this.isServerRunning) {
                console.log('🛑 Stopping MCP Server...');
                await this.mcpServer.stop();
                this.isServerRunning = false;
                console.log('✅ MCP Server stopped successfully');
            }
        } catch (error) {
            console.error('❌ Error stopping MCP Server:', error);
        }
    }

    /**
     * Get MCP server status
     */
    getMCPServerStatus() {
        if (this.mcpServer) {
            return this.mcpServer.getStatus();
        }
        return { isRunning: false, error: 'MCP Server not initialized' };
    }

    /**
     * Check if MCP server is running
     */
    isMCPServerRunning() {
        return this.isServerRunning;
    }
}

module.exports = MCPServiceManager;
