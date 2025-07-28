import { useAccount, useConnect, useDisconnect } from "wagmi";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Copy, Power } from "lucide-react";
import metamaskIcon from "../assets/icons/metamask.svg";
import trustwalletIcon from "../assets/icons/trustwallet.svg";
import avatarImage from "../assets/avatar.svg";
import { ellipsizeAddress, writeToClipboard } from "@/lib/utils";
import { toast } from "sonner";
import { useWalletModalStore } from "../shared/store";
import { useAuth } from "../shared/hooks/useAuth";
import { useEffect, useRef } from "react";

// map connector icons
const connectorIcons = new Map([
  ["metaMaskSDK", metamaskIcon],
  ["com.trustwallet.app", trustwalletIcon],
]);

const WalletConnectModal = () => {
  const { connect, connectors } = useConnect();
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { disconnect } = useDisconnect();
  const { isWalletModalOpen, closeWalletModal } = useWalletModalStore();
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const wasConnected = useRef(isConnected);

  // Effect: Handle wallet connection/disconnection
  useEffect(() => {
    if (!wasConnected.current && isConnected && address && !isAuthenticated) {
      // Wallet just connected, authentication will be handled automatically by useAuth hook
      toast.success("Authenticating...");
    } else if (wasConnected.current && !isConnected) {
      // Wallet just disconnected, clear all auth data
      logout();
      toast.info("Authentication cleared");
    }
    wasConnected.current = isConnected;
  }, [isConnected, address, isAuthenticated, logout]);

  const connectWallet = async (connector) => {
    try {
      connect(
        { connector: connector },
        {
          onSuccess: () => {
            toast.success("Connected wallet");
            closeWalletModal();
          },
        },
      );
    } catch (err) {
      console.error("Failed to connect:", err);
      toast.error("Failed to connect wallet");
    }
  };

  const disconnectWallet = () => {
    disconnect(
      {},
      {
        onSuccess: () => {
          toast.success("Disconnected wallet");
          closeWalletModal();
        },
      },
    );
  };

  return (
    <Drawer open={isWalletModalOpen} onOpenChange={closeWalletModal}>
      <DrawerContent className="max-w-xl w-full mx-auto">
        {isConnected ? (
          <>
            <DrawerHeader>
              <DrawerTitle className="sr-only">Connected Wallet</DrawerTitle>
              <DrawerDescription className="sr-only">
                Connected Wallet Details
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={avatarImage}
                      alt=""
                      className="size-12 rounded-full border-2 border-accent"
                    />
                    <img
                      src={
                        activeConnector?.icon ||
                        connectorIcons.get(activeConnector?.id)
                      }
                      alt={activeConnector?.name + "logo"}
                      className="size-6 rounded-full absolute bottom-0 right-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className=" font-medium">
                      {ellipsizeAddress(address, 7, 7)}
                    </span>
                    <button
                      className="cursor-pointer"
                      onClick={() => writeToClipboard(address)}
                    >
                      <Copy className="size-5" />
                    </button>
                  </div>
                </div>
                <button className="cursor-pointer" onClick={disconnectWallet}>
                  <Power className="size-5" />
                </button>
              </div>
              {isAuthLoading && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full border-2 border-accent border-t-transparent h-5 w-5" />
                  <span className="text-sm text-accent-foreground font-medium tracking-wide">
                    Authenticating...
                  </span>
                </div>
              )}
              {isAuthenticated && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-green-600/10 text-green-600 h-5 w-5">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                      <path d="M6 10.5l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="text-sm font-semibold text-green-600 tracking-wide">
                    Authenticated
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <DrawerHeader>
              <DrawerTitle>Connect a wallet</DrawerTitle>
              <DrawerDescription className="sr-only">
                Choose a wallet to connect
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <div className="flex flex-col gap-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connectWallet(connector)}
                    className="w-full h-16 py-3 pl-4 border rounded-lg bg-primary-foreground cursor-pointer flex items-center gap-4 hover:border-accent hover:bg-red-950 transition-all duration-200"
                  >
                    <img
                      src={connector.icon || connectorIcons.get(connector.id)}
                      alt={`${connector.name} icon`}
                      className="size-10"
                    />
                    <span>{connector.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <DrawerFooter>
          <DrawerClose asChild>
            <button className="py-2 rounded-lg bg-accent">Close</button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default WalletConnectModal; 