import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { Popover, PopoverContent, PopoverAnchor } from "./ui/popover";
import {
  Bot,
  CircleCheck,
  Copy,
  LoaderCircle,
  Power,
  User,
} from "lucide-react";
import metamaskIcon from "../assets/icons/metamask.svg";
import trustwalletIcon from "../assets/icons/trustwallet.svg";
import walletConnectIcon from "../assets/icons/walletconnect.svg";
import coinbaseIcon from "../assets/icons/coinbase.svg";
import {
  ellipsizeAddress,
  generateJazzicon,
  writeToClipboard,
} from "@/lib/utils";
import { toast } from "sonner";
import { useWalletModalStore } from "../shared/store";
import { useAuth } from "../shared/hooks/useAuth";
import { Fragment, useEffect, useState } from "react";
import AuthStatusIndicator from "./auth-status-indicator";
import { formatBigIntToUnits } from "../lib/utils";
import { Separator } from "./ui/separator";
import { useIsMobile } from "../hooks/use-mobile";
import MyAgentsDialog from "./my-agents-dialog";
import ProfileDialog from "./profile-dialog";

// map connector icons
const connectorIcons = new Map([
  ["metaMaskSDK", metamaskIcon],
  ["com.trustwallet.app", trustwalletIcon],
  ["walletConnect", walletConnectIcon],
  ["coinbaseWalletSDK", coinbaseIcon],
]);

const WalletConnectModal = () => {
  const { address, isConnected } = useAccount();
  const { isWalletModalOpen, setWalletModal } = useWalletModalStore();
  const { isAuthenticated, logout, authenticate } = useAuth();
  const isMobile = useIsMobile();

  // Auto-authenticate when wallet connects with mobile optimization
  useEffect(() => {
    if (isConnected && address && !isAuthenticated) {
      console.log("🔐 Triggering auto-authentication for:", address);

      // Mobile-optimized timing and retry logic
      const initialDelay = isMobile ? 2000 : 500; // Longer delay for mobile

      const attemptAuthentication = async (retryCount = 0) => {
        try {
          // Wait for stable connection on mobile
          if (isMobile) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          // Check if still connected before authenticating
          if (isConnected && address && !isAuthenticated) {
            await authenticate();
            console.log("✅ Auto-authentication successful");
          }
        } catch (error) {
          if (error.message === "USER_REJECTED") {
            console.log("🚫 User rejected authentication");
            return;
          }

          console.error(
            `❌ Auto-authentication failed (attempt ${retryCount + 1}):`,
            error,
          );

          // Retry logic for mobile (network issues, timing, etc.)
          if (
            isMobile &&
            retryCount < 2 &&
            isConnected &&
            address &&
            !isAuthenticated
          ) {
            const retryDelay = (retryCount + 1) * 2000; // 2s, 4s
            console.log(`🔄 Retrying authentication in ${retryDelay}ms...`);

            setTimeout(() => {
              if (isConnected && address && !isAuthenticated) {
                attemptAuthentication(retryCount + 1);
              }
            }, retryDelay);
          }
        }
      };

      const timer = setTimeout(() => attemptAuthentication(), initialDelay);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, isAuthenticated, authenticate, isMobile]);

  // Handle wallet disconnection
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      logout();
      toast.info("Authentication cleared");
    }
  }, [isConnected, isAuthenticated, logout]);

  if (isMobile) {
    return (
      <Drawer open={isWalletModalOpen} onOpenChange={setWalletModal}>
        <DrawerContent className="md:hidden">
          {isConnected ? (
            <>
              <DrawerHeader>
                <DrawerTitle className="sr-only">Connected Wallet</DrawerTitle>
                <DrawerDescription className="sr-only">
                  Connected Wallet Details
                </DrawerDescription>
              </DrawerHeader>
              <ConnectedContent />
            </>
          ) : (
            <>
              <DrawerHeader>
                <DrawerTitle>Connect a wallet</DrawerTitle>
                <DrawerDescription className="sr-only">
                  Choose a wallet to connect
                </DrawerDescription>
              </DrawerHeader>
              <DisconnectedContent />
            </>
          )}
          <DrawerFooter>
            <DrawerClose asChild>
              <button className="bg-button-gradient rounded-lg py-2">
                Close
              </button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={isWalletModalOpen} onOpenChange={setWalletModal}>
      <PopoverAnchor asChild>
        <div className="absolute top-16 right-8" />
      </PopoverAnchor>
      <div
        className={`fixed inset-0 bg-black/50`}
        hidden={!isWalletModalOpen}
      />
      <PopoverContent className="mt-1 hidden w-sm rounded-lg border bg-background py-4 shadow-lg md:block">
        {isConnected ? <ConnectedContent /> : <DisconnectedContent />}
      </PopoverContent>
    </Popover>
  );
};

