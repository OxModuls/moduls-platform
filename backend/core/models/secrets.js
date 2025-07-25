const mongoose = require('mongoose');

const secretSchema = new mongoose.Schema({
    ownerType: {
        type: String,
        enum: ['User', 'Agent'],
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'ownerType'
    },
    secretType: {
        type: String,
        required: true,
        enum: ['PRIVATE_KEY', 'API_KEY', 'SEED_PHRASE', 'PASSWORD', 'OTHER']
    },
    secretValue: {
        type: String,
        required: true
        // In production, encrypt this field before saving
    },
    description: {
        type: String,
        maxlength: 512,
        default: ''
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

secretSchema.index({ owner: 1 });
secretSchema.index({ ownerType: 1 });
secretSchema.index({ secretType: 1 });
secretSchema.index({ isActive: 1 });

module.exports = mongoose.model('Secret', secretSchema); 