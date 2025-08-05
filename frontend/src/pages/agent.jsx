import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import AgentAboutTab from "@/components/agent-about-tab";
import AgentTradeTab from "@/components/agent-trade-tab";
import AgentHoldersTab from "@/components/agent-holders-tab";
import {
  BadgeDollarSign,
  Bot,
  Copy,
  Info,
  UserRound,
  Play,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { ellipsizeAddress, formatISODate, writeToClipboard } from "@/lib/utils";

import { useParams, useNavigate } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFetcher } from "@/lib/fetcher";
import config from "../shared/config";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useModulsSalesManager } from "@/shared/hooks/useModulsSalesManager";

const Agent = () => {
  const { uniqueId } = useParams();
  const navigate = useNavigate();
  const { address: connectedAddress } = useAccount();

  // Fetch agent data
  const {
    data: agentData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agent", uniqueId],
    queryFn: () =>
      createFetcher({
        url: `${config.endpoints.getAgent}/${uniqueId}`,
        method: "GET",
      })(),
    enabled: !!uniqueId,
    refetchInterval: 10000,
    placeholderData: keepPreviousData,
  });

  // Use ModulsSalesManager hook
  const {
    data: contractData,
    isLoading: contractLoading,
    error: contractError,
    isTokenRegistered,
    isTradingEnabled,
    isWritePending,
    buyTokenStatus,
    sellTokenStatus,
    buyToken,
    sellToken,
    registerToken,
  } = useModulsSalesManager(
    agentData?.agent?.tokenAddress &&
      agentData.agent.tokenAddress !==
        "0x0000000000000000000000000000000000000000"
      ? agentData.agent.tokenAddress
      : undefined,
  );

  // Handle opening trading (registering token)
  const handleOpenTrading = async () => {
    if (!agentData?.agent?.tokenAddress || !connectedAddress) {
      toast.error("Missing token address or wallet connection");
      return;
    }

    try {
      // Register token with the sales manager

      await registerToken();

      // toast.success("Token registered for trading!");
    } catch (error) {
      console.error("Error registering token:", error);
      toast.error("Failed to register token for trading");
    }
  };

  // Handle buy token
  const handleBuyToken = async (amount, maxCost) => {
    if (!amount || !maxCost || !connectedAddress) {
      toast.error("Please enter amount and ensure wallet is connected");
      return;
    }

    try {
      await buyToken({
        tokenAmount: amount,
        maxCost: maxCost,
      });
      toast.info("Pulling up your wallet now...");
    } catch (error) {
      console.error("Buy error:", error);
      toast.error("Buy transaction failed");
    }
  };

  // Handle sell token
  const handleSellToken = async (amount, minReturn) => {
    if (!amount || !minReturn || !connectedAddress) {
      toast.error("Please enter amount and ensure wallet is connected");
      return;
    }

    try {
      await sellToken({
        tokenAmount: amount,
        minReturn: minReturn,
      });
      toast.info("Pulling up your wallet now...");
    } catch (error) {
      console.error("Sell error:", error);
      toast.error("Sell transaction failed");
    }
  };

  const [chartData, _setChartData] = useState([
    {
      time: "2018-12-22",
      open: 75.16,
      high: 82.84,
      low: 36.16,
      close: 45.72,
    },
    {
      time: "2018-12-23",
      open: 45.12,
      high: 53.9,
      low: 45.12,
      close: 48.09,
    },
    {
      time: "2018-12-24",
      open: 60.71,
      high: 60.71,
      low: 53.39,
      close: 59.29,
    },
    {
      time: "2018-12-25",
      open: 68.26,
      high: 68.26,
      low: 59.04,
      close: 60.5,
    },
    {
      time: "2018-12-26",
      open: 67.71,
      high: 105.85,
      low: 66.67,
      close: 91.04,
    },
    {
      time: "2018-12-27",
      open: 91.04,
      high: 121.4,
      low: 82.7,
      close: 111.4,
    },
    {
      time: "2018-12-28",
      open: 111.51,
      high: 142.83,
      low: 103.34,
      close: 131.25,
    },
    {
      time: "2018-12-29",
      open: 131.33,
      high: 151.17,
      low: 77.68,
      close: 96.43,
    },
    {
      time: "2018-12-30",
      open: 106.33,
      high: 110.2,
      low: 90.39,
      close: 98.1,
    },
    {
      time: "2018-12-31",
      open: 109.87,
      high: 114.69,
      low: 85.66,
      close: 111.26,
    },
  ]);
  // Removed hardcoded holders data - now using real data from API
  const [activeTradeTab, setActiveTradeTab] = useState("buy");
  const [transactions, _setTransactions] = useState([
    {
      date: "2025-07-20T10:00:00Z",
      type: "buy",
      tokenAmount: 150.75,
      seiAmount: 300.5,
      account: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    },
    {
      date: "2025-07-20T10:05:30Z",
      type: "sell",
      tokenAmount: 50.0,
      seiAmount: 101.2,
      account: "0xdeadbeef1234567890abcdef1234567890abcdef",
    },
    {
      date: "2025-07-20T10:15:45Z",
      type: "buy",
      tokenAmount: 200.0,
      seiAmount: 405.0,
      account: "0x742d35Cc6634C05329C3aAbb04cFeB53e606Ce",
    },
    {
      date: "2025-07-20T10:22:10Z",
      type: "sell",
      tokenAmount: 75.5,
      seiAmount: 152.75,
      account: "0xAb5801a7D398351b8bE11C439e05C5B3259AeC9B",
    },
    {
      date: "2025-07-20T10:30:00Z",
      type: "buy",
      tokenAmount: 1000.0,
      seiAmount: 2000.0,
      account: "0x5A0b54D5dc17e0AadC383d2db43B0a0d3E0B2c0e",
    },
    {
      date: "2025-07-20T10:35:05Z",
      type: "sell",
      tokenAmount: 120.0,
      seiAmount: 242.4,
      account: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    },
    {
      date: "2025-07-20T10:40:20Z",
      type: "buy",
      tokenAmount: 30.25,
      seiAmount: 60.8,
      account: "0x82fF41e3D4EbA3C1c5B7F8eB4C5A03C12b1875eA",
    },
    {
      date: "2025-07-20T10:48:55Z",
      type: "sell",
      tokenAmount: 25.0,
      seiAmount: 50.0,
      account: "0x1dBB943b1D2C9E4C2A3C4B5E6D7E8F9A0B1C2D3E",
    },
    {
      date: "2025-07-20T10:55:00Z",
      type: "buy",
      tokenAmount: 500.0,
      seiAmount: 1010.0,
      account: "0x0A9F9B0000000000000000000000000000000000",
    },
    {
      date: "2025-07-20T11:02:15Z",
      type: "sell",
      tokenAmount: 10.0,
      seiAmount: 20.05,
      account: "0x2eCa6d4D3B000000000000000000000000000000",
    },
    {
      date: "2025-07-20T11:10:30Z",
      type: "buy",
      tokenAmount: 75.0,
      seiAmount: 150.1,
      account: "0x3f5CE5F1EDf14d80D1bE4A99979b977755555555",
    },
    {
      date: "2025-07-20T11:18:00Z",
      type: "sell",
      tokenAmount: 200.0,
      seiAmount: 400.0,
      account: "0x4feC95B5B3000000000000000000000000000000",
    },
    {
      date: "2025-07-20T11:25:40Z",
      type: "buy",
      tokenAmount: 18.5,
      seiAmount: 37.0,
      account: "0x5E6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D",
    },
    {
      date: "2025-07-20T11:33:10Z",
      type: "sell",
      tokenAmount: 300.0,
      seiAmount: 600.0,
      account: "0x6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B",
    },
    {
      date: "2025-07-20T11:40:00Z",
      type: "buy",
      tokenAmount: 90.0,
      seiAmount: 180.0,
      account: "0x7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C",
    },
    {
      date: "2025-07-20T11:47:25Z",
      type: "sell",
      tokenAmount: 5.0,
      seiAmount: 10.0,
      account: "0x8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D",
    },
    {
      date: "2025-07-20T11:55:10Z",
      type: "buy",
      tokenAmount: 60.0,
      seiAmount: 120.0,
      account: "0x9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E",
    },
    {
      date: "2025-07-20T12:02:00Z",
      type: "sell",
      tokenAmount: 15.0,
      seiAmount: 30.0,
      account: "0xA0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9",
    },
    {
      date: "2025-07-20T12:09:30Z",
      type: "buy",
      tokenAmount: 250.0,
      seiAmount: 500.0,
      account: "0xB0C1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A7B8C9",
    },
    {
      date: "2025-07-20T12:15:45Z",
      type: "sell",
      tokenAmount: 40.0,
      seiAmount: 80.0,
      account: "0xC1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A7B8C9D0",
    },
  ]);

  // Handle loading state
  if (isLoading || contractLoading) {
    return (
      <div className="w-full max-w-screen px-6 pt-4 pb-12 flex flex-col">
        <div className="w-full max-w-lg mx-auto">
          <div className="animate-pulse">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-24 bg-muted rounded-full"></div>
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded w-32"></div>
                <div className="h-4 bg-muted rounded w-48"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || contractError) {
    return (
      <div className="w-full max-w-screen px-6 pt-4 pb-12 flex flex-col">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="mb-4">
            <Bot className="size-16 text-muted-foreground mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {error ? "Agent Not Found" : "Contract Error"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {error
              ? "The agent you're looking for doesn't exist or has been removed."
              : "There was an error loading contract data. Please check your connection and try again."}
          </p>
          {contractError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
              <p className="text-sm text-red-600 dark:text-red-400">
                Contract Error: {contractError.message}
              </p>
            </div>
          )}
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const agent = agentData?.agent;

  // Check if token address is valid
  const isTokenAddressValid =
    agent?.tokenAddress &&
    agent.tokenAddress !== "0x0000000000000000000000000000000000000000";

  // Fallback data structure if agent is not available
  const token = {
    name: agent?.name || "Unknown Agent",
    image: agent?.logoUrl || "https://example.com/default-logo.png",
    contractAddress:
      agent?.tokenAddress || "0x0000000000000000000000000000000000000000",
    walletAddress: agent?.walletAddress,
    devAddress:
      agent?.creator?.walletAddress ||
      "0x0000000000000000000000000000000000000000",
    createdBy:
      agent?.creator?.walletAddress ||
      "0x0000000000000000000000000000000000000000",
    creationDate: agent?.createdAt,
    tokenSymbol: agent?.tokenSymbol,
    curveProgress: {
      current: contractData?.marketStats?.ethCollected
        ? parseFloat(contractData.marketStats.ethCollected)
        : 0, // Use actual SEI value
      target: contractData?.maxEthCap ? parseFloat(contractData.maxEthCap) : 0, // Use actual SEI value
    },
    maxEthCap: contractData?.maxEthCap || "0",
    website: agent?.websiteUrl || "#",
    supply: agent?.totalSupply,
    tradeFees:
      contractData?.marketConfig?.taxPercent ||
      agent?.taxSettings?.totalTaxPercentage ||
      0,
    currentPrice: contractData?.currentPrice || "0",
    marketStats: contractData?.marketStats,
    tradeStats: contractData?.tradeStats,
    isRegistered: isTokenRegistered,
    isTradingEnabled: isTradingEnabled,
    isAddressValid: isTokenAddressValid,
  };

  return (
    <div className="w-full max-w-screen px-6 pt-4 pb-12 flex flex-col">
      <div className="w-full max-w-lg mx-auto">
        <div className="w-full flex items-center gap-3">
          <Avatar className="size-24 border-3 border-accent">
            <AvatarImage src={token.image} />
            <AvatarFallback>
              {token.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col items-start gap-2 mb-1">
              <h1 className="text-xl font-bold uppercase">{token.name}</h1>
              <div className="flex items-center gap-2">
                {agent?.status && (
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.status === "ACTIVE"
                        ? "bg-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {agent.status === "ACTIVE"
                      ? "Confirmed"
                      : "Pending Confirmation"}
                  </div>
                )}
                {!isTradingEnabled &&
                  connectedAddress &&
                  agent?.creator?.walletAddress &&
                  connectedAddress.toLowerCase() ===
                    agent.creator.walletAddress.toLowerCase() && (
                    <button
                      onClick={handleOpenTrading}
                      disabled={isWritePending || !token.isAddressValid}
                      className="px-3 py-1 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-1 text-xs font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="size-3" />
                      {isWritePending
                        ? "Registering..."
                        : !token.isAddressValid
                          ? "No Token Address"
                          : "Open Trading"}
                    </button>
                  )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p>
                Created by: <span>{ellipsizeAddress(token.createdBy)}</span>
              </p>
              <button
                className="cursor-pointer"
                onClick={() => {
                  writeToClipboard(token.createdBy);
                  toast.success("Creator address copied to clipboard");
                }}
              >
                <Copy className="size-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col items-start gap-3">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="w-auto px-4 py-3 bg-primary-foreground rounded-lg border flex items-center gap-2">
              <p>
                Contract Address:{" "}
                <span>{ellipsizeAddress(token.contractAddress, 4, 4)}</span>
              </p>
              <button
                className="cursor-pointer"
                onClick={() => {
                  writeToClipboard(token.contractAddress);
                  toast.success("Contract address copied to clipboard");
                }}
              >
                <Copy className="size-5" />
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-3 bg-primary-foreground rounded-lg border flex items-center justify-between gap-1">
              <p>
                Time Created: <span>{formatISODate(token.creationDate)}</span>
              </p>
            </div>
            {token.website && token.website !== "#" && (
              <a
                href={token.website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 bg-primary-foreground border rounded-lg hover:bg-primary-foreground/80 transition-colors"
              >
                <Globe />
              </a>
            )}
          </div>
          {token.isRegistered && (
            <div className="w-full px-4 py-3 bg-primary-foreground rounded-lg border flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Trading Status:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    token.isTradingEnabled
                      ? "bg-green-500/20 text-green-600 dark:text-green-400"
                      : "bg-red-500/20 text-red-600 dark:text-red-400"
                  }`}
                >
                  {token.isTradingEnabled ? "Active" : "Paused"}
                </span>
              </div>
              {token.currentPrice && (
                <div className="flex items-center justify-between">
                  <span>Current Price:</span>
                  <span className="text-accent font-medium">
                    {parseFloat(token.currentPrice).toFixed(10)} SEI
                  </span>
                </div>
              )}
              {token.marketStats && (
                <div className="flex items-center justify-between">
                  <span>Total Volume:</span>
                  <span className="text-accent font-medium">
                    {parseFloat(token.marketStats.ethCollected).toFixed(10)} SEI
                  </span>
                </div>
              )}
              {/* Curve Progress */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="w-full flex justify-between mb-2">
                  <span>Curve Progress:</span>
                  <span className="text-accent">
                    {(
                      (100 * token.curveProgress.current) /
                      token.curveProgress.target
                    ).toFixed(2)}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (100 * token.curveProgress.current) /
                    token.curveProgress.target
                  }
                  indicatorClassName="bg-green-500 dark:bg-green-600"
                />
                <div className="w-full flex justify-between mt-2 text-sm">
                  <span>
                    Current:{" "}
                    {parseFloat(token.marketStats?.ethCollected || "0").toFixed(
                      10,
                    )}{" "}
                    SEI
                  </span>
                  <span>
                    Target: {parseFloat(token.maxEthCap || "0").toFixed(0)} SEI
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <Tabs defaultValue="about" className="mt-5">
          <TabsList className="w-full py-5">
            <TabsTrigger
              value="about"
              className="flex items-center gap-2 cursor-pointer data-[state=active]:text-accent dark:data-[state=active]:text-accent"
            >
              <Info className="size-5" />
              <h2 className="text-base font-semibold">About</h2>
            </TabsTrigger>
            <TabsTrigger
              value="trade"
              disabled={!isTradingEnabled}
              className={`flex items-center gap-2 cursor-pointer data-[state=active]:text-accent dark:data-[state=active]:text-accent ${
                !isTradingEnabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <BadgeDollarSign className="size-5" />
              <h2 className="text-base font-semibold">Buy/Sell</h2>
            </TabsTrigger>
            <TabsTrigger
              value="holders"
              disabled={!isTradingEnabled}
              className={`flex items-center gap-2 cursor-pointer data-[state=active]:text-accent dark:data-[state=active]:text-accent ${
                !isTradingEnabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <UserRound className="size-5" />
              <h2 className="text-base font-semibold">Holders</h2>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="about" asChild>
            <AgentAboutTab
              token={token}
              agent={agent}
              isTradingEnabled={isTradingEnabled}
              chartData={chartData}
            />
          </TabsContent>
          <TabsContent value="trade" asChild>
            <AgentTradeTab
              token={token}
              agent={agent}
              activeTradeTab={activeTradeTab}
              setActiveTradeTab={setActiveTradeTab}
              handleBuyToken={handleBuyToken}
              handleSellToken={handleSellToken}
              buyTokenStatus={buyTokenStatus}
              sellTokenStatus={sellTokenStatus}
              connectedAddress={connectedAddress}
            />
          </TabsContent>
          <TabsContent value="holders" asChild>
            <AgentHoldersTab
              tokenAddress={token?.contractAddress}
              isTradingEnabled={isTradingEnabled}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Agent;
