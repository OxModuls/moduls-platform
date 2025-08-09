import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import AgentAboutTab from "@/components/agent-about-tab";
import AgentTradeTab from "@/components/agent-trade-tab";
import AgentHoldersTab from "@/components/agent-holders-tab";
import CountdownTimer from "@/components/countdown-timer";
import TradingChart from "@/components/trading-chart";
import TradingMetrics from "@/components/trading-metrics";
import TradingHistory from "@/components/trading-history";
import {
  BadgeDollarSign,
  Bot,
  Copy,
  Info,
  UserRound,
  TrendingUp,
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
    timeUntilTrading,
    buyTokenStatus,
    sellTokenStatus,
    buyToken,
    sellToken,
  } = useModulsSalesManager(
    agentData?.agent?.tokenAddress &&
      agentData.agent.tokenAddress !==
        "0x0000000000000000000000000000000000000000"
      ? agentData.agent.tokenAddress
      : undefined,
  );

  // Calculate target timestamp for countdown
  const targetTimestamp =
    timeUntilTrading > 0 ? Math.floor(Date.now() / 1000) + timeUntilTrading : 0;

  // Handle countdown completion
  const handleCountdownComplete = () => {
    // Refetch contract data when countdown completes
    window.location.reload();
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

  // Removed hardcoded holders data - now using real data from API
  const [activeTradeTab, setActiveTradeTab] = useState("buy");

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
    status: agent?.status,
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
                {!isTradingEnabled && timeUntilTrading > 0 && (
                  <div className="px-3 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg text-xs font-medium whitespace-nowrap">
                    Trading opens in:{" "}
                    <CountdownTimer
                      targetTimestamp={targetTimestamp}
                      onComplete={handleCountdownComplete}
                    />
                  </div>
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
                      : timeUntilTrading > 0
                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                  }`}
                >
                  {token.isTradingEnabled ? (
                    "Active"
                  ) : timeUntilTrading > 0 ? (
                    <>
                      Opens in{" "}
                      <CountdownTimer
                        targetTimestamp={targetTimestamp}
                        onComplete={handleCountdownComplete}
                      />
                    </>
                  ) : (
                    "Scheduled"
                  )}
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
          <TabsList
            className="w-full py-5 overflow-x-auto scrollbar-hide flex-nowrap justify-start md:justify-center"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <TabsTrigger
              value="about"
              className="flex items-center gap-2 cursor-pointer data-[state=active]:text-accent dark:data-[state=active]:text-accent flex-shrink-0 min-w-fit"
            >
              <Info className="size-5" />
              <h2 className="text-base font-semibold">About</h2>
            </TabsTrigger>
            <TabsTrigger
              value="trade"
              disabled={!isTradingEnabled}
              className={`flex items-center gap-2 cursor-pointer data-[state=active]:text-accent dark:data-[state=active]:text-accent flex-shrink-0 min-w-fit ${
                !isTradingEnabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <BadgeDollarSign className="size-5" />
              <h2 className="text-base font-semibold">Buy/Sell</h2>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              disabled={!isTradingEnabled}
              className={`flex items-center gap-2 cursor-pointer data-[state=active]:text-accent dark:data-[state=active]:text-accent flex-shrink-0 min-w-fit ${
                !isTradingEnabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <TrendingUp className="size-5" />
              <h2 className="text-base font-semibold">Analytics</h2>
            </TabsTrigger>
            <TabsTrigger
              value="holders"
              disabled={!isTradingEnabled}
              className={`flex items-center gap-2 cursor-pointer data-[state=active]:text-accent dark:data-[state=active]:text-accent flex-shrink-0 min-w-fit ${
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
              timeUntilTrading={timeUntilTrading}
              targetTimestamp={targetTimestamp}
              onCountdownComplete={handleCountdownComplete}
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
          <TabsContent value="analytics" asChild>
            <div className="space-y-6">
              <TradingMetrics
                tokenAddress={token?.contractAddress}
                totalSupply={token?.supply}
                agentData={agent}
              />
              <TradingHistory tokenAddress={token?.contractAddress} />
            </div>
          </TabsContent>
          <TabsContent value="holders" asChild>
            <AgentHoldersTab
              tokenAddress={token?.contractAddress}
              isTradingEnabled={isTradingEnabled}
              timeUntilTrading={timeUntilTrading}
              targetTimestamp={targetTimestamp}
              onCountdownComplete={handleCountdownComplete}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Agent;
