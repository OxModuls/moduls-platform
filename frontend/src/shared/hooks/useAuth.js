import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useWalletSignature } from "./useWalletSignature";
import { createFetcher } from "../../lib/fetcher";
import config from "../config";
import { toast } from "sonner";

export const useAuth = () => {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { getSIWESignature } = useWalletSignature();
    const queryClient = useQueryClient();

    // Fetch current user if authenticated
    const {
        data: user,
        isLoading,
        error,
        refetch: refetchUser
    } = useQuery({
        queryKey: ["auth-user", address],
        queryFn: async () => {
            if (!isConnected || !address) return null;

            try {
                return await createFetcher({
                    method: "GET",
                    url: config.endpoints.getAuthUser,
                    credentials: 'include'
                })();
            } catch (error) {
                if (error?.status === 401) {
                    return null; // Not authenticated
                }
                throw error;
            }
        },
        enabled: isConnected && !!address,
        retry: (failureCount, error) => {
            // Don't retry 401 errors (not authenticated)
            if (error?.status === 401) return false;
            return failureCount < 2;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });

    const isAuthenticated = !!user;

    // Debug logging
    // useEffect(() => {
    //     console.log("🔍 Auth state:", {
    //         isConnected,
    //         address: address?.slice(0, 6) + "...",
    //         isAuthenticated,
    //         isLoading,
    //         user: !!user
    //     });
    // }, [isConnected, address, isAuthenticated, isLoading, user]);

    // Authenticate user
    const authenticate = useCallback(async () => {
        if (!isConnected || !address) {
            throw new Error('Wallet not connected');
        }

        try {
            // 1) Validate existing session first. Only proceed to SIWE if invalid/expired (401)
            let shouldPerformSiwe = false;
            try {
                const existing = await createFetcher({
                    method: "GET",
                    url: config.endpoints.getAuthUser,
                    credentials: 'include'
                })();
                if (existing) {
                    // Ensure cache reflects current user and return early (no SIWE prompt)
                    await refetchUser();
                    return;
                }
            } catch (err) {
                if (err?.status === 401) {
                    // Not authenticated → perform SIWE
                    shouldPerformSiwe = true;
                } else {
                    // Other errors (network/server). Do not trigger SIWE; surface error instead
                    throw err;
                }
            }

            if (!shouldPerformSiwe) {
                return;
            }

            // Get nonce and timestamp from server
            const { nonce, timestamp } = await createFetcher({
                method: "GET",
                url: `${config.endpoints.getNonce}?address=${encodeURIComponent(address)}`,
            })();

            // Sign SIWE message with server timestamp
            const { signature, message } = await getSIWESignature(nonce, timestamp);

            // Verify signature
            await createFetcher({
                method: "POST",
                url: config.endpoints.verifySignature,
                body: { message, signature },
                credentials: 'include'
            })();

            // Refresh user data and verify authentication was successful
            const { data: userData } = await refetchUser();
            if (userData) {
                toast.success('Authentication successful!');
            } else {
                throw new Error('Failed to fetch user data after authentication');
            }

        } catch (error) {
            // Enhanced mobile error detection and handling
            const errorMessage = error.message?.toLowerCase() || '';
            const isMobileDevice = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);

            if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
                disconnect();
                toast.error("Authentication cancelled");
                throw new Error("USER_REJECTED");
            }

            if (errorMessage.includes('network') || errorMessage.includes('chain')) {
                toast.error("Wrong network. Please switch to SEI Testnet in your wallet.");
                throw new Error("WRONG_NETWORK");
            }

            if (isMobileDevice && (errorMessage.includes('timeout') || errorMessage.includes('connection'))) {
                toast.error("Connection timeout. Please keep your wallet app open and try again.");
                throw new Error("MOBILE_TIMEOUT");
            }

            if (isMobileDevice && errorMessage.includes('fetch')) {
                toast.error("Network error. Please check your connection and try again.");
                throw new Error("NETWORK_ERROR");
            }

            toast.error(error.message || 'Authentication failed');
            throw error;
        }
    }, [isConnected, address, getSIWESignature, refetchUser, disconnect]);

    // Logout
    const logout = useCallback(async () => {
        try {
            await createFetcher({
                method: "POST",
                url: config.endpoints.logout,
                credentials: 'include'
            })();
        } catch (error) {
            console.error('Logout error:', error);
        }

        queryClient.clear();
        toast.success('Logged out successfully');
    }, [queryClient]);

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        authenticate,
        logout,
        refetch: refetchUser
    };
};