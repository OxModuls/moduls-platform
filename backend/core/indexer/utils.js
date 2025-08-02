const { getAddress, formatEther, parseEther } = require('viem');

/**
 * Normalize an Ethereum address to checksum format
 * @param address - The address to normalize
 * @returns The normalized address
 */
function normalizeAddress(address) {
    try {
        return getAddress(address);
    } catch (error) {
        throw new Error(`Invalid address: ${address}`);
    }
}

/**
 * Format a BigInt balance to a readable string
 * @param balance - The balance to format
 * @param decimals - The number of decimals (default: 18)
 * @returns The formatted balance
 */
function formatBalance(balance, decimals = 18) {
    try {
        const balanceStr = balance.toString();
        const balanceBigInt = BigInt(balanceStr);
        return formatEther(balanceBigInt);
    } catch (error) {
        console.error('Error formatting balance:', error);
        return '0';
    }
}

/**
 * Parse a formatted balance string to BigInt
 * @param balance - The formatted balance string
 * @param decimals - The number of decimals (default: 18)
 * @returns The parsed balance as BigInt
 */
function parseBalance(balance, decimals = 18) {
    try {
        return parseEther(balance);
    } catch (error) {
        console.error('Error parsing balance:', error);
        return 0n;
    }
}

/**
 * Calculate percentage of total supply
 * @param balance - The holder's balance
 * @param totalSupply - The total supply
 * @returns The percentage (0-100)
 */
function calculatePercentage(balance, totalSupply) {
    try {
        const balanceBigInt = BigInt(balance.toString());
        const totalSupplyBigInt = BigInt(totalSupply.toString());

        if (totalSupplyBigInt === 0n) {
            return 0;
        }

        const percentage = (Number(balanceBigInt * 10000n / totalSupplyBigInt)) / 100;
        return Math.min(percentage, 100); // Cap at 100%
    } catch (error) {
        console.error('Error calculating percentage:', error);
        return 0;
    }
}

/**
 * Validate if a string is a valid Ethereum address
 * @param address - The address to validate
 * @returns True if valid, false otherwise
 */
function isValidAddress(address) {
    try {
        getAddress(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate if a string is a valid transaction hash
 * @param hash - The hash to validate
 * @returns True if valid, false otherwise
 */
function isValidTransactionHash(hash) {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate if a string is a valid block number
 * @param blockNumber - The block number to validate
 * @returns True if valid, false otherwise
 */
function isValidBlockNumber(blockNumber) {
    const num = parseInt(blockNumber);
    return !isNaN(num) && num >= 0;
}

/**
 * Create a pagination object
 * @param total - Total number of items
 * @param limit - Items per page
 * @param offset - Current offset
 * @returns Pagination object
 */
function createPagination(total, limit, offset) {
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    const hasNext = offset + limit < total;
    const hasPrev = offset > 0;

    return {
        total,
        limit,
        offset,
        currentPage,
        totalPages,
        hasNext,
        hasPrev,
        hasMore: hasNext
    };
}

/**
 * Batch process items with a delay between batches
 * @param items - Items to process
 * @param processor - Function to process each item
 * @param batchSize - Size of each batch
 * @param delay - Delay between batches in milliseconds
 * @returns Processed results
 */
async function batchProcess(items, processor, batchSize = 100, delay = 100) {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);

        // Add delay between batches (except for the last batch)
        if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return results;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Function result
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Convert BigInt to string for JSON serialization
 * @param obj - Object to convert
 * @returns Object with BigInt converted to strings
 */
function bigIntToString(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'bigint') {
        return obj.toString();
    }

    if (Array.isArray(obj)) {
        return obj.map(bigIntToString);
    }

    if (typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = bigIntToString(value);
        }
        return result;
    }

    return obj;
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms - Milliseconds to sleep
 * @returns
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a human-readable time difference
 * @param date - The date to compare
 * @returns Human-readable time difference
 */
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    }
}

module.exports = {
    normalizeAddress,
    formatBalance,
    parseBalance,
    calculatePercentage,
    isValidAddress,
    isValidTransactionHash,
    isValidBlockNumber,
    createPagination,
    batchProcess,
    retryWithBackoff,
    bigIntToString,
    sleep,
    getTimeAgo,
}; 