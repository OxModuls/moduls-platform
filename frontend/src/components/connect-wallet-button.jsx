import { useAccount } from "wagmi";
import metamaskIcon from "../assets/icons/metamask.svg";
import trustwalletIcon from "../assets/icons/trustwallet.svg";
import avatarImage from "../assets/avatar.svg";
import { useWalletModalStore } from "../shared/store";
import AuthStatusIndicator from "./auth-status-indicator";

// map connector icons
const connectorIcons = new Map([
  ["metaMaskSDK", metamaskIcon],
  ["com.trustwallet.app", trustwalletIcon],
]);

const ConnectWalletButton = () => {
  const { isConnected, connector: activeConnector } = useAccount();
  const { isWalletModalOpen, openWalletModal, closeWalletModal } =
    useWalletModalStore();

  return (
    <>
      {isConnected ? (
        <button
          className="cursor-pointer"
          onClick={isWalletModalOpen ? closeWalletModal : openWalletModal}
          autoFocus={!isWalletModalOpen}
        >
          <div className="relative">
            <img
              src={avatarImage}
              alt=""
              className="size-8 rounded-full border-2 border-accent"
            />
            <img
              src={
                activeConnector?.icon || connectorIcons.get(activeConnector?.id)
              }
              alt={activeConnector?.name + "logo"}
              className="absolute right-0 bottom-0 size-5 rounded-full"
            />
            <AuthStatusIndicator size="sm" />
          </div>
        </button>
      ) : (
        <button
          onClick={isWalletModalOpen ? closeWalletModal : openWalletModal}
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
