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

        // Indexer endpoints
        indexer: "/api/indexer",
        holders: "/api/indexer/holders",
        holderStats: "/api/indexer/holders/stats",

    },

    // Centralized RPC Configuration
    rpcUrls: {
        mainnet: {
            http: import.meta.env.VITE_SEI_MAINNET_RPC_URL || "https://evm-rpc.sei-apis.com",
            webSocket: import.meta.env.VITE_SEI_MAINNET_WS_URL || "wss://evm-ws.sei-apis.com"
        },
        testnet: {
            http: import.meta.env.VITE_SEI_TESTNET_RPC_URL || "https://evm-rpc-testnet.sei-apis.com",
            webSocket: import.meta.env.VITE_SEI_TESTNET_WS_URL || "wss://evm-ws-testnet.sei-apis.com"
        }
    },

    contractAddresses: {
        testnet: {
            modulsDeployer: "0xCFC7CB241D5643f07cB108bE5a3dEb25Ba70F8f8",
            modulsSalesManager: "0x85A8817b2BAa9b36e7F9EbbB047e77Df5cCBE43a"
        },
        mainnet: {
            modulsDeployer: "0xCFC7CB241D5643f07cB108bE5a3dEb25Ba70F8f8",
            modulsSalesManager: "0x85A8817b2BAa9b36e7F9EbbB047e77Df5cCBE43a"
        }
    }
};

export default config;
