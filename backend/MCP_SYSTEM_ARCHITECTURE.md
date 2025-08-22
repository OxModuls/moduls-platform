# MCP-Based Modular Service System Architecture

## 🎯 Overview

This document describes the new Model Context Protocol (MCP) based modular service system that replaces the old modul-service approach. The system provides a clean, scalable architecture for managing AI agent tools based on their modul types.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Chat Routes  │───▶│  MessageProcessor│───▶│  LLMInterface   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ MCPServiceManager│
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Modul Tools    │
                       │   (MCP Format)   │
                       └──────────────────┘
```

## 🔧 Key Components

### 1. MCPServiceManager

- **Location**: `backend/core/services/mcp/mcp-service-manager.js`
- **Purpose**: Central manager for all MCP-compatible tools
- **Features**:
  - Tool registration by modul type
  - Schema validation using Zod
  - Tool execution and error handling
  - Statistics and monitoring

### 2. Modul Tools

- **Location**: `backend/core/services/mcp/meme-tools.js`
- **Purpose**: MCP-compatible tool implementations
- **Format**: Each tool follows MCP standards with:
  - `name`: Tool identifier
  - `title`: Human-readable title
  - `description`: Tool description
  - `inputSchema`: Zod schema for parameter validation
  - `handler`: Async function that executes the tool

### 3. MessageProcessor Integration

- **Location**: `backend/core/services/message-processor.js`
- **Purpose**: Integrates MCP tools with existing message processing
- **Features**:
  - Automatic tool discovery based on agent modul type
  - Tool execution via MCP Service Manager
  - Result integration with LLM response generation

## 🛠️ Available Tools

### MEME Modul Type

#### 1. getTokenMetrics

- **Purpose**: Get comprehensive token metrics
- **Parameters**:
  - `tokenAddress` (string, required): Token contract address
  - `timeRange` (enum: '1h', '24h', '7d', '30d', default: '24h'): Time range for metrics
- **Returns**: Price, volume, market cap, holder count, and trading data

#### 2. detectHype

- **Purpose**: Analyze token hype potential
- **Parameters**:
  - `tokenAddress` (string, required): Token contract address
  - `analysisDepth` (enum: 'basic', 'detailed', default: 'basic'): Analysis depth
- **Returns**: Hype score, level, and detailed indicators

#### 3. predictMoonPotential

- **Purpose**: Predict moon potential
- **Parameters**:
  - `tokenAddress` (string, required): Token contract address
  - `timeframe` (enum: 'short', 'medium', 'long', default: 'medium'): Prediction timeframe
- **Returns**: Moon score, potential level, and factor breakdown

#### 4. getHolderAnalysis

- **Purpose**: Analyze holder distribution
- **Parameters**:
  - `tokenAddress` (string, required): Token contract address
  - `includeStats` (boolean, default: false): Include detailed statistics
- **Returns**: Holder count, concentration metrics, and whale analysis

## 🔄 Tool Execution Flow

### 1. Message Processing

```
User Message → MessageProcessor → LLMInterface → Tool Call Request
```

### 2. Tool Execution

```
Tool Call Request → MCPServiceManager → Modul Tool → Database Query → Result
```

### 3. Response Generation

```
Tool Results → LLMInterface → Final Response → User
```

## 📊 Tool Schema Management

### Zod Schema Integration

- **Validation**: All tool parameters are validated using Zod schemas
- **Type Safety**: Ensures parameter types match expected values
- **OpenAI Compatibility**: Schemas are converted to OpenAI function calling format

### Schema Conversion

```javascript
// Zod Schema
const schema = z.object({
    tokenAddress: z.string().describe('Token contract address'),
    timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h')
});

// Converted to OpenAI Format
{
    type: 'object',
    properties: {
        tokenAddress: { type: 'string', description: 'Token contract address' },
        timeRange: { type: 'string', enum: ['1h', '24h', '7d', '30d'] }
    },
    required: ['tokenAddress']
}
```

## 🚀 Adding New Tools

### 1. Create Tool File

```javascript
// backend/core/services/mcp/new-modul-tools.js
const { z } = require("zod");

const newTool = {
	name: "toolName",
	title: "Tool Title",
	description: "Tool description",
	inputSchema: z.object({
		param1: z.string().describe("Parameter description"),
		param2: z.number().default(0),
	}),
	async handler({ param1, param2 }) {
		// Tool implementation
		return {
			content: [{ type: "text", text: "Result" }],
		};
	},
};

module.exports = { newTool };
```

### 2. Register in MCPServiceManager

```javascript
// In mcp-service-manager.js
const newModulTools = require("./new-modul-tools");

