import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
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
            // Get nonce
            const { nonce } = await createFetcher({
                method: "GET",
                url: `${config.endpoints.getNonce}?address=${encodeURIComponent(address)}`,
            })();

            // Sign SIWE message
            const { signature, message } = await getSIWESignature(nonce);

            // Verify signature
            await createFetcher({
                method: "POST",
                url: config.endpoints.verifySignature,
                body: { message, signature },
                credentials: 'include'
            })();

            // Refresh user data
            await refetchUser();
            toast.success('Authentication successful!');

        } catch (error) {
            if (error.message?.includes('rejected') || error.message?.includes('denied')) {
                disconnect();
                toast.error("Authentication cancelled");
                throw new Error("USER_REJECTED");
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