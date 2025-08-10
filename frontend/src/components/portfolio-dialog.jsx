import { Fragment } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import pepeImg from "../assets/images/pepe.png";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import AgentCard from "./agent-card";
import config from "../shared/config";
import { useAccount } from "wagmi";
import { createFetcher } from "../lib/fetcher";
import { useAuth } from "../shared/hooks/useAuth";
import { Link } from "react-router";
import { useWalletModalStore } from "../shared/store";

const dummyTokenHoldings = [
  {
    id: "eth-mainnet", // Unique identifier for the holding
    tokenName: "Ethereum",
    symbol: "ETH",
    amount: 0.87654321,
    usdPrice: 3500.0, // Dummy current price
    usdValue: 3067.89, // amount * usdPrice
    contractAddress: "0x0000000000000000000000000000000000000000", // ETH has a zero address
    logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.svg", // Placeholder for a logo
  },
  {
    id: "usdt-erc20",
    tokenName: "Tether USD",
    symbol: "USDT",
    amount: 1250.75,
    usdPrice: 1.0,
    usdValue: 1250.75,
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Common ERC-20 USDT
    logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=026",
  },
  {
    id: "wbtc-erc20",
    tokenName: "Wrapped Bitcoin",
    symbol: "WBTC",
    amount: 0.051234,
    usdPrice: 70000.0, // Dummy current price
    usdValue: 3586.38,
    contractAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // Common ERC-20 WBTC
    logoUrl: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png?v=026",
  },
  {
    id: "uni-erc20",
    tokenName: "Uniswap",
    symbol: "UNI",
    amount: 25.45,
    usdPrice: 12.5, // Dummy current price
    usdValue: 318.13,
    contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // Uniswap UNI token
    logoUrl: "https://cryptologos.cc/logos/uniswap-uni-logo.png?v=026",
  },
  {
    id: "link-erc20",
    tokenName: "Chainlink",
    symbol: "LINK",
    amount: 150.0,
    usdPrice: 18.2, // Dummy current price
    usdValue: 2730.0,
    contractAddress: "0x514910771AF9Ca65E36535Ec39EDc287eB1703Cd", // Chainlink LINK token
    logoUrl: "https://cryptologos.cc/logos/chainlink-link-logo.png?v=026",
  },
  {
    id: "dai-erc20",
    tokenName: "Dai Stablecoin",
    symbol: "DAI",
    amount: 500.0,
    usdPrice: 1.0,
    usdValue: 500.0,
    contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // Dai Stablecoin
    logoUrl: "https://cryptologos.cc/logos/dai-dai-logo.png?v=026",
  },
  {
    id: "shib-erc20",
    tokenName: "Shiba Inu",
    symbol: "SHIB",
    amount: 5000000.0, // Large quantity for meme coins
    usdPrice: 0.000025, // Dummy current price
    usdValue: 125.0,
    contractAddress: "0x95aD61b0a150d79219dCEa232fB6a9F4dFd6Cb4a", // Shiba Inu token
    logoUrl: "https://cryptologos.cc/logos/shiba-inu-shib-logo.png?v=026",
  },
];

const PortfolioDialog = ({ open, onOpenChange }) => {
  const { isAuthenticated } = useAuth();
  const { address } = useAccount();
  const { closeWalletModal } = useWalletModalStore();

  const [myAgentsResult] = useQueries({
    queries: [
      {
        queryKey: [config.endpoints.getMyAgents, address],
        queryFn: createFetcher({
          url: config.endpoints.getMyAgents,
          method: "GET",
          credentials: "include",
        }),
        placeholderData: keepPreviousData,
        enabled: isAuthenticated,
        refetchInterval: 1000 * 60,
      },
    ],
  });

  const { data: agentsData, isLoading: isMyAgentsLoading } = myAgentsResult;

  const myAgents = agentsData?.agents || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="md:w-sm">
        <DialogHeader>
          <DialogTitle>Portfolio</DialogTitle>
          <DialogDescription className="sr-only">
            View your portfolio
          </DialogDescription>
          <Separator className="my-2" />
          <div className="mt-2">
            <Tabs>
              <TabsList className="w-full bg-inherit">
                <TabsTrigger
                  value="bought"
                  className="relative flex cursor-pointer items-center gap-2 border-none border-accent text-base after:absolute after:bottom-0 after:left-[50%] after:h-0.5 after:w-[80%] after:translate-x-[-50%] after:bg-inherit after:content-[''] data-[state=active]:border-none data-[state=active]:after:bg-accent dark:data-[state=active]:bg-inherit dark:data-[state=active]:text-accent"
                >
                  Holdings
                </TabsTrigger>
                <TabsTrigger
                  value="created"
                  className="relative flex cursor-pointer items-center gap-2 border-none border-accent text-base after:absolute after:bottom-0 after:left-[50%] after:h-0.5 after:w-[80%] after:translate-x-[-50%] after:bg-inherit after:content-[''] data-[state=active]:border-none data-[state=active]:after:bg-accent dark:data-[state=active]:bg-inherit dark:data-[state=active]:text-accent"
                >
                  Agents Created
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="bought"
                className="max-h-96 min-h-96 overflow-y-auto"
              >
                <div className="mt-2 flex flex-col gap-2 pr-2">
                  {dummyTokenHoldings.map((token, idx) => (
                    <Fragment key={idx}>
                      <div className="flex justify-between rounded-xl px-4 py-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={pepeImg}
                            alt=""
                            className="size-8 rounded-full border border-neutral-500"
                          />
                          <div className="flex flex-col items-start text-sm">
                            <span className="">{token.tokenName}</span>
                            <span className="text-neutral-500">
                              {token.symbol}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end text-sm">
                          <span className="">${token.usdValue}</span>
                          <span className="text-neutral-500">
                            {token.amount} {token.symbol}
                          </span>
                        </div>
                      </div>
                      {idx + 1 < dummyTokenHoldings.length && <Separator />}
                    </Fragment>
                  ))}
                </div>
              </TabsContent>
              <TabsContent
                value="created"
                className="max-h-96 min-h-96 overflow-y-auto"
              >
                <div className="mt-4 w-full">
                  {isMyAgentsLoading && !myAgents ? (
                    <div className="h-16 w-full animate-pulse rounded-lg bg-accent/20 transition-opacity duration-500" />
                  ) : myAgents && myAgents.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {myAgents.map((agent) => (
                        <AgentCard key={agent.uniqueId} agent={agent} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-accent/20 bg-primary-foreground px-4 py-4 text-center text-muted-foreground">
                      <p className="block font-semibold">No agents yet</p>
                      <span className="mt-1 block text-xs">
                        You haven't launched any agents.
                      </span>
                      <Link
                        to="/create"
                        className="bg-button-gradient mx-auto mt-4 block w-fit rounded-lg px-3 py-2 text-white"
                        onClick={() => {
                          onOpenChange(false);
                          closeWalletModal();
                        }}
                      >
                        Launch an agent
                      </Link>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioDialog;
