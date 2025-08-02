// Zero address constant
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = 'Transfer(address,address,uint256)';

// Database collection names
const COLLECTIONS = {
    HOLDER_BALANCES: 'holder_balances',
    TOKEN_EVENTS: 'token_events',
};

// Indexer configuration
const INDEXER_CONFIG = {
    BATCH_SIZE: 1000, // Number of events to process in a batch
    SAVE_INTERVAL: 10, // Save balances every N events
    MAX_RETRIES: 3, // Maximum retries for failed operations
    RETRY_DELAY: 1000, // Delay between retries in milliseconds
    BLOCK_RANGE_LIMIT: 1000, // Maximum block range for eth_getLogs (conservative limit)
    DELAY_BETWEEN_BATCHES: 1000, // Delay between batch requests in milliseconds
};

module.exports = {
    ZERO_ADDRESS,
    TRANSFER_EVENT_SIGNATURE,
    COLLECTIONS,
    INDEXER_CONFIG,
}; 