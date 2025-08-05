import { useQuery } from '@tanstack/react-query';
import { createFetcher } from '@/lib/fetcher';
import config from '../config';
import { keepPreviousData } from '@tanstack/react-query';

export const useTokenHolders = (tokenAddress, options = {}) => {
    const { limit = 50, offset = 0, sort = 'balance' } = options;

    return useQuery({
        queryKey: ['tokenHolders', tokenAddress, limit, offset, sort],
        queryFn: () => createFetcher({
            url: `${config.endpoints.holders}/${tokenAddress}`,
            method: 'GET',
            params: { limit, offset, sort }
        })(),
        enabled: !!tokenAddress,
        refetchInterval: 15000,
        staleTime: 5000,
        placeholderData: keepPreviousData,
    });
};

export const useTokenHolderStats = (tokenAddress) => {
    return useQuery({
        queryKey: ['tokenHolderStats', tokenAddress],
        queryFn: () => createFetcher({
            url: `${config.endpoints.holderStats}/${tokenAddress}/stats`,
            method: 'GET'
        })(),
        enabled: !!tokenAddress,
        refetchInterval: 30000,
        staleTime: 15000,
        placeholderData: keepPreviousData,
    });
};

export const useWebhookStatus = () => {
    return useQuery({
        queryKey: ['webhookStatus'],
        queryFn: () => createFetcher({
            url: `${config.endpoints.webhookStatus}`,
            method: 'GET'
        })(),
        refetchInterval: 30000,
        staleTime: 10000,
        placeholderData: keepPreviousData,
    });
}; 