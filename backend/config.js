require('dotenv').config({
    path: '.env.local'
});

const config = {
    appName: process.env.APP_NAME || 'Moduls API',
    port: process.env.PORT || 8000,
    dbUrl: process.env.DB_URL || 'mongodb://127.0.0.1:27017/test',
    env: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
    jwtSecret: process.env.JWT_SECRET || 'secret',
    jwtExpiration: process.env.JWT_EXPIRATION || '1d',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || 'moduls',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '1234567890',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '1234567890',
    agentWalletSecret: process.env.AGENT_WALLET_SECRET || 'moduls-agent-wallet-secret',
    chainMode: process.env.CHAIN_MODE || 'testnet',
    allowedOrigins: [
        'http://localhost:5173',
    ],

    // Centralized RPC Configuration
    rpcUrls: {
        mainnet: {
            http: process.env.SEI_MAINNET_RPC_URL || 'https://evm-rpc.sei-apis.com',
            webSocket: process.env.SEI_MAINNET_WS_URL || 'wss://wandering-serene-river.sei-atlantic.quiknode.pro/757d4dbb80f898f2fefd8542d4f75b50f1454aa6/',
        },
        testnet: {
            // http: process.env.SEI_TESTNET_RPC_URL || 'https://wandering-serene-river.sei-atlantic.quiknode.pro/757d4dbb80f898f2fefd8542d4f75b50f1454aa6/',
            // webSocket: process.env.SEI_TESTNET_WS_URL || 'wss://wandering-serene-river.sei-atlantic.quiknode.pro/757d4dbb80f898f2fefd8542d4f75b50f1454aa6/',

            http: "https://evm-rpc-testnet.sei-apis.com",
            webSocket: "wss://evm-ws-testnet.sei-apis.com"
        }
    },

    contractAddresses: {
        testnet: {
            modulsDeployer: process.env.MODULS_DEPLOYER_ADDRESS_TESTNET || '0xCFC7CB241D5643f07cB108bE5a3dEb25Ba70F8f8',
            modulsSalesManager: process.env.MODULS_SALES_MANAGER_ADDRESS_TESTNET || '0x85A8817b2BAa9b36e7F9EbbB047e77Df5cCBE43a',
        },
        mainnet: {
            modulsDeployer: process.env.MODULS_DEPLOYER_ADDRESS_MAINNET || '0xCFC7CB241D5643f07cB108bE5a3dEb25Ba70F8f8',
            modulsSalesManager: process.env.MODULS_SALES_MANAGER_ADDRESS_MAINNET || '0x85A8817b2BAa9b36e7F9EbbB047e77Df5cCBE43a',
        }
    }
}

module.exports = config;