import { http, createConfig } from "wagmi";
import { sei, seiTestnet } from "wagmi/chains";
import { metaMask, injected } from "wagmi/connectors";


export const wagmiConfig = createConfig({
    chains: [sei, seiTestnet],
    connectors: [metaMask(), injected()],
    transports: {
        [sei.id]: http(),
        [seiTestnet.id]: http(),
    },
}); 