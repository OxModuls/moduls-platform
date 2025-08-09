import { useState, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { signMessage } from "wagmi/actions";
import { wagmiConfig } from '../../wagmi';
import { createSIWEMessage } from '../../lib/siwe';

export const useWalletSignature = () => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [isSigning, setIsSigning] = useState(false);

    const getSIWESignature = useCallback(async (nonce) => {
        if (!isConnected || !address || !nonce) {
            throw new Error('Wallet not connected or nonce missing');
        }

        const message = createSIWEMessage(address, nonce, chainId);

        try {
            setIsSigning(true);
            const signature = await signMessage(wagmiConfig, {
                message,
                account: address,
            });
            return { signature, message };
        } finally {
            setIsSigning(false);
        }
    }, [address, isConnected, chainId]);

    return {
        getSIWESignature,
        isSigning,
    };
}; 