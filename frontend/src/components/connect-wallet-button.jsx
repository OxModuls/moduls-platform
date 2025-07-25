import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Copy, Power } from "lucide-react";

import metamaskIcon from "../assets/icons/metamask.svg";
import trustwalletIcon from "../assets/icons/trustwallet.svg";
import avatarImage from "../assets/avatar.svg";
import { ellipsizeAddress, writeToClipboard } from "@/lib/utils";
import { toast } from "sonner";

// map connector icons
const connectorIcons = new Map([
  ["metaMaskSDK", metamaskIcon],
  ["com.trustwallet.app", trustwalletIcon],
]);

const ConnectWalletButton = () => {
  const { connect, connectors } = useConnect();
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { disconnect } = useDisconnect();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const connectWallet = async (connector) => {
    try {
      connect(
        { connector: connector },
        {
          onSuccess: () => {
            toast.success("Connected wallet");
            setDrawerOpen(false);
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
          setDrawerOpen(false);
        },
      },
    );
  };

  return (
    <>
      {isConnected ? (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger className="cursor-pointer">
            <div className="relative">
              <img
                src={avatarImage}
                alt=""
                className="size-8 rounded-full border-2 border-accent"
              />
              <img
                src={
                  activeConnector?.icon ||
                  connectorIcons.get(activeConnector?.id)
                }
                alt={activeConnector?.name + "logo"}
                className="size-5 rounded-full absolute bottom-0 right-0"
              />
            </div>
          </DrawerTrigger>
          <DrawerContent>
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
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <button className="py-2 rounded-lg bg-accent">Close</button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button className="px-3 py-2 bg-accent rounded-xl font-bold transition-all duration-500 hover:scale-105 cursor-pointer">
              Connect
            </button>
          </DrawerTrigger>
          <DrawerContent>
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
            <DrawerFooter>
              <DrawerClose asChild>
                <button className="py-2 rounded-lg bg-accent">Close</button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

export default ConnectWalletButton; 