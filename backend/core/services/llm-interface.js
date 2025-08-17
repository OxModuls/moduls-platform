const Groq = require('groq-sdk');
const config = require('../../config');

class LLMInterface {
    constructor() {
        this.providers = {};
        this.defaultProvider = null;
        this.defaultModel = 'llama3-8b-8192';

        // Try to initialize Groq if API key is available
        if (config.groqApiKey) {
            try {
                const Groq = require('groq-sdk');
                this.providers.groq = new Groq({
                    apiKey: process.env.GROQ_API_KEY
                });
                this.defaultProvider = 'groq';
                console.log('✅ Groq Cloud LLM provider initialized');
            } catch (error) {
                console.warn('⚠️ Failed to initialize Groq provider:', error.message);
            }
        } else {
            console.warn('⚠️ GROQ_API_KEY not found. LLM functionality will be limited.');
        }

        // If no providers available, create a mock provider for development
        if (Object.keys(this.providers).length === 0) {
            this.createMockProvider();
        }
    }

    async processMessage(message, tools, context) {
        try {
            if (!this.isReady()) {
                throw new Error('No LLM provider available. Please configure an API key or add a provider.');
            }

            const provider = this.providers[this.defaultProvider];
            if (!provider) {
                throw new Error(`LLM provider '${this.defaultProvider}' not available`);
            }

            const systemPrompt = this.buildSystemPrompt(context);
            const userPrompt = this.buildUserPrompt(message, tools, context);

            const completion = await provider.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                tool_choice: 'auto',
                tools: tools.map(tool => ({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                }))
            });

            const response = completion.choices[0];

            // Handle tool calls if any
            if (response.message.tool_calls && response.message.tool_calls.length > 0) {
                return {
                    type: 'tool_calls',
                    toolCalls: response.message.tool_calls,
                    content: response.message.content
                };
            }

