import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useWalletSignature } from "./useWalletSignature";
import { createFetcher } from "../../lib/fetcher";
import config from "../config";

// Cache for storing JWT tokens
const tokenCache = new Map();

export const useAuth = () => {
    const { address, isConnected } = useAccount();
    const { getSignature, hasSignature } = useWalletSignature();
    const queryClient = useQueryClient();
    const [accessToken, setAccessToken] = useState(() => {
        if (address && tokenCache.has(address)) {
            console.log("useAuth: Found cached token for address:", address);
            return tokenCache.get(address);
        }
        console.log("useAuth: No cached token found for address:", address);
        return null;
    });

    console.log("useAuth: Current state - address:", address, "isConnected:", isConnected, "accessToken:", !!accessToken);

    // JWT token query
    const {
        data: authData,
        isPending: isAuthPending,
        isFetched: isAuthFetched,
        error: authError,
        refetch: refetchAuth
    } = useQuery({
        queryKey: ["auth", address],
        queryFn: async () => {
            console.log("useAuth: Auth queryFn called - isConnected:", isConnected, "address:", address);

            if (!isConnected || !address) {
                console.log("useAuth: Not connected or no address, returning null");
                return null;
            }

            // Check cache first
            if (tokenCache.has(address)) {
                const cachedToken = tokenCache.get(address);
                console.log("useAuth: Using cached token for address:", address);
                setAccessToken(cachedToken);
                return { token: cachedToken, address };
            }

            console.log("useAuth: No cached token, proceeding with authentication");

            // Get signature if not already cached
            if (!hasSignature()) {
                console.log("useAuth: No signature cached, getting signature...");
                try {
                    await getSignature();
                } catch (error) {
                    console.error("useAuth: Failed to get signature:", error);
                    throw new Error("Failed to get wallet signature");
                }
            } else {
                console.log("useAuth: Signature already cached");
            }

            // Get signature from cache (it should be there now)
            console.log("useAuth: Getting signature for API call");
            const signature = await getSignature();
            console.log("useAuth: Got signature, length:", signature?.length);

            // Request JWT token from backend
            console.log("useAuth: Making auth request to:", config.endpoints.auth);
            const response = await createFetcher({
                method: "POST",
                url: config.endpoints.auth,
                body: {
                    walletAddress: address,
                    signature,
                    message: "Hello there! We would like to verify your wallet ownership to provide you with a seamless experience on Moduls. This signature helps us ensure you're the rightful owner of this wallet address."
                }
            })();

            console.log("useAuth: Auth response received:", response);

            if (response.token) {
                // Cache the token
                console.log("useAuth: Caching token for address:", address);
                tokenCache.set(address, response.token);
                setAccessToken(response.token);
                return response;
            }

            console.error("useAuth: No token in response");
            throw new Error("Failed to get authentication token");
        },
        enabled: isConnected && !!address, // Only require connection and address, not signature
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: (failureCount, error) => {
            console.log("useAuth: Auth query retry attempt:", failureCount, "error:", error);
            if (error?.status === 401) return false;
            return failureCount < 3;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    console.log("useAuth: Auth query state - isPending:", isAuthPending, "isFetched:", isAuthFetched, "error:", authError);

    // User query (fetches user data if authenticated)
    const {
        data: user,
        isPending: isUserPending,
        isFetched: isUserFetched,
        error: userError,
        refetch: refetchUser
    } = useQuery({
        queryKey: ["user", accessToken],
        queryFn: async () => {
            console.log("useAuth: User queryFn called - accessToken:", !!accessToken);

            if (!accessToken) {
                console.log("useAuth: No access token, returning null for user");
                return null;
            }

            try {
                console.log("useAuth: Fetching user data from:", config.endpoints.user);
                const userData = await createFetcher({
                    method: "GET",
                    url: config.endpoints.user,
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                })();
                console.log("useAuth: User data received:", userData);
                return userData;
            } catch (error) {
                console.error("useAuth: User fetch error:", error);
                if (error?.status === 401) {
                    console.log("useAuth: 401 error, clearing token cache and refetching auth");
                    // Token expired, clear cache and refetch auth
                    tokenCache.delete(address);
                    setAccessToken(null);
                    refetchAuth();
                }
                return null;
            }
        },
        enabled: !!accessToken,
        refetchInterval: 1000 * 60 * 5, // 5 minutes
        retry: (failureCount, error) => {
            console.log("useAuth: User query retry attempt:", failureCount, "error:", error);
            if (error?.status === 401) return false;
            return failureCount < 3;
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    console.log("useAuth: User query state - isPending:", isUserPending, "isFetched:", isUserFetched, "error:", userError, "user:", !!user);

    // Auth state
    const isAuthenticated = !!accessToken && !!user;
    const isLoading = isAuthPending || isUserPending;
    const isAuthChecked = isAuthFetched && isUserFetched && !isLoading;

    console.log("useAuth: Auth state - isAuthenticated:", isAuthenticated, "isLoading:", isLoading, "isAuthChecked:", isAuthChecked);

    // Get access token function - returns cached token or triggers auth
    const getAccessToken = useCallback(async () => {
        console.log("useAuth: getAccessToken called - current token:", !!accessToken);

        if (accessToken) {
            console.log("useAuth: Returning existing access token");
            return accessToken;
        }

        if (isConnected && address) {
            // Trigger authentication if not already authenticated
            if (!isAuthenticated && !isLoading) {
                console.log("useAuth: Triggering auth refetch");
                await refetchAuth();
            } else {
                console.log("useAuth: Auth already in progress or authenticated");
            }
        } else {
            console.log("useAuth: Not connected or no address");
        }

        return accessToken;
    }, [accessToken, isConnected, address, isAuthenticated, isLoading, refetchAuth]);

    // Logout function
    const logout = useCallback(() => {
        console.log("useAuth: Logout called for address:", address);

        if (address) {
            console.log("useAuth: Clearing token cache for address:", address);
            tokenCache.delete(address);
        }

        console.log("useAuth: Setting access token to null");
        setAccessToken(null);

        console.log("useAuth: Invalidating queries");
        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.removeQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        queryClient.removeQueries({ queryKey: ["auth"] });

        console.log("useAuth: Logout completed");
    }, [address, queryClient]);

    // Auto-refresh token logic
    useEffect(() => {
        console.log("useAuth: Auto-refresh effect - isConnected:", isConnected, "address:", address, "accessToken:", !!accessToken, "hasSignature:", hasSignature());

        if (isConnected && address && !accessToken && hasSignature()) {
            console.log("useAuth: Auto-refreshing auth");
            refetchAuth();
        }
    }, [isConnected, address, accessToken, hasSignature, refetchAuth]);

    return {
        user: user ?? null,
        accessToken,
        isAuthenticated,
        isLoading,
        isAuthChecked,
        error: authError || userError,
        logout,
        refetchAuth,
        refetchUser,
        getAccessToken
    };
}; 