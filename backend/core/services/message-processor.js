const LLMInterface = require('./llm-interface');
const MCPClient = require('./mcp/mcp-client');
const Agent = require('../models/agents');
const Message = require('../models/messages');
const Thread = require('../models/threads');

class MessageProcessor {
    constructor() {
        this.llm = new LLMInterface();
        this.mcpClient = null;
        this.initialized = false;
        this.initialize();
    }

    async initialize() {
        try {
            console.log('🔧 Initializing MessageProcessor...');
            this.mcpClient = new MCPClient();
            await this.mcpClient.connectToServer('./start-mcp-server.js');
            this.initialized = true;
            console.log('✅ MessageProcessor initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize MessageProcessor:', error);
            // Continue without MCP tools
        }
    }

    prepareMessagesForLLM(messages, maxMessages = 5) {
        // Take only the most recent messages
        return messages.slice(-maxMessages);
    }

    async processMessage(threadId, messageId, messageData) {
        try {
            // console.log('Processing message:', { threadId, messageId, messageData });

            // Get thread and agent info
            const thread = await Thread.findOne({ uniqueId: threadId }).populate('agentId');
            if (!thread) {
                throw new Error(`Thread not found: ${threadId}`);
            }

            const agent = thread.agentId;
            if (!agent) {
                throw new Error(`Agent not found for thread: ${threadId}`);
            }

            // Check if message already exists
            let userMessage = await Message.findOne({ uniqueId: messageId });

            if (userMessage) {
                // If message exists and is pending or failed, update it
                if (userMessage.status === 'failed' || userMessage.status === 'pending') {
                    userMessage.content = messageData.content;
                    userMessage.messageType = messageData.messageType || 'text';
                    userMessage.metadata = messageData.metadata || {};
                    userMessage.status = 'processing';
                    await userMessage.save();
                } else if (userMessage.status === 'processing') {
                    // Message is already being processed
                    throw new Error(`Message ${messageId} is already being processed`);
                } else {
                    // Message already completed
                    throw new Error(`Message ${messageId} already processed with status: ${userMessage.status}`);
                }
            } else {
                // Create new message
                userMessage = new Message({
                    uniqueId: messageId,
                    threadId: thread._id,
                    agentId: thread.agentId,
                    userId: thread.userId,
                    content: messageData.content,
                    role: 'user',
                    messageType: messageData.messageType || 'text',
                    metadata: messageData.metadata || {},
                    status: 'processing'
                });
                await userMessage.save();
            }

            // Load conversation history (only user and assistant messages)
            const rawHistory = await Message.find({
                threadId: thread._id,
                role: { $in: ['user', 'assistant'] },
                status: 'completed'
            })
                .sort({ createdAt: 1 })
                .select('role content')
                .lean();

            // Format messages for LLM
            const messages = rawHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Add current user message to history
            messages.push({
                role: 'user',
                content: messageData.content
            });

            // Process with LLM
            const sanitizedAgent = JSON.parse(JSON.stringify(agent, (key, value) => {
                if (typeof value === 'bigint') {
                    return value.toString();
                }
                return value;
            }));

            const context = {
                modulType: agent.modulType,
                agentName: agent.name,
                agent: sanitizedAgent,
                threadId: threadId,
                messageId: messageId
            };

            // First LLM call
            const llmResponse = await this.llm.processMessage(messages, this.mcpClient.tools, context);

            let finalContent;

            if (llmResponse.type === 'tool_calls') {
                // Handle tool calls in memory
                const toolResults = [];
                const toolMessages = [];

                // Execute tools and collect responses
                for (const toolCall of llmResponse.toolCalls) {
                    const { id, function: { name, arguments: args } } = toolCall;
                    const toolArgs = typeof args === 'string' ? JSON.parse(args) : args;

                    console.log(`🔧 Executing tool: ${name} with args:`, toolArgs);

                    const toolResult = await this.mcpClient.executeTool(name, toolArgs);

                    toolResults.push({
                        toolCallId: id,
                        toolName: name,
                        result: toolResult
                    });

                    toolMessages.push({
                        role: 'tool',
                        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
                        tool_call_id: id
                    });
                }

                // Add assistant's function call message
                toolMessages.unshift({
                    role: 'assistant',
                    content: llmResponse.content || 'Analyzing...',
                    function_call: {
                        name: llmResponse.toolCalls[0].function.name,
                        arguments: llmResponse.toolCalls[0].function.arguments
                    }
                });

                // Make final LLM call with tool results
                const finalMessages = [...messages, ...toolMessages];
                console.log('Final messages for LLM:', finalMessages);
                const finalResponse = await this.llm.processMessage(finalMessages, [], context);
                finalContent = finalResponse.content;

            } else {
                // Direct text response
                finalContent = llmResponse.content;
            }

            // Validate final content
            if (!finalContent) {
                throw new Error('LLM returned empty response');
            }

            // Create assistant message ID
            const assistantMessageId = this.generateUniqueId('msg');

            // Check if assistant message already exists
            let assistantMessage = await Message.findOne({ uniqueId: assistantMessageId });

            if (assistantMessage) {
                // If message exists but failed, update it
                if (assistantMessage.status === 'failed') {
                    assistantMessage.content = finalContent;
                    assistantMessage.messageType = 'text';
                    assistantMessage.status = 'completed';
                    assistantMessage.model = 'groq-llama3-8b';
                    assistantMessage.responseTime = Date.now() - new Date().getTime();
                    assistantMessage.metadata = {
                        toolsUsed: llmResponse.type === 'tool_calls' ? llmResponse.toolCalls.length : 0
                    };
                    await assistantMessage.save();
                } else {
                    // Generate a new unique ID and create new message
                    assistantMessage = new Message({
                        uniqueId: this.generateUniqueId('msg'),
                        threadId: thread._id,
                        agentId: thread.agentId,
                        userId: thread.userId,
                        role: 'assistant',
                        content: finalContent,
                        messageType: 'text',
                        status: 'completed',
                        model: 'groq-llama3-8b',
                        responseTime: Date.now() - new Date().getTime(),
                        metadata: {
                            toolsUsed: llmResponse.type === 'tool_calls' ? llmResponse.toolCalls.length : 0
                        },
                        parentMessageId: userMessage._id
                    });
                    await assistantMessage.save();
                }
            } else {
                // Create new message
                assistantMessage = new Message({
                    uniqueId: assistantMessageId,
                    threadId: thread._id,
                    agentId: thread.agentId,
                    userId: thread.userId,
                    role: 'assistant',
                    content: finalContent,
                    messageType: 'text',
                    status: 'completed',
                    model: 'groq-llama3-8b',
                    responseTime: Date.now() - new Date().getTime(),
                    metadata: {
                        toolsUsed: llmResponse.type === 'tool_calls' ? llmResponse.toolCalls.length : 0
                    },
                    parentMessageId: userMessage._id
                });
                await assistantMessage.save();
            }

            // Update user message status
            userMessage.status = 'completed';
            await userMessage.save();

            // Update thread statistics
            await Thread.findByIdAndUpdate(thread._id, {
                $inc: { messageCount: 1 },
                lastMessageAt: new Date()
            });

            return {
                success: true,
                response: finalContent,
                assistantMessage,
                assistantMessageId: assistantMessage._id,
                processingTime: Date.now() - new Date().getTime()
            };

        } catch (error) {
            console.error('Message processing failed:', error);

            // Update message status to failed
            if (messageId) {
                await this.updateMessageStatus(messageId, 'failed', { error: error.message });
            }

            throw new Error(`Message processing failed: ${error.message}`);
        }
    }