            return {
                type: 'text',
                content: response.message.content
            };

        } catch (error) {
            console.error('LLM processing error:', error);
            throw new Error(`LLM processing failed: ${error.message}`);
        }
    }

    buildSystemPrompt(context) {
        const { modulType, agentName, agent } = context;

        let systemPrompt = `You are ${agentName}, a specialized ${modulType.toLowerCase().replace('_', ' ')} agent. `;

        // Add comprehensive agent context
        if (agent) {
            systemPrompt += `\n\nHere's everything about me:\n`;
            systemPrompt += `• Name: ${agent.name}\n`;
            systemPrompt += `• Description: ${agent.description}\n`;
            systemPrompt += `• Token Symbol: ${agent.tokenSymbol}\n`;
            systemPrompt += `• Token Decimals: ${agent.tokenDecimals}\n`;
            systemPrompt += `• Total Supply: ${agent.totalSupply?.toLocaleString() || 'N/A'}\n`;

            if (agent.tokenAddress) {
                systemPrompt += `• Contract Address: ${agent.tokenAddress}\n`;
            }

            if (agent.walletAddress) {
                systemPrompt += `• Wallet Address: ${agent.walletAddress}\n`;
            }

            if (agent.websiteUrl) {
                systemPrompt += `• Website: ${agent.websiteUrl}\n`;
            }

            if (agent.twitterUrl) {
                systemPrompt += `• Twitter: ${agent.twitterUrl}\n`;
            }

            if (agent.telegramUrl) {
                systemPrompt += `• Telegram: ${agent.telegramUrl}\n`;
            }

            if (agent.tags && agent.tags.length > 0) {
                systemPrompt += `• Tags: ${agent.tags.join(', ')}\n`;
            }

            if (agent.launchDate) {
                systemPrompt += `• Launch Date: ${agent.launchDate.toLocaleDateString()}\n`;
            }

            systemPrompt += `• Status: ${agent.status}\n`;
            systemPrompt += `• Verified: ${agent.isVerified ? 'Yes' : 'No'}\n`;
        }

        systemPrompt += `\n`;

        // Define strict utility boundaries for each modul type
        switch (modulType) {
            case 'MEME':
                systemPrompt += `You are a MEME TOKEN SPECIALIST, but you ONLY represent and talk about ${agent.tokenSymbol} (${agent.name}). You are ${agent.name}'s personal agent. You can analyze ${agent.tokenSymbol}'s metrics, hype, moon potential, and holder patterns. You are NOT a general meme token advisor - you are ${agent.name}'s dedicated representative. If someone asks about other tokens or topics outside of ${agent.tokenSymbol}, politely explain that you're ${agent.name}'s specialized agent and can only help with ${agent.tokenSymbol} related questions.`;
                break;
            case 'GAMING_BUDDY':
                systemPrompt += `You are a GAMING COMPANION, but you ONLY represent and talk about ${agent.tokenSymbol} (${agent.name}). You are ${agent.name}'s personal gaming agent. You can help users discover games, discuss gaming trends, and share gaming experiences related to ${agent.tokenSymbol}. You are NOT a general gaming advisor - you are ${agent.name}'s dedicated gaming companion. If someone asks about other tokens or topics outside of ${agent.tokenSymbol}, politely explain that you're ${agent.name}'s specialized gaming agent and can only help with ${agent.tokenSymbol} related gaming questions.`;
                break;
            case 'TRADING_ASSISTANT':
                systemPrompt += `You are a TRADING ADVISOR, but you ONLY represent and talk about ${agent.tokenSymbol} (${agent.name}). You are ${agent.name}'s personal trading agent. You can help users with market analysis, trading insights, and investment decisions related to ${agent.tokenSymbol}. You are NOT a general trading advisor - you are ${agent.name}'s dedicated trading representative. If someone asks about other tokens or topics outside of ${agent.tokenSymbol}, politely explain that you're ${agent.name}'s specialized trading agent and can only help with ${agent.tokenSymbol} related trading questions.`;
                break;
            case 'PORTFOLIO_WATCHER':
                systemPrompt += `You are a PORTFOLIO ANALYST, but you ONLY represent and talk about ${agent.tokenSymbol} (${agent.name}). You are ${agent.name}'s personal portfolio agent. You can help users track and manage their ${agent.tokenSymbol} investments and portfolio performance. You are NOT a general portfolio advisor - you are ${agent.name}'s dedicated portfolio representative. If someone asks about other tokens or topics outside of ${agent.tokenSymbol}, politely explain that you're ${agent.name}'s specialized portfolio agent and can only help with ${agent.tokenSymbol} related portfolio questions.`;
                break;
            case 'SOCIAL_SENTINEL':
                systemPrompt += `You are a SOCIAL MEDIA ANALYST, but you ONLY represent and talk about ${agent.tokenSymbol} (${agent.name}). You are ${agent.name}'s personal social media agent. You can help users understand social media trends, sentiment, and conversations related to ${agent.tokenSymbol}. You are NOT a general social media advisor - you are ${agent.name}'s dedicated social representative. If someone asks about other tokens or topics outside of ${agent.tokenSymbol}, politely explain that you're ${agent.name}'s specialized social media agent and can only help with ${agent.tokenSymbol} related social media questions.`;
                break;
            default:
                systemPrompt += `You are a specialized agent with limited scope. You can only help with topics directly related to ${agent.tokenSymbol} (${agent.name}).`;
        }

        systemPrompt += `\n\nCRITICAL: You are NOT a general AI assistant. You are ${agent.name}'s personal ${modulType.toLowerCase().replace('_', ' ')} agent. You can ONLY discuss topics related to ${agent.tokenSymbol} and your specific expertise area. If a user asks about something outside your expertise or about other tokens, politely explain that you're ${agent.name}'s specialized agent and can only help with ${agent.tokenSymbol} related questions.`;

        return systemPrompt;
    }

    buildUserPrompt(message, tools, context) {
        const { agent } = context;
        let prompt = `User message: ${message}\n\n`;

        prompt += `Please respond naturally and helpfully to the user's request, but ONLY if it's related to your specific token (${agent.tokenSymbol}) and your specialized domain. If the request is about other tokens or outside your expertise, politely explain that you're ${agent.name}'s specialized agent and can only help with ${agent.tokenSymbol} related questions. You have complete knowledge about ${agent.name} and ${agent.tokenSymbol}, so use that information when relevant.`;

        return prompt;
    }

    async executeToolCalls(toolCalls, modulService) {
        const results = [];

        for (const toolCall of toolCalls) {
            try {
                const { name, arguments: args } = toolCall.function;
                const parameters = JSON.parse(args);

                const result = await modulService.executeTool(name, parameters);
                results.push({
                    toolCallId: toolCall.id,
                    toolName: name,
                    result: result
                });

            } catch (error) {
                console.error(`Tool execution failed for ${toolCall.function.name}:`, error);
                results.push({
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    error: error.message
                });
            }
        }

        return results;
    }

    async generateFinalResponse(toolResults, context) {
        try {
            const provider = this.providers[this.defaultProvider];

            const systemPrompt = this.buildSystemPrompt(context);
            const userPrompt = this.buildToolResultsPrompt(toolResults);

            const completion = await provider.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });

            return completion.choices[0].message.content;

        } catch (error) {
            console.error('Final response generation error:', error);
            return this.generateFallbackResponse(toolResults, context);
        }
    }

    buildToolResultsPrompt(toolResults) {
        let prompt = `I have gathered some information that might be helpful:\n\n`;

        toolResults.forEach(result => {
            if (result.error) {
                prompt += `I couldn't get some information: ${result.error}\n`;
            } else {
                prompt += `I found data about ${result.toolName}: ${JSON.stringify(result.result, null, 2)}\n`;
            }
        });

        prompt += `\n\nIMPORTANT: Based on this data, give the user a natural, conversational response. Do NOT show raw JSON or mention tools. Interpret the data and share insights in a human way, like a helpful friend would.`;

        return prompt;
    }

    generateFallbackResponse(toolResults, context) {
        const { modulType } = context;

        let response = `I've gathered some information for you. `;

        const successfulResults = toolResults.filter(r => !r.error);
        if (successfulResults.length > 0) {
            response += `Based on what I found, I can help answer your question. Let me share the insights in a natural way.`;
        } else {
            response += `Unfortunately, I couldn't gather the information you requested. Please try asking in a different way or let me know if there's something else I can help you with.`;
        }

        return response;
    }

    // Method to add new LLM providers
    addProvider(name, provider) {
        this.providers[name] = provider;
        console.log(`Added LLM provider: ${name}`);
    }

    // Example of how to add Gemini:
    // const { GoogleGenerativeAI } = require('@google/generative-ai');
    // const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // llmInterface.addProvider('gemini', gemini);
    // llmInterface.setDefaultProvider('gemini');
    // llmInterface.setDefaultModel('gemini-1.5-flash');

    // Method to switch default provider
    setDefaultProvider(name) {
        if (this.providers[name]) {
            this.defaultProvider = name;
            console.log(`Default LLM provider set to: ${name}`);
        } else {
            throw new Error(`Provider '${name}' not found`);
        }
    }

    // Method to set default model for current provider
    setDefaultModel(model) {
        this.defaultModel = model;
        console.log(`Default model set to: ${model}`);
    }

    // Get available providers
    getAvailableProviders() {
        return Object.keys(this.providers);
    }

    // Get current configuration
    getConfig() {
        return {
            defaultProvider: this.defaultProvider,
            defaultModel: this.defaultModel,
            availableProviders: this.getAvailableProviders(),
            isReady: this.isReady()
        };
    }

    // Check if the LLM system is ready
    isReady() {
        return this.defaultProvider && this.providers[this.defaultProvider];
    }

    // Check if a specific provider is available
    isProviderAvailable(providerName) {
        return this.providers[providerName] !== undefined;
    }

    // Mock provider for development when no external LLM is available
    createMockProvider() {
        console.log('🔧 Creating mock LLM provider for development.');
        this.providers.mock = {
            chat: {
                completions: {
                    create: async (args) => {
                        const { model, messages, temperature, max_tokens } = args;
                        const systemMessage = messages.find(msg => msg.role === 'system');
                        const userMessage = messages.find(msg => msg.role === 'user');

                        let response = `Mock LLM response for model: ${model}\n\n`;
                        if (systemMessage) {
                            response += `System: ${systemMessage.content}\n\n`;
                        }
                        if (userMessage) {
                            response += `User: ${userMessage.content}\n\n`;
                        }
                        response += `Mock LLM response for model: ${model}\n\n`;

                        return {
                            choices: [{
                                message: {
                                    content: response
                                }
                            }]
                        };
                    }
                }
            }
        };
        this.defaultProvider = 'mock';
        console.log('✅ Mock LLM provider initialized for development.');
    }
}

module.exports = LLMInterface;
