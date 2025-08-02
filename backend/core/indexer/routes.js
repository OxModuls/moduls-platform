const express = require('express');
const { getAddress, formatEther } = require('viem');
const IndexerService = require('./indexer');
const HolderBalance = require('./models/holder-balance');
const TokenEvent = require('./models/token-event');

const router = express.Router();

// Get singleton indexer service instance
const indexerService = IndexerService.getInstance();

/**
 * Token Holder Data Routes
 * 
 * These routes provide data for the Holders tab in the AgentTradeTab component.
 * They focus on fetching holder information, balances, and metadata for a given token.
 */

/**
 * @route GET /api/indexer/status
 * @desc Get indexer service status (for debugging)
 */
router.get('/status', async (req, res) => {
    try {
        const status = indexerService.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting indexer status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get indexer status'
        });
    }
});

/**
 * @route GET /api/indexer/holders/:tokenAddress
 * @desc Get holder balances for a token with enhanced metadata
 */
router.get('/holders/:tokenAddress', async (req, res) => {
    try {
        const { tokenAddress } = req.params;
        const { limit = 50, offset = 0, sort = 'balance' } = req.query;

        // Validate token address
        try {
            getAddress(tokenAddress);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token address'
            });
        }

        // Validate query parameters
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                error: 'Limit must be between 1 and 100'
            });
        }

        if (isNaN(offsetNum) || offsetNum < 0) {
            return res.status(400).json({
                success: false,
                error: 'Offset must be non-negative'
            });
        }

        // Get holder balances with metadata
        const holders = await HolderBalance.getHoldersForToken(
            getAddress(tokenAddress),
            limitNum,
            offsetNum,
            sort
        );

        // Get total count and supply info
        const totalCount = await HolderBalance.getHolderCount(getAddress(tokenAddress));
        const totalSupply = await HolderBalance.getTotalSupply(getAddress(tokenAddress));

        // Get ModulsSalesManager balance for this token
        const IndexerService = require('./indexer');
        const indexerService = IndexerService.getInstance();
        const chainMode = indexerService.getChainInfo().mode;
        const config = require('../../config');
        const salesManagerAddress = config.contractAddresses[chainMode].modulsSalesManager;

        // Get sales manager balance from the holders list
        const salesManagerHolder = holders.find(h => h.holderAddress.toLowerCase() === salesManagerAddress.toLowerCase());
        let salesManagerBalance = null;

        if (salesManagerHolder) {
            const balanceNum = BigInt(salesManagerHolder.balance);
            const supplyNum = BigInt(totalSupply || '0');
            const percentage = supplyNum > 0n ? Number((balanceNum * 10000n) / supplyNum) / 100 : 0;

            salesManagerBalance = {
                address: salesManagerAddress,
                balance: salesManagerHolder.balance,
                balanceFormatted: formatEther(salesManagerHolder.balance),
                percentage: percentage.toFixed(2),
                lastUpdated: salesManagerHolder.lastUpdated,
                firstSeen: salesManagerHolder.createdAt || salesManagerHolder.lastUpdated,
                transferCount: 0,
                isPool: true // Special flag to identify this as the liquidity pool
            };
        }

        // Calculate percentages and format data
        const formattedHolders = holders.map(holder => {
            const balanceNum = BigInt(holder.balance);
            const supplyNum = BigInt(totalSupply || '0');
            const percentage = supplyNum > 0n ? Number((balanceNum * 10000n) / supplyNum) / 100 : 0;

            return {
                address: holder.holderAddress,
                balance: holder.balance,
                balanceFormatted: formatEther(holder.balance),
                percentage: percentage.toFixed(2),
                lastUpdated: holder.lastUpdated,
                firstSeen: holder.createdAt || holder.lastUpdated,
                transferCount: 0 // Will be enhanced later with event data
            };
        });

        res.json({
            success: true,
            data: {
                tokenAddress: getAddress(tokenAddress),
                totalSupply: totalSupply,
                totalSupplyFormatted: totalSupply ? formatEther(totalSupply) : '0',
                salesManagerBalance: salesManagerBalance, // Add sales manager balance at top level
                holders: formattedHolders,
                pagination: {
                    total: totalCount,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: offsetNum + limitNum < totalCount
                }
            }
        });
    } catch (error) {
        console.error('Error getting holder balances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get holder balances'
        });
    }
});

/**
 * @route GET /api/indexer/holders/:tokenAddress/stats
 * @desc Get holder statistics for a token
 */
router.get('/holders/stats/:tokenAddress', async (req, res) => {
    try {
        const { tokenAddress } = req.params;

        // Validate token address
        try {
            getAddress(tokenAddress);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid token address'
            });
        }

        const [holderCount, totalSupply] = await Promise.all([
            HolderBalance.getHolderCount(getAddress(tokenAddress)),
            HolderBalance.getTotalSupply(getAddress(tokenAddress))
        ]);

        res.json({
            success: true,
            data: {
                tokenAddress: getAddress(tokenAddress),
                holderCount,
                totalSupply,
                totalSupplyFormatted: totalSupply ? formatEther(totalSupply) : '0'
            }
        });
    } catch (error) {
        console.error('Error getting holder stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get holder stats'
        });
    }
});

module.exports = router; 