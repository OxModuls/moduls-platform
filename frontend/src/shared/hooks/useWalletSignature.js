import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { signMessage } from "wagmi/actions";
import { toast } from 'sonner';
import { config } from '../../wagmi';

// Cache for storing signatures
const signatureCache = new Map();

// Default verification message
const DEFAULT_VERIFICATION_MESSAGE = "Hello there! We would like to verify your wallet ownership to provide you with a seamless experience on Moduls. This signature helps us ensure you're the rightful owner of this wallet address.";

export const useWalletSignature = () => {
    const { address, isConnected } = useAccount();
    const [isSigning, setIsSigning] = useState(false);

    const getSignature = useCallback(async (message = DEFAULT_VERIFICATION_MESSAGE) => {
        if (!isConnected || !address) {
            throw new Error('Wallet not connected');
        }

        // Check cache first
        const cacheKey = `${address}-${message}`;
        if (signatureCache.has(cacheKey)) {
            console.log("useWalletSignature: Returning cached signature");
            return signatureCache.get(cacheKey);
        }

        try {
            console.log("useWalletSignature: Requesting signature for message:", message);
            setIsSigning(true);

            // Use the signMessage action that returns the signature directly
            const signature = await signMessage(config, {
                message,
                account: address,
            });

            console.log("useWalletSignature: Signature received:", signature);

            // Cache the signature
            signatureCache.set(cacheKey, signature);

            toast.success('Wallet verified successfully');
            return signature;
        } catch (err) {
            console.error('useWalletSignature: Failed to get signature:', err);
            toast.error('Failed to verify wallet');
            throw err;
        } finally {
            setIsSigning(false);
        }
    }, [address, isConnected]);

    const clearSignature = useCallback((message = DEFAULT_VERIFICATION_MESSAGE) => {
        if (address) {
            const cacheKey = `${address}-${message}`;
            signatureCache.delete(cacheKey);
        }
    }, [address]);

    const clearAllSignatures = useCallback(() => {
        signatureCache.clear();
    }, []);

    return {
        getSignature,
        clearSignature,
        clearAllSignatures,
        isSigning,
        hasSignature: (message = DEFAULT_VERIFICATION_MESSAGE) => {
            if (!address) return false;
            const cacheKey = `${address}-${message}`;
            return signatureCache.has(cacheKey);
        }
    };
}; 