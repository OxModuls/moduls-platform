import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useWalletSignature } from "./useWalletSignature";
import { createFetcher } from "../../lib/fetcher";
import config from "../config";
import { getStorage, setStorage, removeStorage } from "../../lib/browser";
import { toast } from "sonner";

export const useAuth = () => {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { getSignature, hasSignature } = useWalletSignature();
    const queryClient = useQueryClient();

    // Initialize accessToken from localStorage first, then fallback to null
    const [accessToken, setAccessToken] = useState(() => {
        if (address) {
            const storedToken = getStorage(`auth_token_${address}`);
            if (storedToken) {
                return storedToken;
            }
        }
        return null;
    });

    // Effect to sync token when address changes
    useEffect(() => {
        if (address) {
            const storedToken = getStorage(`auth_token_${address}`);
            if (storedToken !== accessToken) {
                setAccessToken(storedToken);
            }
        } else {
            // Clear token when no address
            if (accessToken) {
                setAccessToken(null);
            }
        }
    }, [address, accessToken]);

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
            if (!isConnected || !address) {
                return null;
            }

            // Check localStorage first
            const storedToken = getStorage(`auth_token_${address}`);
            if (storedToken) {
                setAccessToken(storedToken);
                return { token: storedToken, address };
            }

            // Get signature if not already cached
            if (!hasSignature()) {
                try {
                    await getSignature();
                } catch (error) {
                    // Handle signature rejection/cancellation
                    if (error.message?.includes('User rejected') ||
                        error.message?.includes('User denied') ||
                        error.message?.includes('cancelled') ||
                        error.message?.includes('rejected')) {

                        // Clear auth state
                        if (address) {
                            removeStorage(`auth_token_${address}`);
                        }
                        setAccessToken(null);

                        // Disconnect wallet
                        disconnect();

                        // Show user-friendly message
                        toast.error("Verification failed. Please connect your wallet again to retry.");

                        // Don't retry this query
                        throw new Error("USER_REJECTED_SIGNATURE");
                    }

                    throw new Error("Failed to get wallet signature");
                }
            }

            // Get signature from cache (it should be there now)
            const signature = await getSignature();

            // Request JWT token from backend
            const response = await createFetcher({
                method: "POST",
                url: config.endpoints.auth,
                body: {
                    walletAddress: address,
                    signature,
                    message: "Hello there! We would like to verify your wallet ownership to provide you with a seamless experience on Moduls. This signature helps us ensure you're the rightful owner of this wallet address."
                }
            })();

            if (response.token) {
                // Store token in localStorage
                setStorage(`auth_token_${address}`, response.token);
                setAccessToken(response.token);
                return response;
            }

            throw new Error("Failed to get authentication token");
        },
        enabled: isConnected && !!address, // Only require connection and address, not signature
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: (failureCount, error) => {
            // Don't retry if user rejected signature
            if (error?.message === "USER_REJECTED_SIGNATURE") {
                return false;
            }

            if (error?.status === 401) return false;
            return failureCount < 3;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });

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
            if (!accessToken) {
                return null;
            }

            try {
                const userData = await createFetcher({
                    method: "GET",
                    url: config.endpoints.user,
                    auth: {
                        accessToken
                    }
                })();
                return userData;
            } catch (error) {
                if (error?.status === 401) {
                    // Token expired, clear from localStorage and refetch auth
                    if (address) {
                        removeStorage(`auth_token_${address}`);
                    }
                    setAccessToken(null);
                    refetchAuth();
                }
                return null;
            }
        },
        enabled: !!accessToken,
        refetchInterval: 1000 * 60 * 5, // 5 minutes
        retry: (failureCount, error) => {
            if (error?.status === 401) return false;
            return failureCount < 3;
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    // Auth state
    const isAuthenticated = !!accessToken && !!user;
    const isLoading = isAuthPending || isUserPending;
    const isAuthChecked = isAuthFetched && isUserFetched && !isLoading;

    // Get access token function - returns stored token or triggers auth
    const getAccessToken = useCallback(async () => {
        if (accessToken) {
            return accessToken;
        }

        if (isConnected && address) {
            // Check localStorage first
            const storedToken = getStorage(`auth_token_${address}`);
            if (storedToken) {
                setAccessToken(storedToken);
                return storedToken;
            }

            // Trigger authentication if not already authenticated
            if (!isAuthenticated && !isLoading) {
                await refetchAuth();
            }
        }

        return accessToken;
    }, [accessToken, isConnected, address, isAuthenticated, isLoading, refetchAuth]);

    // Logout function
    const logout = useCallback(() => {
        if (address) {
            removeStorage(`auth_token_${address}`);
        }

        setAccessToken(null);

        queryClient.invalidateQueries({ queryKey: ["user"] });
        queryClient.removeQueries({ queryKey: ["user"] });
        queryClient.invalidateQueries({ queryKey: ["auth"] });
        queryClient.removeQueries({ queryKey: ["auth"] });
    }, [address, queryClient]);

    // Auto-refresh token logic
    useEffect(() => {
        if (isConnected && address && !accessToken && hasSignature()) {
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