/**
 * Services Module Index
 * Central export point for all modul services and utilities
 */

const ModulService = require('./modul-services');
const LLMInterface = require('./llm-interface');
const MessageProcessor = require('./message-processor');

// Create singleton instances
const messageProcessor = new MessageProcessor();
const llmInterface = new LLMInterface();

// Export the services
module.exports = {
    ModulService,
    LLMInterface,
    MessageProcessor,

    // Singleton instances
    messageProcessor,
    llmInterface,

    // Main function for processing messages
    processMessage: (threadId, messageId, messageData) =>
        messageProcessor.processMessage(threadId, messageId, messageData),

    // LLM interface methods
    addLLMProvider: (name, provider) => llmInterface.addProvider(name, provider),
    setDefaultLLMProvider: (name) => llmInterface.setDefaultProvider(name),
    setDefaultLLMModel: (model) => llmInterface.setDefaultModel(model),
    getLLMConfig: () => llmInterface.getConfig(),

    // Get available modul types
    getAvailableModulTypes: () => [
        'MEME',
        'GAMING_BUDDY',
        'TRADING_ASSISTANT',
        'PORTFOLIO_WATCHER',
        'SOCIAL_SENTINEL'
    ],

    // Get service stats
    getStats: () => ({
        messageProcessor: messageProcessor.getStats(),
        llm: llmInterface.getConfig(),
        availableModulTypes: [
            'MEME',
            'GAMING_BUDDY',
            'TRADING_ASSISTANT',
            'PORTFOLIO_WATCHER',
            'SOCIAL_SENTINEL'
        ]
    })
};
