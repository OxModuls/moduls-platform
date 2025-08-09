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

    // SIWE nonce tracking
    nonce: {
        type: String,
        default: null,
    },

    nonceExpiresAt: {
        type: Date,
        default: null,
    },


}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema,);