// In initializeTools()
this.registerModulTools("NEW_MODUL_TYPE", newModulTools);
```

### 3. Update MessageProcessor

```javascript
// In message-processor.js, add new modul type handling if needed
```

## 🔍 Monitoring and Debugging

### Logging

- **Tool Registration**: Logs when tools are registered
- **Tool Execution**: Logs tool calls and results
- **Error Handling**: Logs detailed error information
- **Performance**: Logs execution times and statistics

### Statistics

```javascript
// Get MCP system stats
const stats = mcpServiceManager.getStats();
console.log(stats);
// Output:
{
    totalTools: 4,
    toolsByModulType: {
        MEME: ['getTokenMetrics', 'detectHype', 'predictMoonPotential', 'getHolderAnalysis']
    }
}
```

## 🧪 Testing

### Manual Testing

```javascript
const MCPServiceManager = require("./core/services/mcp/mcp-service-manager");

const mcpManager = new MCPServiceManager();

// Test tool availability
const tools = mcpManager.getAvailableTools("MEME");
console.log(
	"Available tools:",
	tools.map((t) => t.name)
);

// Test tool execution
const result = await mcpManager.executeTool(
	"getTokenMetrics",
	{
		tokenAddress: "0x123...",
		timeRange: "24h",
	},
	"MEME"
);
```

### Integration Testing

- **Message Processing**: Test complete message flow with tools
- **Error Handling**: Test tool failures and error responses
- **Schema Validation**: Test parameter validation and type checking

## 🔧 Configuration

### Environment Variables

```bash
# Required for LLM functionality
GROQ_API_KEY=your_groq_api_key

# Optional for additional LLM providers
AZURE_AI_KEY=your_azure_key
AZURE_AI_ENDPOINT=your_azure_endpoint
```

### Database Requirements

- **MongoDB**: Required for tool data access
- **Collections**: `trading_metrics`, `trading_transactions`, `token_holders`
- **Indexes**: Ensure proper indexing for performance

## 🚀 Future Enhancements

### 1. Additional Modul Types

- **GAMING_BUDDY**: Gaming-related tools and analysis
- **TRADING_ASSISTANT**: Trading and market analysis tools
- **PORTFOLIO_WATCHER**: Portfolio tracking and analysis
- **SOCIAL_SENTINEL**: Social media sentiment analysis

### 2. Advanced Features

- **Tool Chaining**: Execute multiple tools in sequence
- **Caching**: Cache tool results for performance
- **Rate Limiting**: Prevent tool abuse
- **Async Execution**: Parallel tool execution

### 3. MCP Protocol Features

- **Resource Management**: Expose data as MCP resources
- **Streaming**: Real-time data streaming
- **Authentication**: Secure tool access
- **Monitoring**: Advanced metrics and health checks

## 🐛 Troubleshooting

### Common Issues

#### 1. Tool Not Found

- **Cause**: Tool not registered for modul type
- **Solution**: Check tool registration in MCPServiceManager
- **Debug**: Verify tool file exists and is properly exported

#### 2. Schema Validation Errors

- **Cause**: Invalid parameters passed to tool
- **Solution**: Check parameter types and required fields
- **Debug**: Review Zod schema definitions

#### 3. Database Connection Issues

- **Cause**: MongoDB not running or connection failed
- **Solution**: Verify MongoDB connection
- **Debug**: Check database logs and connection string

#### 4. Tool Execution Failures

- **Cause**: Tool implementation error or external service failure
- **Solution**: Check tool logs and external service status
- **Debug**: Review tool handler implementation

### Debug Commands

```javascript
// Enable detailed logging
console.log("MCP Stats:", mcpServiceManager.getStats());
console.log("Available tools:", mcpServiceManager.getAllTools());

// Check specific tool
const toolInfo = mcpServiceManager.getToolInfo("getTokenMetrics", "MEME");
console.log("Tool info:", toolInfo);
```

## 📚 References

- **MCP Documentation**: [modelcontextprotocol.io](https://modelcontextprotocol.io/)
- **MCP SDK**: [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- **Zod Documentation**: [zod.dev](https://zod.dev/)
- **OpenAI Function Calling**: [OpenAI API Documentation](https://platform.openai.com/docs/guides/function-calling)

## 🎉 Conclusion

The new MCP-based modular service system provides:

- **🎯 Clean Architecture**: Well-defined separation of concerns
- **🛠️ Scalable Tools**: Easy to add new tools and modul types
- **🔒 Type Safety**: Zod schema validation for all parameters
- **📊 Monitoring**: Comprehensive logging and statistics
- **🚀 Performance**: Efficient tool execution and caching
- **🔄 Integration**: Seamless integration with existing systems

This architecture sets the foundation for a robust, scalable AI agent system that can easily accommodate new tools and capabilities as the platform grows.
