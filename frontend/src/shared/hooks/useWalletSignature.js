import { useState, useCallback } from "react";
import { useAccount, useChainId } from "wagmi";
import { signMessage } from "wagmi/actions";
import { wagmiConfig } from "../../wagmi";
import { createSIWEMessage } from "../../lib/siwe";
import config from "../config";

export const useWalletSignature = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isSigning, setIsSigning] = useState(false);

  const getSIWESignature = useCallback(
    async (nonce, timestamp = null) => {
      if (!isConnected || !address || !nonce) {
        throw new Error("Wallet not connected or nonce missing");
      }

      // Use actual connected chain ID, fallback to SEI testnet
      const actualChainId = chainId || 1328;

      const message = createSIWEMessage(
        address,
        nonce,
        actualChainId,
        config.domain,
        timestamp
      );

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
    },
    [address, isConnected, chainId],
  );

  return {
    getSIWESignature,
    isSigning,
  };
};

