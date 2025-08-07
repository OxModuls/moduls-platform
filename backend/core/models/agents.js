const mongoose = require('mongoose');



const agentModulEnum = [
    "GAME_FI_NPC",
    "DEFI_AI",
    "MEME",
    "ORACLE_FEED",
    "CUSTOM"
]


const agentStatusEnum = [
    "PENDING",
    "ACTIVE",
    "INACTIVE",
]


const agentTokenDecimalsEnum = [
    18,
    6
]

const agentTotalSupplyEnum = [
    1000000000,
    1000000,
]



const agentTaxSettingsSchema = new mongoose.Schema({
    totalTaxPercentage: {
        type: Number,
        required: true,
        default: 2,
        min: 1,
        max: 10
    },

    agentWalletShare: {
        type: Number,
        required: true,
        default: 50,
        min: 1,
        max: 100
    },

    devWalletShare: {
        type: Number,
        required: true,
        default: 50,
        min: 1,
        max: 100
    }
})



const agentTokenPrebuySettingsSchema = new mongoose.Schema({
    slippage: {
        type: Number,
        required: true,
        default: 1,
        min: 1,
        max: 100
    },


    amountInWei: {
        type: mongoose.Schema.Types.BigInt,
        required: true,
        default: "0",
        min: "0",
        max: "1000000000000000000"
    }
})




const agentSchema = new mongoose.Schema({

    uniqueId: {
        type: String,
        required: true,

    },


    intentId: {
        type: Number,
        required: true,
        min: 1,
        max: 1000000000000
    },

    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 64
    },

    description: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 1024
    },

    walletAddress: {
        type: String,
        required: false,
        default: null
    },


    walletSecret: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Secret',
        required: false,
        default: null
    },

    modulType: {
        type: String,
        required: true,
        enum: agentModulEnum
    },

    tokenAddress: {
        type: String,
        required: false,
        default: null
    },

    deploymentBlock: {
        type: Number,
        required: false,
        default: null
    },

    tokenSymbol: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 16
    },

    tokenDecimals: {
        type: Number,
        required: true,
        default: agentTokenDecimalsEnum[0],
        enum: agentTokenDecimalsEnum
    },


    totalSupply: {
        type: Number,
        required: true,
        default: agentTotalSupplyEnum[0],
        enum: agentTotalSupplyEnum
    },

    taxSettings: {
        type: agentTaxSettingsSchema,
        required: true,
    },


    launchDate: {
        type: Date,
        required: false,
        default: null
    },

    prebuySettings: {
        type: agentTokenPrebuySettingsSchema,
        required: true,
    },

    websiteUrl: {
        type: String,
        required: false,
        minlength: 3,
        maxlength: 1024,
        default: null
    },


    twitterUrl: {
        type: String,
        required: false,
        minlength: 3,
        maxlength: 1024,
        default: null
    },


    logoUrl: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 1024,

    },


    telegramUrl: {
        type: String,
        required: false,
        minlength: 3,
        maxlength: 1024,
        default: null
    },



    status: {
        type: String,
        required: true,
        enum: agentStatusEnum,
        default: agentStatusEnum[0]
    },


    launchDate: {
        type: Date,
        required: false,
        default: null
    },


    isVerified: {
        type: Boolean,
        required: true,
        default: false
    },

    tags: {
        type: [String],
        required: false,
        default: []
    },

    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, {
    timestamps: true
});

agentSchema.index({ uniqueId: 1 }, { unique: true });
agentSchema.index({ intentId: 1 }, { unique: true });
agentSchema.index({ walletAddress: 1 }, { unique: true });
agentSchema.index({ tokenSymbol: 1 });
agentSchema.index({ status: 1 });
agentSchema.index({ creator: 1 });
agentSchema.index({ isVerified: 1 });
agentSchema.index({ tags: 1 });

module.exports = mongoose.model('Agent', agentSchema);