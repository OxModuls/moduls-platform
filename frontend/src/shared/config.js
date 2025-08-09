const config = {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    chainMode: import.meta.env.VITE_CHAIN_MODE || 'testnet',
    isDev: import.meta.env.DEV || false,
    isProd: import.meta.env.PROD || false,

    // Centralized RPC URLs
    rpcUrls: {
        mainnet: {
            http: import.meta.env.VITE_SEI_MAINNET_RPC_URL || 'https://evm-rpc.sei-apis.com',
            webSocket: import.meta.env.VITE_SEI_MAINNET_WS_URL || 'wss://wandering-serene-river.sei-atlantic.quiknode.pro/757d4dbb80f898f2fefd8542d4f75b50f1454aa6/',
        },
        testnet: {
            http: import.meta.env.VITE_SEI_TESTNET_RPC_URL || "https://evm-rpc-testnet.sei-apis.com",
            webSocket: import.meta.env.VITE_SEI_TESTNET_WS_URL || "wss://evm-ws-testnet.sei-apis.com"
        }
    },

    // Contract addresses
    contractAddresses: {
        testnet: {
            modulsDeployer: import.meta.env.VITE_MODULS_DEPLOYER_ADDRESS_TESTNET || '0xfDD3d409A10F0a56c8ccB15fa3e3f51aC8059919',
            modulsSalesManager: import.meta.env.VITE_MODULS_SALES_MANAGER_ADDRESS_TESTNET || '0x7725F80F6fE843222493546eF9BeAB8D87875B78',
        },
        mainnet: {
            modulsDeployer: import.meta.env.VITE_MODULS_DEPLOYER_ADDRESS_MAINNET || '0xfDD3d409A10F0a56c8ccB15fa3e3f51aC8059919',
            modulsSalesManager: import.meta.env.VITE_MODULS_SALES_MANAGER_ADDRESS_MAINNET || '0x7725F80F6fE843222493546eF9BeAB8D87875B78',
        }
    },

    // API endpoints
    endpoints: {
        // Auth endpoints
        getNonce: '/api/auth/nonce',
        verifySignature: '/api/auth/verify',
        logout: '/api/auth/logout',
        getAuthUser: '/api/auth/user',

        // User endpoints
        getStats: '/api/stats',
        getMyAgents: '/api/agents/mine',
        search: '/api/search',

        // Agent endpoints
        agents: '/api/agents',
        createAgent: '/api/agents',
        getAgent: '/api/agents',
        updateAgent: '/api/agents',
        deleteAgent: '/api/agents',

        // Webhook endpoints (new system)
        webhookStatus: '/api/webhooks/status',
        holders: '/api/webhooks/holders',
        holderStats: '/api/webhooks/holders',
    }
};

export default config;
