const config = {
    apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
    endpoints: {
        // Auth endpoints
        auth: "/api/auth/wallet-login",

        // User endpoints
        user: "/api/auth/user", // This might need to be added to backend

        // Stats endpoints
        stats: "/api/stats",

        // Agent endpoints
        agentsMine: "/api/agents/mine",
        agentsCreate: "/api/agents/create",

    }
};

export default config;