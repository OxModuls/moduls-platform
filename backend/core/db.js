const mongoose = require('mongoose');
const config = require('../config');



async function connectDB() {


    try {
        await mongoose.connect(config.dbUrl);
        console.log(`✅ [Database] Successfully connected to MongoDB at: ${config.dbUrl}`);
    } catch (error) {
        console.log(error);
    }
}

module.exports = connectDB;