const ConnectedContent = () => {
  const { address, connector: activeConnector } = useAccount();
  const { disconnect } = useDisconnect();
  const { closeWalletModal } = useWalletModalStore();
  const { isAuthenticated, isLoading, user: currentUser } = useAuth();
  const { data: walletBalance } = useBalance({ address });
  const formattedWalletBalance = !!walletBalance
    ? formatBigIntToUnits(walletBalance.value, walletBalance.decimals)
    : "0";
  const [myAgentsDialogOpen, setMyAgentsDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

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

  const menuItems = [
    {
      title: "Profile",
      icon: User,
      onClick: () => setProfileDialogOpen((prev) => !prev),
    },
    {
      title: "My Agents",
      icon: Bot,
      onClick: () => setMyAgentsDialogOpen((prev) => !prev),
    },
    {
      title: "Disconnect",
      icon: Power,
      onClick: disconnectWallet,
    },
  ];

  return (
    <div className="px-4 md:px-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {currentUser?.walletAddress ? (
              <div
                className="flex size-12 items-center justify-center rounded-full border-2 border-accent"
                ref={(el) => {
                  if (el) {
                    const icon = generateJazzicon(
                      currentUser.walletAddress,
                      32,
                    );
                    if (icon) {
                      el.innerHTML = "";
                      icon.className = "user-icon";
                      el.appendChild(icon);
                    }
                  }
                }}
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-full border-2 border-accent">
                <span>U</span>
              </div>
            )}
            <img
              src={
                activeConnector?.icon || connectorIcons.get(activeConnector?.id)
              }
              alt={activeConnector?.name + "logo"}
              className="absolute right-0 bottom-0 size-6 rounded-full"
            />
            <AuthStatusIndicator size="md" />
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 px-1">
              <span className="font-medium">
                {ellipsizeAddress(address, 7, 7)}
              </span>
              <button
                className="cursor-pointer"
                onClick={() => writeToClipboard(address)}
              >
                <Copy className="size-5" />
              </button>
            </div>
            <div className="rounded-lg bg-neutral-800 px-2 py-0.5 font-medium">
              <span>{formattedWalletBalance}</span> <span>SEI</span>
            </div>
          </div>
        </div>
      </div>
      {isLoading && (
        <div className="mt-4 flex items-center justify-start gap-2">
          <LoaderCircle className="size-6 animate-spin text-accent" />
          <span className="text-sm font-medium tracking-wide text-accent-foreground">
            Authenticating...
          </span>
        </div>
      )}
      {isAuthenticated && (
        <div className="mt-4 flex items-center justify-start gap-2">
          <CircleCheck className="size-6 text-green-600" />
          <span className="text-sm font-semibold tracking-wide text-green-600">
            Authenticated
          </span>
        </div>
      )}

      <Separator className="mt-4" />

      <div className="flex flex-col gap-1 pt-2">
        {menuItems.map((item, idx, items) => (
          <Fragment key={idx}>
            <button
              key={idx}
              className="flex w-full cursor-pointer items-center gap-4 rounded-lg px-2 py-2 hover:bg-neutral-800"
              onClick={item.onClick}
            >
              <item.icon className="size-6" />
              <span className="">{item.title}</span>
            </button>
            {idx + 1 < items.length && <Separator className="" />}
          </Fragment>
        ))}
      </div>
      <MyAgentsDialog
        open={myAgentsDialogOpen}
        onOpenChange={setMyAgentsDialogOpen}
      />
      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />
    </div>
  );
};

const DisconnectedContent = () => {
  const { connect, connectors } = useConnect();
  const { closeWalletModal } = useWalletModalStore();

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

  return (
    <div
      className="px-4 pt-2 md:px-0"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <h2 className="mb-4 hidden text-center font-semibold text-foreground md:block">
        Connect a wallet
      </h2>
      <div className="flex flex-col gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connectWallet(connector)}
            className="flex h-16 w-full cursor-pointer items-center gap-4 rounded-lg border bg-primary-foreground py-3 pl-4 transition-all duration-200 hover:border-accent hover:bg-red-950"
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
  );
};

export default WalletConnectModal;
