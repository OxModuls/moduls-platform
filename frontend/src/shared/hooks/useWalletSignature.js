import { useCallback } from "react";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import { signMessage } from "wagmi/actions";
import { wagmiConfig } from "../../wagmi";
import { createSIWEMessage } from "../../lib/siwe";
import config from "../config";
import { toast } from "sonner";
import { useSignatureModalStore } from "../store";

export const useWalletSignature = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { openSignatureModal } = useSignatureModalStore();

  const getSIWESignature = useCallback(async (nonce, timestamp, isAuthenticated = false) => {
    // Ignore signature requests if user is already authenticated
    if (isAuthenticated) {
      return { signature: null, message: null };
    }

    if (!isConnected || !address || !nonce) {
      throw new Error("Wallet not connected or nonce missing");
    }

    if (!timestamp) {
      throw new Error("Server timestamp is required");
    }

    // Create the SIWE message first
    const message = createSIWEMessage(
      address,
      nonce,
      chainId || 1328,
      config.domain,
      timestamp
    );

    // Return a promise that resolves when user confirms
    return new Promise((resolve, reject) => {
      const messageDetails = {
        domain: config.domain,
        chainId: chainId || 1328,
        nonce,
        issuedAt: timestamp,
        address
      };

      // Show the signature confirmation modal
      openSignatureModal(messageDetails,
        // onProceed - user clicked proceed
        async () => {
          try {
            const signature = await signMessage(wagmiConfig, { message, account: address });
            resolve({ signature, message });
          } catch (error) {
            // Handle signature errors
            disconnect();
            console.error('Signature request error:', error);

            if (error.message?.includes('rejected') || error.message?.includes('denied') || error.message?.includes('User rejected')) {
              toast.error("Signature request cancelled by user");
            } else if (error.message?.includes('signature') || error.message?.includes('sign')) {
              toast.error("Signature request failed");
            } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
              toast.error("Network error - please check your connection");
            } else if (error.message?.includes('timeout')) {
              toast.error("Request timeout - please try again");
            } else {
              toast.error("Signature request failed - please try again");
            }

            reject(error);
          }
        },
        // onCancel - user clicked cancel
        () => {
          reject(new Error("User cancelled signature request"));
        }
      );
    });
  }, [address, isConnected, chainId, disconnect, openSignatureModal]);

  return { getSIWESignature };
};

