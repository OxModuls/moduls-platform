import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { metaMask } from "wagmi/connectors";
import config from "./shared/config.js";

// Sei Mainnet settings
const seiMainnet = {
    ...mainnet, // using mainnet as a base
    id: 1329,
    name: "Sei Mainnet",
    rpcUrls: {
        default: {
            http: [config.rpcUrls.mainnet.http],
            webSocket: [config.rpcUrls.mainnet.webSocket]
        },
    },
};

// Sei Testnet settings
const seiTestnet = {
    ...mainnet, // using mainnet as a base, then override
    id: 1328,
    name: "Sei Testnet",
    rpcUrls: {
        default: {
            http: [config.rpcUrls.testnet.http],
            webSocket: [config.rpcUrls.testnet.webSocket]
        },
    },
};

export const wagmiConfig = createConfig({
    chains: [seiMainnet, seiTestnet],
    connectors: [metaMask()],
    transports: {
        [seiMainnet.id]: http(),
        [seiTestnet.id]: http(),
    },
}); 