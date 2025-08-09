import { useQuery } from '@tanstack/react-query';
import { createFetcher } from '../../lib/fetcher';
import config from '../config';

/**
 * Hook to fetch trading metrics for a specific token
 */
export const useTradingMetrics = (tokenAddress, options = {}) => {
    const { enabled = true, refetchInterval = 30000 } = options; // Refetch every 30 seconds

    return useQuery({
        queryKey: ['trading-metrics', tokenAddress],
        queryFn: async () => {
            if (!tokenAddress) return null;

            return await createFetcher({
                url: `${config.endpoints.tradingMetrics}/${tokenAddress}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled: enabled && !!tokenAddress,
        refetchInterval,
        staleTime: 15000, // Consider data stale after 15 seconds
        refetchOnWindowFocus: true,
    });
};

/**
 * Hook to fetch trading history for a specific token
 */
export const useTradingHistory = (tokenAddress, options = {}) => {
    const {
        enabled = true,
        timeframe = '24h',
        type = 'all',
        limit = 50,
        offset = 0
    } = options;

    return useQuery({
        queryKey: ['trading-history', tokenAddress, timeframe, type, limit, offset],
        queryFn: async () => {
            if (!tokenAddress) return null;

            const params = new URLSearchParams({
                timeframe,
                type,
                limit: limit.toString(),
                offset: offset.toString()
            });

            return await createFetcher({
                url: `${config.endpoints.tradingHistory}/${tokenAddress}?${params}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled: enabled && !!tokenAddress,
        staleTime: 30000, // Consider data stale after 30 seconds
    });
};

/**
 * Hook to fetch chart data for a specific token
 */
export const useTradingChart = (tokenAddress, options = {}) => {
    const {
        enabled = true,
        timeframe = '24h',
        interval = '1h',
        refetchInterval = 60000 // Refetch every minute
    } = options;

    return useQuery({
        queryKey: ['trading-chart', tokenAddress, timeframe, interval],
        queryFn: async () => {
            if (!tokenAddress) return null;

            const params = new URLSearchParams({
                timeframe,
                interval
            });

            return await createFetcher({
                url: `${config.endpoints.tradingChart}/${tokenAddress}?${params}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled: enabled && !!tokenAddress,
        refetchInterval,
        staleTime: 30000,
        refetchOnWindowFocus: true,
    });
};

/**
 * Hook to fetch user trading history
 */
export const useUserTradingHistory = (userAddress, options = {}) => {
    const {
        enabled = true,
        tokenAddress,
        limit = 50,
        offset = 0
    } = options;

    return useQuery({
        queryKey: ['user-trading-history', userAddress, tokenAddress, limit, offset],
        queryFn: async () => {
            if (!userAddress) return null;

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });

            if (tokenAddress) {
                params.append('tokenAddress', tokenAddress);
            }

            return await createFetcher({
                url: `${config.endpoints.userTradingHistory}/${userAddress}?${params}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled: enabled && !!userAddress,
        staleTime: 30000,
    });
};

/**
 * Hook to fetch trading overview for all tokens
 */
export const useTradingOverview = (options = {}) => {
    const {
        enabled = true,
        limit = 20,
        sortBy = 'volume24h',
        refetchInterval = 60000 // Refetch every minute
    } = options;

    return useQuery({
        queryKey: ['trading-overview', limit, sortBy],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: limit.toString(),
                sortBy
            });

            return await createFetcher({
                url: `${config.endpoints.tradingOverview}?${params}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled,
        refetchInterval,
        staleTime: 30000,
        refetchOnWindowFocus: true,
    });
};

/**
 * Utility function to format trading amounts
 */
export const formatTradingAmount = (amount, decimals = 18) => {
    if (!amount || amount === '0') return '0';

    const amountBN = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const quotient = amountBN / divisor;
    const remainder = amountBN % divisor;

    if (remainder === 0n) {
        return quotient.toString();
    }

    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');

    if (trimmedRemainder === '') {
        return quotient.toString();
    }

    return `${quotient}.${trimmedRemainder}`;
};

/**
 * Utility function to format price changes
 */
export const formatPriceChange = (change) => {
    if (!change || change === 0) return '+0.00%';

    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
};

/**
 * Utility function to format volume in ETH
 */
export const formatVolumeETH = (volume) => {
    if (!volume || volume === '0') return '0 ETH';

    const eth = formatTradingAmount(volume, 18);
    const ethNum = parseFloat(eth);

    if (ethNum >= 1000000) {
        return `${(ethNum / 1000000).toFixed(2)}M ETH`;
    } else if (ethNum >= 1000) {
        return `${(ethNum / 1000).toFixed(2)}K ETH`;
    } else if (ethNum >= 1) {
        return `${ethNum.toFixed(4)} ETH`;
    } else {
        return `${ethNum.toFixed(8)} ETH`;
    }
};

/**
 * Utility function to get price change color class
 */
export const getPriceChangeColor = (change) => {
    if (!change || change === 0) return 'text-muted-foreground';
    return change > 0 ? 'text-green-600' : 'text-red-600';
};
