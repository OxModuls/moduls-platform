const IndexerService = require('./indexer');
const routes = require('./routes');
const HolderBalance = require('./models/holder-balance');
const TokenEvent = require('./models/token-event');
const utils = require('./utils');
const { ZERO_ADDRESS, INDEXER_CONFIG } = require('./constants');

// Get singleton instance
const indexerInstance = IndexerService.getInstance();

module.exports = {
    IndexerService,
    indexerInstance, // Export the singleton instance
    routes,
    models: {
        HolderBalance,
        TokenEvent,
    },
    utils,
    constants: {
        ZERO_ADDRESS,
        INDEXER_CONFIG,
    },
}; 