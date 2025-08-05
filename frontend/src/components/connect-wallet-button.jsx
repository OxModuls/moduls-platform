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
                activeConnector?.icon || connectorIcons.get(activeConnector?.id)
              }
              alt={activeConnector?.name + "logo"}
              className="size-5 rounded-full absolute bottom-0 right-0"
            />
            <AuthStatusIndicator size="sm" />
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
