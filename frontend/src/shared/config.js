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
            modulsDeployer: import.meta.env.VITE_MODULS_DEPLOYER_ADDRESS_TESTNET || '0x8dF8b2124F558E6214FD78032a1AEC1e18461a63',
            modulsSalesManager: import.meta.env.VITE_MODULS_SALES_MANAGER_ADDRESS_TESTNET || '0xab9e6EbEa548fB4E1ed493f066095971523DFD88',
        },
        mainnet: {
            modulsDeployer: import.meta.env.VITE_MODULS_DEPLOYER_ADDRESS_MAINNET || '0x8dF8b2124F558E6214FD78032a1AEC1e18461a63',
            modulsSalesManager: import.meta.env.VITE_MODULS_SALES_MANAGER_ADDRESS_MAINNET || '0xab9e6EbEa548fB4E1ed493f066095971523DFD88',
        }
    },

    // API endpoints
    endpoints: {
        // User endpoints
        walletLogin: '/api/auth/wallet-login',
        getAuthUser: '/api/auth/user',
        login: '/api/login',
        register: '/api/register',
        profile: '/api/profile',
        refreshToken: '/api/refresh-token',
        getStats: '/api/stats',
        getMyAgents: '/api/agents/mine',

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
