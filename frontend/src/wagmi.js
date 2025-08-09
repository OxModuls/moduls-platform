import { http, createConfig } from "wagmi";
import { sei, seiTestnet } from "wagmi/chains";
import { metaMask } from "wagmi/connectors";


export const wagmiConfig = createConfig({
    chains: [sei, seiTestnet],
    connectors: [metaMask()],
    transports: {
        [sei.id]: http(),
        [seiTestnet.id]: http(),
    },
}); 