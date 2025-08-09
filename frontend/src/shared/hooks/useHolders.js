import { useQuery } from '@tanstack/react-query';
import { createFetcher } from '../../lib/fetcher';
import config from '../config';

/**
 * Hook to fetch top holders for a specific token
 */
export const useTokenHolders = (tokenAddress, options = {}) => {
    const {
        enabled = true,
        limit = 100,
        offset = 0,
        refetchInterval = 60000 // Refetch every minute
    } = options;

    return useQuery({
        queryKey: ['token-holders', tokenAddress, limit, offset],
        queryFn: async () => {
            if (!tokenAddress) return null;

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });

            return await createFetcher({
                url: `${config.endpoints.holders}/${tokenAddress}?${params}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled: enabled && !!tokenAddress,
        refetchInterval,
        staleTime: 30000, // Consider data stale after 30 seconds
        refetchOnWindowFocus: true,
    });
};

/**
 * Hook to fetch holder statistics for a specific token
 */
export const useTokenHolderStats = (tokenAddress, options = {}) => {
    const {
        enabled = true,
        refetchInterval = 60000 // Refetch every minute
    } = options;

    return useQuery({
        queryKey: ['token-holder-stats', tokenAddress],
        queryFn: async () => {
            if (!tokenAddress) return null;

            return await createFetcher({
                url: `${config.endpoints.holders}/${tokenAddress}/stats`,
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
 * Hook to fetch user holdings across all tokens
 */
export const useUserHoldings = (userAddress, options = {}) => {
    const {
        enabled = true,
        limit = 50,
        offset = 0,
        refetchInterval = 60000
    } = options;

    return useQuery({
        queryKey: ['user-holdings', userAddress, limit, offset],
        queryFn: async () => {
            if (!userAddress) return null;

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });

            return await createFetcher({
                url: `${config.endpoints.userHoldings}/${userAddress}?${params}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled: enabled && !!userAddress,
        refetchInterval,
        staleTime: 30000,
        refetchOnWindowFocus: true,
    });
};

/**
 * Hook to fetch platform-wide holder overview
 */
export const useHolderOverview = (options = {}) => {
    const {
        enabled = true,
        refetchInterval = 120000 // Refetch every 2 minutes
    } = options;

    return useQuery({
        queryKey: ['holder-overview'],
        queryFn: async () => {
            return await createFetcher({
                url: `${config.endpoints.holderOverview}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled,
        refetchInterval,
        staleTime: 60000, // Consider data stale after 1 minute
        refetchOnWindowFocus: true,
    });
};

/**
 * Utility function to format holder balance
 */
export const formatHolderBalance = (balance, decimals = 18) => {
    if (!balance || balance === '0') return '0';

    try {
        const balanceNum = parseFloat(balance) / Math.pow(10, decimals);

        if (balanceNum >= 1000000000) {
            return `${(balanceNum / 1000000000).toFixed(2)}B`;
        } else if (balanceNum >= 1000000) {
            return `${(balanceNum / 1000000).toFixed(2)}M`;
        } else if (balanceNum >= 1000) {
            return `${(balanceNum / 1000).toFixed(2)}K`;
        } else if (balanceNum >= 1) {
            return balanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 });
        } else {
            return balanceNum.toFixed(8);
        }
    } catch (error) {
        console.error('Error formatting holder balance:', error);
        return '0';
    }
};

/**
 * Utility function to format holder percentage
 */
export const formatHolderPercentage = (percentage) => {
    if (!percentage || percentage === 0) return '0%';

    if (percentage >= 1) {
        return `${percentage.toFixed(2)}%`;
    } else if (percentage >= 0.01) {
        return `${percentage.toFixed(3)}%`;
    } else {
        return `${percentage.toFixed(4)}%`;
    }
};

/**
 * Utility function to get holder category based on percentage
 */
export const getHolderCategory = (percentage) => {
    if (percentage >= 10) return { name: 'Whale', color: 'text-purple-600' };
    if (percentage >= 1) return { name: 'Large', color: 'text-blue-600' };
    if (percentage >= 0.1) return { name: 'Medium', color: 'text-green-600' };
    if (percentage >= 0.01) return { name: 'Small', color: 'text-yellow-600' };
    return { name: 'Micro', color: 'text-gray-600' };
};

/**
 * Utility function to shorten wallet address
 */
export const shortenAddress = (address, startLength = 6, endLength = 4) => {
    if (!address) return '';
    if (address.length <= startLength + endLength) return address;

    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};
