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
    allowedOrigins: [
        'http://localhost:5173',

    ]


}

module.exports = config;