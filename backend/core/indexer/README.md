# Indexer Service

A real-time blockchain event indexing service for tracking token holder balances and transfer events.

## Overview

The Indexer Service provides comprehensive blockchain event indexing including:

- **Token Transfer Events**: Real-time tracking of ERC20 token transfer events
- **Contract Deployment Events**: Monitoring ModulsDeployer for new token deployments
- **Holder Balance Management**: Up-to-date holder balance information
- **Event-Based Architecture**: Uses event-based tracking for accurate and efficient data management

## Features

### ✅ Real-Time Event Tracking

- **Transfer Events**: Monitors all ERC20 Transfer events in real-time
- **Contract Deployment Events**: Watches ModulsDeployer for new token deployments
- **Automatic Balance Updates**: Updates holder balances automatically on each transfer
- **Memory + Database Storage**: Maintains balances in memory for fast access and persists to database

### ✅ Historical Data Backfill

- **Deployment Block Tracking**: Starts indexing from token deployment block
- **Batch Processing**: Handles RPC limitations with automatic batch processing
- **Complete Event History**: Processes all historical transfer events
- **Manual Backfill**: API endpoint for manual backfill from specific block ranges
- **Deterministic Results**: Purely event-based, no need for balanceOf calls

### ✅ Efficient Database Design

- **Optimized Indexes**: Fast queries for holder balances and events
- **Normalized Addresses**: Consistent address formatting
- **BigInt Support**: Handles large token amounts without precision loss
- **Singleton Pattern**: Single instance across entire application

### ✅ RESTful API

- **Holder Queries**: Get holders, counts, top holders
- **Event Queries**: Get transfer events, address-specific events
- **Pagination Support**: Efficient data retrieval with pagination
- **Real-time Status**: Service status and monitoring endpoints

## Architecture

### Core Components

```
core/indexer/
├── indexer.js          # Main indexer service
├── routes.js           # API routes
├── constants.js        # Constants and configuration
├── utils.js           # Utility functions
├── models/
│   ├── holder-balance.js    # Holder balance model
│   └── token-event.js       # Transfer event model
└── index.js           # Main exports
```

### Data Flow

1. **Contract Deployment Monitoring**: Watches ModulsDeployer for new token deployments
2. **Token Registration**: Automatically adds new tokens to watch list
3. **Transfer Event Monitoring**: Viem client watches Transfer events for all tokens
4. **Balance Updates**: In-memory balance tracking with periodic DB saves
5. **Event Storage**: All transfer events stored in database
6. **API Access**: RESTful endpoints for data retrieval

## API Endpoints

### Service Management

- `GET /api/indexer/status` - Get service status
- `GET /api/indexer/chain-info` - Get current chain information
- `POST /api/indexer/start` - Start indexer service
- `POST /api/indexer/stop` - Stop indexer service

### Contract Watcher Management

- `POST /api/indexer/contract-watcher/start` - Start contract watcher
- `POST /api/indexer/contract-watcher/stop` - Stop contract watcher

### Token Management

- `POST /api/indexer/watch-token` - Add token to watch list
- `DELETE /api/indexer/watch-token/:tokenAddress` - Remove token from watch list
- `POST /api/indexer/backfill/:tokenAddress` - Manual backfill from block range

### Holder Data

- `GET /api/indexer/holders/:tokenAddress` - Get holder balances (paginated)
- `GET /api/indexer/holders/:tokenAddress/count` - Get holder count
- `GET /api/indexer/holders/:tokenAddress/top` - Get top holders

### Event Data

- `GET /api/indexer/events/:tokenAddress` - Get transfer events (paginated)
- `GET /api/indexer/events/address/:address` - Get events for specific address

## Database Schema

### Holder Balance Collection

```javascript
{
  tokenAddress: String,      // Normalized token address
  holderAddress: String,     // Normalized holder address
  balance: String,           // Balance as string (BigInt)
  lastUpdated: Date,         // Last update timestamp
  lastBlockNumber: Number,   // Block number of last update
  lastTransactionHash: String // Transaction hash of last update
}
```

