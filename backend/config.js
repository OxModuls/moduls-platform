require('dotenv').config({
    path: '.env.local'
});

const config = {
    appName: process.env.APP_NAME || 'Moduls API',
    port: process.env.PORT || 8000,
    dbUrl: process.env.DB_URL || 'mongodb://127.0.0.1:27017/test',
    env: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV !== 'production',
    isProd: process.env.NODE_ENV === 'production',
    jwtSecret: process.env.JWT_SECRET || 'secret',
    jwtExpiration: process.env.JWT_EXPIRATION || '7d',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || 'moduls',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '1234567890',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '1234567890',
    agentWalletSecret: process.env.AGENT_WALLET_SECRET || 'moduls-agent-wallet-secret',
    chainMode: process.env.CHAIN_MODE || 'testnet',
    allowedOrigins: [
        'http://localhost:5173',
        "https://moduls-one.vercel.app",
        "http://moduls-one.vercel.app",
    ],

    // Webhook configuration
    webhookUrl: process.env.WEBHOOK_URL || 'https://tunnel.timmypelumy.xyz/api/webhooks',

    // QuickNode configuration
    quicknodeApiKey: process.env.QUICKNODE_API_KEY,
    network: process.env.CHAIN_MODE === 'mainnet' ? 'sei-mainnet' : 'sei-testnet',

    // Centralized RPC Configuration
    rpcUrls: {
        mainnet: {
            http: process.env.SEI_MAINNET_RPC_URL,
            webSocket: process.env.SEI_MAINNET_WS_URL,
        },
        testnet: {
            http: process.env.SEI_TESTNET_RPC_URL,
            webSocket: process.env.SEI_TESTNET_WS_URL,
        }
    },

    contractAddresses: {
        testnet: {
            modulsDeployer: process.env.MODULS_DEPLOYER_ADDRESS_TESTNET,
            modulsSalesManager: process.env.MODULS_SALES_MANAGER_ADDRESS_TESTNET,
        },
        mainnet: {
            modulsDeployer: process.env.MODULS_DEPLOYER_ADDRESS_MAINNET,
            modulsSalesManager: process.env.MODULS_SALES_MANAGER_ADDRESS_MAINNET,
        }
    }
}

module.exports = config;