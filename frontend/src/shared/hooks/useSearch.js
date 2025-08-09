import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";
import { createFetcher } from "../../lib/fetcher";
import config from "../config";

export const useSearch = (searchQuery, options = {}) => {
    const {
        enabled = true,
        debounceDelay = 300,
        limit = 15
    } = options;

    // Debounce the search query
    const debouncedQuery = useDebounce(searchQuery, debounceDelay);

    const {
        data,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ["search", debouncedQuery, limit],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.trim().length < 2) {
                return { results: [], count: 0, query: debouncedQuery };
            }

            return await createFetcher({
                method: "GET",
                url: `${config.endpoints.search}?q=${encodeURIComponent(debouncedQuery)}&limit=${limit}`,
            })();
        },
        enabled: enabled && !!debouncedQuery && debouncedQuery.trim().length >= 2,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });

    return {
        results: data?.results || [],
        count: data?.count || 0,
        query: data?.query || debouncedQuery,
        isLoading,
        error,
        refetch,
        hasQuery: !!debouncedQuery && debouncedQuery.trim().length >= 2
    };
};
