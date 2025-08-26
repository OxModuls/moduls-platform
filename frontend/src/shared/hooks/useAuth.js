import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
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

    // Simple user fetch - no complex retry logic
    const {
        data: user,
        isLoading,
        error
    } = useQuery({
        queryKey: ["auth-user", address],
        queryFn: async () => {
            if (!isConnected || !address) return null;

            return await createFetcher({
                method: "GET",
                url: config.endpoints.getAuthUser,
                credentials: 'include'
            })();
        },
        enabled: isConnected && !!address,
        retry: false, // No retries - simple fail/succeed
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
        onError: (error) => {
            // Handle 401 errors - expired session
            if (error?.status === 401) {
                disconnect();
                toast.error("Session expired - please sign in again");
                return;
            }
            // Log other errors for debugging
            console.error('Auth user fetch error:', error);
        }
    });

    const isAuthenticated = !!user;

    // Simplified authenticate - direct SIWE flow
    const authenticate = useCallback(async () => {
        if (!isConnected || !address) {
            throw new Error('Wallet not connected');
        }

        try {
            // 1. Get nonce + timestamp from server
            const { nonce, timestamp } = await createFetcher({
                method: "GET",
                url: `${config.endpoints.getNonce}?address=${encodeURIComponent(address)}`,
            })();

            // 2. Sign message with server timestamp
            const { signature, message } = await getSIWESignature(nonce, timestamp, isAuthenticated);

            // 3. Verify signature
            await createFetcher({
                method: "POST",
                url: config.endpoints.verifySignature,
                body: { message, signature },
                credentials: 'include'
            })();

            // 4. Refresh user data silently
            await queryClient.invalidateQueries(["auth-user", address]);

        } catch (error) {
            // Always disconnect first on any error
            disconnect();

            // Log the error for debugging
            console.error('Authentication error:', error);

            // Handle server error messages from signature verification
            if (error?.message && error?.status) {
                // Server returned an error with status and message from createFetcher
                toast.error(error.message);
            } else if (error?.message?.includes('rejected') || error?.message?.includes('denied') || error?.message?.includes('User rejected')) {
                toast.error("Authentication cancelled by user");
            } else if (error?.message?.includes('signature') || error?.message?.includes('sign')) {
                toast.error("Signature request failed");
            } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
                toast.error("Network error - please check your connection");
            } else if (error?.message?.includes('timeout')) {
                toast.error("Request timeout - please try again");
            } else {
                // Generic error message for unmatched errors
                toast.error("Authentication failed - please try again");
            }
        }
    }, [isConnected, address, getSIWESignature, queryClient, disconnect, isAuthenticated]);

    // Simple logout - no success toast
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
    }, [queryClient]);

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        authenticate,
        logout
    };
};