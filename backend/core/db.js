const mongoose = require('mongoose');
const config = require('../config');



async function connectDB() {


    try {
        await mongoose.connect(config.dbUrl);
        console.log('Connected to Database');
    } catch (error) {
        console.log(error);
    }
}

module.exports = connectDB;