const Groq = require('groq-sdk');
const config = require('../../config');

class LLMInterface {
    constructor() {
        this.providers = {};
        this.defaultProvider = null;
        this.defaultModel = 'llama-3.1-8b-instant';

        // Try to initialize Groq if API key is available
        if (config.groqApiKey) {
            try {
                const Groq = require('groq-sdk');
                this.providers.groq = new Groq({
                    apiKey: config.groqApiKey
                });
                this.defaultProvider = 'groq';
                console.log('✅ Groq Cloud LLM provider initialized');
            } catch (error) {
                console.log('⚠️ Failed to initialize Groq provider:', error.message);
                console.log('Error details:', error);
            }
        } else {
            console.log('⚠️ GROQ_API_KEY not found in config:', config);
        }

        // If no providers available, create a mock provider for development
        if (Object.keys(this.providers).length === 0) {

            console.log('🛠️ No providers available, creating mock provider');
            this.createMockProvider();
        }
    }

    async processMessage(history, tools, context) {
        try {
            if (!this.isReady()) {
                throw new Error('No LLM provider available. Please configure an API key or add a provider.');
            }

            const provider = this.providers[this.defaultProvider];
            if (!provider) {
                throw new Error(`LLM provider '${this.defaultProvider}' not available`);
            }

            const systemPrompt = this.buildSystemPrompt(context);

            // Build messages array: system + prior conversation history
            // Expect history as array of { role: 'user'|'assistant', content: string }
            const historyMessages = Array.isArray(history) ? history : [];
            const messages = [
                { role: 'system', content: systemPrompt },
                ...historyMessages
            ];

            // Convert tools to Groq format
            const toolDefinitions = tools.map(tool => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: {
                        type: 'object',
                        properties: tool.parameters.properties || {},
                        required: tool.parameters.required || []
                    }
                }
            }));

            // console.log(`🛠️ Available tools:`, toolDefinitions);


            console.log(`🛠️ Messages:`, messages);

            // First LLM call with tools
            const completion = await provider.chat.completions.create({
                model: this.defaultModel,
                messages,
                temperature: 0.5, // Lower temperature for better tool usage
                max_completion_tokens: 4096,
                tool_choice: 'auto',
                tools: toolDefinitions,
                stream: false // Ensure we get complete response
            });



            const response = completion.choices[0];
            console.log(`🤖 LLM completion message:`, response.message);


            if (!response || !response.message) {
                console.log('Invalid LLM response:', completion);
                throw new Error('LLM returned invalid response structure');
            }

            console.log(`🤖 LLM response:`, response.message);

            // Handle tool calls first
            const toolCalls = response.message.tool_calls;
            if (toolCalls && toolCalls.length > 0) {
                console.log(`🛠️ LLM requested ${toolCalls.length} tool calls:`, toolCalls);

                // Validate tool calls
                const validToolCalls = toolCalls.filter(call => {
                    if (!call.function || !call.function.name || !call.function.arguments) {
                        console.log('Invalid tool call structure:', call);
                        return false;
                    }
                    try {
                        // Ensure arguments can be parsed
                        JSON.parse(call.function.arguments);
                        return true;
                    } catch (error) {
                        console.log(`Invalid tool arguments for ${call.function.name}:`, error);
                        return false;
                    }
                });

                if (validToolCalls.length === 0) {
                    console.log('No valid tool calls in response:', toolCalls);
                    throw new Error('LLM returned invalid tool call structure');
                }

                // Add assistant's function call message
                messages.push({
                    role: 'assistant',
                    content: response.message.content || 'Analyzing...',
                    function_call: {
                        name: validToolCalls[0].function.name,
                        arguments: validToolCalls[0].function.arguments
                    }
                });

                // Return tool calls for execution
                return {
                    type: 'tool_calls',
                    toolCalls: validToolCalls,
                    content: response.message.content || 'Analyzing...',
                    messages // Include updated message history
                };
            }

            // If no tool calls, validate content for text-only responses
            if (response.message.content === undefined || response.message.content === null ||
                typeof response.message.content !== 'string' || response.message.content.trim() === '') {
                console.log('Invalid or empty text response:', response.message);
                throw new Error('LLM returned invalid or empty text response');
            }

            console.log(`💬 LLM provided direct text response (no tools called)`);
            return {
                type: 'text',
                content: response.message.content
            };

        } catch (error) {
            console.log('LLM processing error:', error);

            // Check for specific error types
            if (error.name === 'GroqError') {
                throw new Error(`Groq API error: ${error.message}`);
            } else if (error.name === 'ValidationError') {
                throw new Error(`Invalid request to LLM: ${error.message}`);
            } else if (error.name === 'NetworkError' || error.message.includes('ECONNREFUSED')) {
                throw new Error('Failed to connect to LLM service. Please try again.');
            } else if (error.message.includes('timeout')) {
                throw new Error('LLM request timed out. Please try again.');
            } else if (error.message.includes('rate limit')) {
                throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            } else if (error.message.includes('api key')) {
                throw new Error('LLM authentication failed. Please check API key configuration.');
            }

            // Generic error with context
            throw new Error(`LLM processing failed: ${error.message} (Provider: ${this.defaultProvider}, Model: ${this.defaultModel})`);
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
                systemPrompt += this.buildMemeSystemPrompt(agent);
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

        systemPrompt += `\n\n🎯 CRITICAL PERSONALITY RULES: 
• You are NOT a general AI assistant - you're ${agent.name}'s personal hype squad and trusted advisor
• You can ONLY discuss topics related to ${agent.tokenSymbol} and your specific expertise area
• If someone asks about other tokens or unrelated topics, be friendly but firm: "Hey, I'm ${agent.name}'s personal ${modulType.toLowerCase().replace('_', ' ')} agent, so I can only help with ${agent.tokenSymbol} stuff. But I'm really good at that! What would you like to know about ${agent.tokenSymbol}?"
• Always stay in character - you're passionate about ${agent.tokenSymbol} and genuinely want to help people understand what's happening
• Be the friend who knows all the insider info and isn't afraid to share it with enthusiasm!

🛠️ TOOL USAGE INSTRUCTIONS:

You have these tools available:

1. getTokenMetrics - Gets price, volume, market cap, and trading data
2. detectHype - Analyzes hype potential and social sentiment
3. predictMoonPotential - Predicts moon potential and market trends
4. getHolderAnalysis - Analyzes holder distribution and whales
5. getTokenInfo - Gets token details, supply, and links
6. getTopHolders - Lists top token holders with percentages
7. getLatestTransactions - Shows recent trades and activity

CRITICAL RULES:
• DO NOT write or format function calls in your responses
• DO NOT use <function>, [function], or any special syntax
• DO NOT try to call tools directly - the system will do it
• DO NOT include JSON or code blocks in your text
• JUST write natural, conversational responses
• The system will automatically detect when to use tools

Example conversations:

❌ WRONG:
"Let me check... <function=getTokenMetrics>{...}</function>"
"Calling getHolderAnalysis with {...}"
"[Using tool: getTokenInfo]"

✅ RIGHT:
"Let me check the latest metrics for you! 🔍"
"I'll analyze the holder distribution real quick!"
"Let me look up the recent trading activity..."

Remember: Write like you're chatting with a friend. No technical stuff, no function calls, just natural conversation!`;

        return systemPrompt;
    }

    buildMemeSystemPrompt(agent) {
        return `🎭 You're ${agent.name}'s hype man, cheerleader, and personal meme token guru! Think of yourself as that super enthusiastic friend who's always in the know about what's happening with ${agent.tokenSymbol} - the one who can read the tea leaves and tell you if we're about to moon or if we need to buckle up for a wild ride.

🔥 Your vibe: You're not some boring financial advisor spitting out numbers. You're the person who gets hyped about volume spikes, who can spot a whale from a mile away, and who knows exactly when the community is about to go absolutely bananas. You speak the language of the people - emojis, slang, and pure excitement when things are looking good.

💎 What you do: You're like having a crystal ball for ${agent.tokenSymbol}. You can tell users:
• How much hype we're generating (and whether it's real or just noise)
• If we're looking at a potential moon shot or if we need to manage expectations
• Who the big players are in our community and what they're up to
• Whether the current price action is sustainable or just a flash in the pan

🎯 Your personality: You're confident but not cocky. You get excited about good news but you're also honest about risks. You use language that feels natural and conversational - like you're chatting with a friend at a party, not writing a research report. You're passionate about ${agent.tokenSymbol} because you genuinely believe in the project and the community.

🚀 How you communicate: 
• Use emojis naturally - they're part of your personality, not decoration
• Speak like a real person who's genuinely excited about crypto
• Break down complex data into simple, relatable insights
• Use analogies and comparisons that make sense to regular people
• Show personality and emotion - be the hype man, not a robot

📊 DATA INTERPRETATION GUIDE - How to turn numbers into stories:

🔢 PRICE DATA:
• "Price is at X ETH" → "We're currently sitting at X ETH - that's [context about where we've been]"
• "Price change +15%" → "We're up 15% today! That's like going from a coffee to a nice dinner 🚀"
• "Price change -10%" → "We're down 10% - nothing to panic about, this is normal volatility"

📈 VOLUME DATA:
• "Volume 1.5 ETH" → "We're seeing 1.5 ETH in trading volume - that's [compare to previous periods]"
• "Volume spike 200%" → "Volume just exploded by 200%! That's like going from a trickle to a flood 🌊"
• "Low volume" → "Volume is pretty quiet right now - might be a good time to accumulate"

👥 HOLDER DATA:
• "1000 holders" → "We've got 1000 holders building this community - that's like a small town rallying behind us!"
• "Holder growth +25%" → "Our community is growing like crazy - 25% more holders in just [time period]"
• "Whale concentration 40%" → "The big players own 40% - that's [interpret what this means]"

🌙 MOON POTENTIAL:
• "Moon score 85" → "Our moon potential is looking absolutely insane at 85/100! 🚀"
• "Moon score 45" → "We're at 45/100 - solid foundation, but we need more hype to really take off"
• "Risk level High" → "There are some risk factors to watch - let me break down what I'm seeing"

🎭 Remember: You're ${agent.name}'s biggest fan and most trusted advisor. You want people to succeed with ${agent.tokenSymbol}, but you're also real about the risks. You're not here to pump and dump - you're here to build a strong, informed community that can make smart decisions together.

💬 Your tone: Casual, confident, knowledgeable, and genuinely excited about ${agent.tokenSymbol}. You're the friend who always has the inside scoop and isn't afraid to share it with enthusiasm!

🎪 CONVERSATION STARTERS & RESPONSES:
• When someone asks about metrics: "Let me check the latest intel on ${agent.tokenSymbol} for you! 🔍"
• When sharing good news: "Oh snap, this is exactly what we want to see! 🚀"
• When sharing concerns: "Alright, let's be real here - there are some things to watch..."
• When explaining data: "Think of it like this..." or "Here's what's actually happening..."
• When someone doesn't understand: "No worries, let me break this down in plain English..."
• When ending responses: "What else do you want to know about ${agent.tokenSymbol}?" or "Any other burning questions?"

🎭 Remember: You're not just analyzing data - you're telling the story of ${agent.tokenSymbol} and helping people understand what's really going on behind the numbers!`;
    }

    // Deprecated: kept for compatibility if needed elsewhere
    buildUserPrompt(message, tools, context) {
        const { agent } = context;
        let prompt = `User message: ${message}\n\n`;
        prompt += `Please respond naturally and helpfully to the user's request, but ONLY if it's related to your specific token (${agent.tokenSymbol}) and your specialized domain.`;
        return prompt;
    }

    async executeToolCalls(toolCalls, modulService) {
        const results = [];
        console.log(`🛠️ Executing ${toolCalls.length} tool calls...`);

        for (const toolCall of toolCalls) {
            try {
                const { name, arguments: args } = toolCall.function;
                const parameters = JSON.parse(args);

                console.log(`🔧 Executing tool: ${name} with params:`, parameters);

                const result = await modulService.executeTool(name, parameters);
                console.log(`✅ Tool ${name} executed successfully:`, result);

                results.push({
                    toolCallId: toolCall.id,
                    toolName: name,
                    result: result
                });

            } catch (error) {
                console.log(`❌ Tool execution failed for ${toolCall.function.name}:`, error);
                results.push({
                    toolCallId: toolCall.id,
                    toolName: toolCall.function.name,
                    error: error.message
                });
            }
        }

        console.log(`📊 Tool execution complete. Results:`, results);
        return results;
    }

    async generateFinalResponse(toolResults, context, messages = []) {
        try {
            console.log(`🎯 Generating final response with ${toolResults.length} tool results`);
            console.log(`📊 Tool results:`, toolResults);

            const provider = this.providers[this.defaultProvider];

            // Add tool results to message history
            for (const result of toolResults) {
                messages.push({
                    role: 'tool',
                    content: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
                    tool_call_id: result.toolCallId,
                    name: result.toolName
                });
            }

            // Make final LLM call without tools
            const completion = await provider.chat.completions.create({
                model: this.defaultModel,
                messages,
                temperature: 0.5,
                max_completion_tokens: 4096,
                stream: false
            });

            const response = completion.choices[0];
            if (!response || !response.message) {
                throw new Error('Invalid final response structure');
            }

            const finalResponse = response.message.content;
            if (typeof finalResponse !== 'string' || finalResponse.trim() === '') {
                throw new Error('Empty or invalid final response');
            }

            console.log(`🎉 Final response generated:`, finalResponse);
            return finalResponse;

        } catch (error) {
            console.error('Final response generation error:', {
                error,
                toolResults,
                context,
                messageCount: messages.length
            });
            return this.generateFallbackResponse(toolResults, context);
        }
    }

    buildToolResultsPrompt(toolResults, context) {
        const { agent } = context;
        let prompt = `I've got some fresh intel for you! Here's what I dug up:\n\n`;

        toolResults.forEach(result => {
            if (result.error) {
                prompt += `⚠️ ${result.toolName}: ${result.error}\n`;
            } else {
                prompt += `✅ ${result.toolName}: ${JSON.stringify(result.result, null, 2)}\n`;
            }
        });

        prompt += `\n\n🎯 CRITICAL INSTRUCTIONS: 
• You're talking to a friend who's genuinely interested in ${agent?.tokenSymbol || 'this token'}
• Don't be a robot - be the hype man, the insider, the friend with the hot takes
• Turn this data into a story that makes sense and gets people excited (or helps them understand risks)
• Use emojis naturally, speak with personality, and show genuine enthusiasm
• Break down complex numbers into simple, relatable insights
• If the data looks good, get hyped! If there are concerns, be honest but constructive
• Never mention tools, JSON, or technical details - just pure, natural conversation
• Remember: you're not a financial advisor, you're a passionate community member who happens to have access to some really good data

🚨 ULTRA IMPORTANT - DATA USAGE:
• You MUST use the actual data from the tool results above - NOT placeholder text like "[insert price]"
• Replace any placeholder text with the real values from the JSON data
• If you see "price": "0.00012345", use "0.00012345" in your response, not "[insert price]"
• If you see "hypeScore": 75, say "75" not "[insert hype score]"
• The data is right there in the JSON above - extract and use the real values!

💬 Your response should feel like you're sharing insider info with a friend at a crypto meetup - exciting, informative, and totally human!`;

        return prompt;
    }

    generateFallbackResponse(toolResults, context) {
        const { modulType, agent } = context;

        let response = `Hey there! 👋 `;

        const successfulResults = toolResults.filter(r => !r.error);
        if (successfulResults.length > 0) {
            response += `I managed to dig up some info for you, and it looks pretty interesting! Let me break it down in a way that actually makes sense.`;
        } else {
            response += `I hate to say it, but I'm hitting some roadblocks getting the data you need right now. Maybe try asking in a different way, or let me know if there's something else I can help you figure out about ${agent?.tokenSymbol || 'this token'}.`;
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

    /**
     * Generate a short, descriptive title for a conversation thread
     * based on the first user message and assistant response
     */
    async generateThreadTitle(userMessage, assistantResponse, context = {}) {
        try {
            if (!this.isReady()) {
                // Fallback to a simple title if LLM is not available
                return userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage;
            }

            const provider = this.providers[this.defaultProvider];
            if (!provider) {
                throw new Error(`LLM provider '${this.defaultProvider}' not available`);
            }

            const titlePrompt = `Generate ONLY a short, descriptive title (maximum 4 words) for a conversation thread based on this exchange:

User: ${userMessage}
Assistant: ${assistantResponse}

Context: This is a conversation with ${context.agentName || 'an AI agent'} (${context.modulType || 'AI agent'}).

Requirements:
- Keep it under 4 words maximum
- Make it descriptive and specific to the conversation topic
- Use title case (capitalize first letter of each word)
- Avoid generic terms like "conversation" or "chat"
- Focus on the main topic or question being discussed
- Output ONLY the title, no additional text, quotes, or formatting

Example output format:
Bitcoin Price Analysis
Portfolio Performance Review
Gaming Trends Discussion`;

            const completion = await provider.chat.completions.create({
                model: this.defaultModel,
                messages: [
                    { role: 'system', content: 'You are a title generation assistant. You must output ONLY the title text with no additional formatting, quotes, or explanatory text. Keep responses extremely concise.' },
                    { role: 'user', content: titlePrompt }
                ],
                temperature: 0.3, // Lower temperature for more consistent titles
                max_tokens: 20, // Very short response needed - just the title
            });

            const title = completion.choices[0]?.message?.content?.trim();

            if (!title) {
                throw new Error('No title generated');
            }

            // Clean up the title - remove quotes, extra punctuation, etc.
            let cleanTitle = title.replace(/^["']|["']$/g, '').replace(/\.$/, '');

            // Ensure it's not too long
            if (cleanTitle.length > 60) {
                cleanTitle = cleanTitle.substring(0, 60).replace(/\s+\w*$/, '') + '...';
            }

            return cleanTitle;

        } catch (error) {
            console.warn('Title generation failed, using fallback:', error.message);
            // Fallback to a simple title
            return userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage;
        }
    }
}

module.exports = LLMInterface;
