import { useAccount } from "wagmi";
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
import { useWalletModalStore } from "../shared/store";

// map connector icons
const connectorIcons = new Map([
  ["metaMaskSDK", metamaskIcon],
  ["com.trustwallet.app", trustwalletIcon],
]);

const ConnectWalletButton = () => {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { openWalletModal } = useWalletModalStore();

  return (
    <>
      {isConnected ? (
        <button className="cursor-pointer" onClick={openWalletModal}>
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
        </button>
      ) : (
        <button 
          onClick={openWalletModal}
          className="px-3 py-2 bg-accent rounded-xl font-bold transition-all duration-500 hover:scale-105 cursor-pointer"
        >
          Connect
        </button>
      )}
    </>
  );
};

export default ConnectWalletButton; 