### Token Event Collection

```javascript
{
  tokenAddress: String,      // Normalized token address
  eventType: String,         // Event type (Transfer, Mint, etc.)
  from: String,              // From address
  to: String,                // To address
  value: String,             // Transfer amount as string
  blockNumber: Number,       // Block number
  transactionHash: String,   // Transaction hash
  logIndex: Number,          // Log index within transaction
  timestamp: Date,           // Processing timestamp
  blockTimestamp: Date,      // Block timestamp (if available)
  gasUsed: Number,           // Gas used
  gasPrice: String           // Gas price
}
```

## Usage

### Starting the Service

The indexer service starts automatically when the backend server starts and handles both contract watching and token indexing. It uses a singleton pattern to ensure only one instance runs across the entire application:

```javascript
// In app.js
const { IndexerService } = require("./core/indexer");

// Get singleton instance and start (includes contract watcher)
const indexerService = IndexerService.getInstance();
await indexerService.start();
```

### Adding Tokens to Watch

```javascript
// Get singleton instance
const indexerService = IndexerService.getInstance();

// Add a new token
await indexerService.addTokenToWatch(tokenAddress, agentId);

// Remove a token
await indexerService.removeTokenFromWatch(tokenAddress);
```

### Querying Data

```javascript
// Get singleton instance
const indexerService = IndexerService.getInstance();

// Get holder balances
const holders = await indexerService.getHolderBalances(tokenAddress);

// Get holder count
const count = await indexerService.getHolderCount(tokenAddress);

// Get service status
const status = indexerService.getStatus();
```

## Configuration

### Environment Variables

- `CHAIN_MODE`: Chain mode - 'mainnet' or 'testnet' (default: 'testnet')
- `SEI_MAINNET_RPC_URL`: Mainnet RPC URL (default: 'https://evm-rpc.sei-apis.com')
- `SEI_TESTNET_RPC_URL`: Testnet RPC URL (default: 'https://wandering-serene-river.sei-atlantic.quiknode.pro/757d4dbb80f898f2fefd8542d4f75b50f1454aa6/')
- `SEI_MAINNET_WS_URL`: Mainnet WebSocket URL (default: 'wss://wandering-serene-river.sei-atlantic.quiknode.pro/757d4dbb80f898f2fefd8542d4f75b50f1454aa6/')
- `SEI_TESTNET_WS_URL`: Testnet WebSocket URL (default: 'wss://wandering-serene-river.sei-atlantic.quiknode.pro/757d4dbb80f898f2fefd8542d4f75b50f1454aa6/')
- `MODULS_DEPLOYER_ADDRESS_MAINNET`: ModulsDeployer contract address on mainnet
- `MODULS_DEPLOYER_ADDRESS_TESTNET`: ModulsDeployer contract address on testnet
- `MODULS_SALES_MANAGER_ADDRESS_MAINNET`: ModulsSalesManager contract address on mainnet
- `MODULS_SALES_MANAGER_ADDRESS_TESTNET`: ModulsSalesManager contract address on testnet

### RPC Endpoints

The indexer service uses the following RPC endpoints based on chain mode:

- **Mainnet**: `https://evm-rpc.sei-apis.com`
- **Testnet**: `https://wandering-serene-river.sei-atlantic.quiknode.pro/757d4dbb80f898f2fefd8542d4f75b50f1454aa6/`

### Indexer Configuration

```javascript
const INDEXER_CONFIG = {
	BATCH_SIZE: 1000, // Events per batch
	SAVE_INTERVAL: 10, // Save balances every N events
	MAX_RETRIES: 3, // Maximum retries
	RETRY_DELAY: 1000, // Retry delay in ms
};
```

## Performance Considerations

### Singleton Pattern

