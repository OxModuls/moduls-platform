const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    walletAddress: {
        type: String,
        required: true,
        unique: true,
    },

    walletAddressHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },


    isActive: {
        type: Boolean,
        default: true,
    },


    lastLogin: {
        type: Date,
        default: Date.now,
    },

    agents: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Agent',
        default: [],
        required: false
    },


}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema,);