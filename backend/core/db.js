const mongoose = require('mongoose');
const config = require('../config');

async function connectDB() {
    try {
        // Add connection options with timeouts
        const options = {
            serverSelectionTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 10000, // 10 seconds
            connectTimeoutMS: 10000, // 10 seconds
        };

        await mongoose.connect(config.dbUrl, options);
        console.log(`✅ Connected to MongoDB`);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    }
}

module.exports = connectDB;