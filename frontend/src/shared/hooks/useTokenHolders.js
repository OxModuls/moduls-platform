import { useQuery } from '@tanstack/react-query';
import { createFetcher } from '@/lib/fetcher';
import config from '../config';
import { keepPreviousData } from '@tanstack/react-query';


export const useTokenHolders = (tokenAddress, options = {}) => {
    const { limit = 50, offset = 0, sort = 'balance', enabled = true } = options;

    return useQuery({
        queryKey: ['token-holders', tokenAddress, limit, offset, sort],
        queryFn: () => createFetcher({
            url: `${config.endpoints.holders}/${tokenAddress}`,
            method: 'GET',
            params: { limit, offset, sort }
        })(),
        enabled: enabled && !!tokenAddress,
        refetchInterval: 30000, // Refetch every 30 seconds
        staleTime: 10000, // Consider data stale after 10 seconds
        placeholderData: keepPreviousData, // Keep previous data while refetching
    });
};


export const useTokenHolderStats = (tokenAddress, options = {}) => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: ['token-holder-stats', tokenAddress],
        queryFn: () => createFetcher({
            url: `${config.endpoints.holderStats}/${tokenAddress}`,
            method: 'GET'
        })(),
        enabled: enabled && !!tokenAddress,
        refetchInterval: 60000, // Refetch every minute
        staleTime: 30000, // Consider data stale after 30 seconds
        placeholderData: keepPreviousData,
    });
};


export const useIndexerStatus = (options = {}) => {
    const { enabled = true } = options;

    return useQuery({
        queryKey: ['indexer-status'],
        queryFn: () => createFetcher({
            url: `${config.endpoints.indexer}/status`,
            method: 'GET'
        })(),
        enabled,
        refetchInterval: 30000, // Refetch every 30 seconds
        staleTime: 10000,
        placeholderData: keepPreviousData,
    });
}; 