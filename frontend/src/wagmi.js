import { http, createConfig } from "wagmi";
import { sei, seiTestnet } from "wagmi/chains";
import { metaMask, walletConnect, coinbaseWallet } from "wagmi/connectors";
import config from "./shared/config";

export const wagmiConfig = createConfig({
    chains: [sei, seiTestnet],
    connectors: [
        metaMask(),
        walletConnect({
            projectId: config.projectId,
            metadata: {
                name: "Moduls",
                description: "AI Agent Tokenization Platform",
                url: "https://www.moduls.fun",
                icons: ["https://www.moduls.fun/moduls-logo.jpg"]
            },
            showQrModal: true,
            name: "Moduls",
            iconUrl: "https://www.moduls.fun/moduls-logo.jpg",


        }),
        coinbaseWallet({
            appName: "Moduls",
            appLogoUrl: "https://www.moduls.fun/moduls-logo.jpg"
        }),
    ],
    transports: {
        [sei.id]: http(),
        [seiTestnet.id]: http(),
    },
}); 