    async createAssistantMessage(threadId, agentId, userId, content, parentMessageId) {
        const message = new Message({
            uniqueId: this.generateUniqueId('msg'),
            threadId: threadId,
            agentId: agentId,
            userId: userId,
            content: content,
            role: 'assistant',
            messageType: 'text',
            status: 'completed',
            model: 'groq-llama3-8b',
            parentMessageId: parentMessageId // Link to the user message
        });

        await message.save();

        // Update thread statistics
        await Thread.findByIdAndUpdate(threadId, {
            $inc: { messageCount: 1 },
            lastMessageAt: new Date()
        });

        return message;
    }

    async updateMessageStatus(messageId, status, metadata = {}) {
        await Message.findOneAndUpdate(
            { uniqueId: messageId },
            {
                status,
                ...metadata,
                updatedAt: new Date()
            }
        );
    }

    generateUniqueId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Execute tool calls using MCP Client
     */
    async executeToolCallsViaMCP(toolCalls, modulType) {
        const results = [];
        console.log(`🛠️ MCP: Executing ${toolCalls.length} tool calls for ${modulType} modul type...`);

        for (const toolCall of toolCalls) {
            try {
                const { name, arguments: args } = toolCall.function;
                const parameters = JSON.parse(args);

                console.log(`🔧 MCP: Executing tool: ${name} with params:`, parameters);

                const result = await this.mcpClient.executeTool(name, parameters);
                console.log(`✅ MCP: Tool ${name} executed successfully:`, result);

                results.push({
                    toolCallId: toolCall.id,
                    toolName: name,
                    result: result
                });

            } catch (error) {
                console.error(`❌ MCP: Tool execution failed for ${toolCall.function.name}:`, error);
                results.push({
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    error: error.message
                });
            }
        }

        console.log(`📊 MCP: Tool execution complete. Results:`, results);
        return results;
    }

    // Get processing statistics
    getStats() {
        const stats = {
            llmProvider: this.llm.getConfig().defaultProvider,
            llmModel: this.llm.getConfig().defaultModel,
            availableProviders: this.llm.getAvailableProviders(),
            initialized: this.initialized
        };

        if (this.mcpClient) {
            stats.mcpClientStatus = {
                initialized: this.initialized,
                isConnected: this.mcpClient.isConnected
            };
        }

        return stats;
    }
}

module.exports = MessageProcessor;
