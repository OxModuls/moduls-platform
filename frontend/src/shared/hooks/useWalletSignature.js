import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { signMessage } from "wagmi/actions";
import { toast } from 'sonner';
import { wagmiConfig } from '../../wagmi';

const signatureCache = new Map();

const getVerificationMessage = (address) =>
    `Hello there! We would like to verify your wallet ownership for address ${address} to provide you with a seamless experience on Moduls. This signature helps us ensure you're the rightful owner of this wallet address.`;

export const useWalletSignature = () => {
    const { address, isConnected } = useAccount();
    const [isSigning, setIsSigning] = useState(false);

    const getSignature = useCallback(async (message) => {
        if (!isConnected || !address) {
            throw new Error('Wallet not connected');
        }
        const msg = message || getVerificationMessage(address);
        const cacheKey = `${address}-${msg}`;
        if (signatureCache.has(cacheKey)) {
            return signatureCache.get(cacheKey);
        }
        try {
            setIsSigning(true);
            const signature = await signMessage(wagmiConfig, {
                message: msg,
                account: address,
            });
            signatureCache.set(cacheKey, signature);
            toast.success('Wallet verified successfully');
            return signature;
        } catch (err) {
            toast.error('Failed to verify wallet');
            throw err;
        } finally {
            setIsSigning(false);
        }
    }, [address, isConnected]);

    const clearSignature = useCallback((message) => {
        if (address) {
            const msg = message || getVerificationMessage(address);
            const cacheKey = `${address}-${msg}`;
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
        hasSignature: (message) => {
            if (!address) return false;
            const msg = message || getVerificationMessage(address);
            const cacheKey = `${address}-${msg}`;
            return signatureCache.has(cacheKey);
        },
        getVerificationMessage,
    };
}; 