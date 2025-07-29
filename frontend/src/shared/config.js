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
        agent: "/api/agents", // Base path for single agent operations

    },

    contractAddresses: {
        testnet: {
            modulsDeployer: "0x882aABa3F22c7590ac819Bf946534E388230596D"
        },
        mainnet: {
            modulsDeployer: "0x0000000000000000000000000000000000000000"
        }
    }
};

export default config;