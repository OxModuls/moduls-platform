import { useAccount } from "wagmi";
import metamaskIcon from "../assets/icons/metamask.svg";
import trustwalletIcon from "../assets/icons/trustwallet.svg";
import { useWalletModalStore } from "../shared/store";
import AuthStatusIndicator from "./auth-status-indicator";
import { useIsMobile } from "../hooks/use-mobile";
import { generateJazzicon } from "@/lib/utils";
import { useAuth } from "@/shared/hooks/useAuth";

// map connector icons
const connectorIcons = new Map([
  ["metaMaskSDK", metamaskIcon],
  ["com.trustwallet.app", trustwalletIcon],
]);

const ConnectWalletButton = () => {
  const { isConnected, connector: activeConnector } = useAccount();
  const { user: currentUser } = useAuth();
  const { isWalletModalOpen, setWalletModal } = useWalletModalStore();
  const isMobile = useIsMobile();

  return (
    <>
      {isConnected ? (
        <button
          className="cursor-pointer"
          onClick={() => setWalletModal(!isWalletModalOpen)}
          autoFocus={!isWalletModalOpen}
        >
          <div className="relative">
            {currentUser?.walletAddress ? (
              <div
                className="flex size-9 items-center justify-center rounded-full border-2 border-accent md:size-11"
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
              <div className="flex size-9 items-center justify-center rounded-full border-2 border-accent md:size-11">
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
            <AuthStatusIndicator size={isMobile ? "sm" : "md"} />
          </div>
        </button>
      ) : (
        <button
          onClick={() => setWalletModal(!isWalletModalOpen)}
          className="bg-button-gradient cursor-pointer rounded-xl px-3 py-2 transition-all duration-500 hover:scale-105"
          autoFocus={!isWalletModalOpen}
        >
          Connect
        </button>
      )}
    </>
  );
};

export default ConnectWalletButton;
