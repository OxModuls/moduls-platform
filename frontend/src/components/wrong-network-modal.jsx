import { useState, useEffect } from "react";
import { useAccount, useChainId, useDisconnect, useSwitchChain } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertTriangle, Network, Unplug } from "lucide-react";
import config from "../shared/config";

const WrongNetworkModal = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);

  // SEI testnet chain ID
  const seiTestnetChainId = 1328;

  // Check if user is on wrong network
  const isWrongNetwork = isConnected && chainId !== seiTestnetChainId;

  useEffect(() => {
    setIsOpen(isWrongNetwork);
  }, [isWrongNetwork]);

  const handleSwitchNetwork = async () => {
    try {
      await switchChain({ chainId: seiTestnetChainId });
      setIsOpen(false);
    } catch (error) {
      console.log("Failed to switch network:", error);
      // If switch fails, let user know they can disconnect
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  const handleClose = () => {
    // Don't allow closing if still on wrong network
    if (!isWrongNetwork) {
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="border-border/20 bg-card backdrop-blur-xl sm:max-w-lg">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Network Switch Required
          </DialogTitle>
          <DialogDescription className="mt-2 text-base leading-relaxed text-muted-foreground">
            Moduls is optimized for SEI Testnet. Please switch your wallet to
            the correct network for the best experience.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-8 space-y-3">
          <Button
            onClick={handleSwitchNetwork}
            className="group w-full bg-primary py-4 font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-lg"
            size="lg"
          >
            <Network className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
            Switch to SEI Testnet
          </Button>

          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="w-full border-border py-4 font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
            size="lg"
          >
            <Unplug className="mr-2 h-5 w-5" />
            Disconnect Wallet
          </Button>
        </div>

        <div className="mt-6 rounded-lg border border-border/50 bg-muted/30 p-4">
          <div className="flex items-start space-x-3">
            <div className="mt-1 flex-shrink-0">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                <span className="text-xs font-bold text-primary">i</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Tip:</span> If the
              network switch doesn't work automatically, you may need to add SEI
              Testnet to your wallet manually.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WrongNetworkModal;