- **Single Instance**: Only one indexer instance across entire application
- **No Race Conditions**: Eliminates competing instances
- **Resource Efficiency**: Prevents duplicate RPC calls and database writes
- **Consistent State**: All parts of application use same indexer state

### Centralized Configuration

- **Single Source of Truth**: All RPC URLs configured in one place (`config.js`)
- **Environment Variable Support**: Easy override via environment variables
- **Consistent Across Services**: Indexer, blockchain client, and all services use same config
- **Easy Maintenance**: Update RPC URLs in one location

### RPC Limitations & Batch Processing

- **Conservative Block Range**: Uses 2000 block range limit (well below RPC limits)
- **Intelligent Batching**: Automatically splits large ranges into smaller batches
- **Error Recovery**: Reduces batch size on RPC errors and retries
- **Rate Limiting**: Delays between batches to avoid overwhelming RPC endpoints

### Memory Usage

- Balances stored in memory for fast access
- Periodic database saves to persist data
- Automatic cleanup of zero balances

### Database Optimization

- Compound indexes for efficient queries
- Normalized addresses for consistency
- BigInt values stored as strings

### Event Processing

- **Batch Processing**: Automatic batch processing for RPC limitations (2,000 block limit for safety)
- **Rate Limiting**: Delays between batches to avoid rate limiting
- **Error Recovery**: Automatic retry with smaller batch sizes on errors
- **Genesis Handling**: Special handling for tokens with deployment block 0
- **Real-time Events**: Real-time event handling for new transfers
- **Manual Backfill**: API endpoint for manual data recovery
- **Polling Strategy**: Uses polling (2-second intervals) instead of WebSocket for reliability
- **Filter Error Recovery**: Automatic restart of event watchers on filter errors
- **Health Monitoring**: Continuous monitoring of watcher health and automatic recovery

## Error Handling

### Graceful Degradation

- Service continues running on individual token errors
- Fallback to genesis block if deployment block not found
- Automatic retry with exponential backoff
- RPC limitation handling with conservative batch processing (2,000 blocks)
- Automatic batch size reduction on errors
- Special handling for genesis block (deployment block 0)
- **Filter Error Recovery**: Automatic restart of watchers on "filter does not exist" errors
- **Health Check System**: Periodic monitoring and restart of failed watchers
- **Polling Fallback**: Uses polling instead of WebSocket for better reliability

### Data Consistency

- Event deduplication using transaction hash + log index
- Atomic balance updates
- Transaction rollback on errors

## Monitoring

### Health Checks

- Service status endpoint
- Watched tokens count
- Real-time event processing status
- **Automatic Health Monitoring**: Periodic checks every 5 minutes
- **Watcher Status Tracking**: Monitors contract and token watchers
- **Automatic Recovery**: Restarts failed watchers automatically
- **Filter Error Detection**: Detects and handles "filter does not exist" errors

### Logging

- Comprehensive error logging
- Event processing metrics
- Performance monitoring

## Future Enhancements

### Planned Features

- **Multi-chain Support**: Extend to other EVM chains
- **Advanced Analytics**: Holder distribution analysis
- **WebSocket Support**: Real-time data streaming
- **Caching Layer**: Redis integration for faster queries
- **Event Filtering**: Support for custom event filters

### Scalability

- **Sharding**: Distribute tokens across multiple indexer instances
- **Load Balancing**: Multiple indexer instances
- **Database Sharding**: Distribute data across multiple databases

## Troubleshooting

### Common Issues

1. **Service Not Starting**

   - Check RPC endpoint connectivity
   - Verify database connection
   - Check environment variables

2. **Missing Events**

   - Verify deployment block is correct
   - Check RPC node synchronization
   - Review error logs for specific issues

3. **High Memory Usage**
   - Reduce batch size
   - Increase save interval
   - Monitor token count

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=indexer:* npm start
```

## Contributing

1. Follow the existing code structure
2. Add comprehensive error handling
3. Include unit tests for new features
4. Update documentation for API changes
5. Follow the established naming conventions
