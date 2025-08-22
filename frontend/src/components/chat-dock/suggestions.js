export function getPromptSuggestions(modulType) {
    const prompts = {
        GAMING_BUDDY: [
            "Start a new game",
            "Show available games",
            "Surprise me with a game",
        ],
        TRADING_ASSISTANT: [
            "Analyze this market",
            "What are today’s top movers?",
            "Give me a quick token breakdown",
        ],
        MEME: [
            "What’s the latest hype?",
            "Show trading metrics",
            "Tell me about this token",
        ],
        PORTFOLIO_WATCHER: [
            "Portfolio overview",
            "Biggest gainers/losers",
            "Performance summary",
        ],
        SOCIAL_SENTINEL: [
            "Track keyword: 'SEI'",
            "What’s trending now?",
            "Summarize social sentiment",
        ],
    };
    return prompts[modulType] || [
        "What can you do?",
        "Show features",
        "Help me get started",
    ];
}


