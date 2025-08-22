const ModulService = require('./modul-services');
const LLMInterface = require('./llm-interface');
const Agent = require('../models/agents');
const Message = require('../models/messages');
const Thread = require('../models/threads');

class MessageProcessor {
    constructor() {
        this.llm = new LLMInterface();
    }

    async processMessage(threadId, messageId, messageData) {
        try {
            console.log('Processing message:', { threadId, messageId, messageData });

            // Get thread and agent info
            const thread = await Thread.findOne({ uniqueId: threadId }).populate('agentId');
            if (!thread) {
                throw new Error(`Thread not found: ${threadId}`);
            }

            const agent = thread.agentId;
            if (!agent) {
                throw new Error(`Agent not found for thread: ${threadId}`);
            }

            // Get the user message that triggered this response
            const userMessage = await Message.findOne({ uniqueId: messageId });
            if (!userMessage) {
                throw new Error(`User message not found: ${messageId}`);
            }

            console.log('Processing message for agent:', {
                name: agent.name,
                modulType: agent.modulType,
                agentId: agent._id
            });

            // Create modul service
            const modulService = new ModulService(agent.modulType, agent._id.toString());
            const availableTools = modulService.getAvailableTools();

            console.log('Available tools:', availableTools.map(t => t.name));

            // Build conversation history (last 40 messages) for context
            const rawHistory = await Message.find({ threadId: thread._id })
                .sort({ createdAt: 1 })
                .select('role content')
                .lean();

            const history = rawHistory
                .filter(m => m && m.content && (m.role === 'user' || m.role === 'assistant'))
                .slice(-40)
                .map(m => ({ role: m.role, content: m.content }));

            // Process with LLM
            // Sanitize agent object to avoid BigInt serialization issues
            const sanitizedAgent = JSON.parse(JSON.stringify(agent, (key, value) => {
                if (typeof value === 'bigint') {
                    return value.toString();
                }
                return value;
            }));

            const context = {
                modulType: agent.modulType,
                agentName: agent.name,
                agent: sanitizedAgent, // Sanitized agent object without BigInt issues
                threadId: threadId,
                messageId: messageId
            };

            const llmResponse = await this.llm.processMessage(history, availableTools, context);

            let finalResponse;

            if (llmResponse.type === 'tool_calls') {
                // Execute tool calls
                const toolResults = await this.llm.executeToolCalls(
                    llmResponse.toolCalls,
                    modulService
                );

                // Generate final response based on tool results
                finalResponse = await this.llm.generateFinalResponse(toolResults, context, history);
            } else {
                // Direct text response
                finalResponse = llmResponse.content;
            }

            // Create assistant message
            const assistantMessage = await this.createAssistantMessage(
                thread._id,
                thread.agentId,
                thread.userId,
                finalResponse,
                userMessage._id // Pass the user message ObjectId as parent
            );

            // Update message status
            await this.updateMessageStatus(messageId, 'completed', {
                response: finalResponse,
                toolsUsed: llmResponse.type === 'tool_calls' ? llmResponse.toolCalls.length : 0
            });

            return {
                success: true,
                response: finalResponse,
                assistantMessage: assistantMessage,
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

    // Get processing statistics
    getStats() {
        return {
            llmProvider: this.llm.getConfig().defaultProvider,
            llmModel: this.llm.getConfig().defaultModel,
            availableProviders: this.llm.getAvailableProviders()
        };
    }
}

module.exports = MessageProcessor;
