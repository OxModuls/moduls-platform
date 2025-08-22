import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import AgentAboutTab from "@/components/agent-about-tab";
import AgentTradeTab from "@/components/agent-trade-tab";
import AgentHoldersTab from "@/components/agent-holders-tab";
import CountdownTimer from "@/components/countdown-timer";
import TradingMetrics from "@/components/trading-metrics";
import TradingHistory from "@/components/trading-history";
import {
  BadgeDollarSign,
  Bot,
  Copy,
  Globe,
  Info,
  UserRound,
  Activity,
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
import ChatDock from "@/components/chat-dock";

import TradingChart from "@/components/trading-chart";

const Agent = () => {
  const { uniqueId } = useParams();
  const navigate = useNavigate();
  const { address: connectedAddress } = useAccount();
  const [agentChatOpen, setAgentChatOpen] = useState(false);

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
      <div className="flex w-full max-w-screen flex-col px-6 pt-4 pb-12">
        <div className="mx-auto w-full max-w-lg">
          <div className="animate-pulse">
            <div className="mb-5 flex items-center gap-3">
              <div className="size-24 rounded-full bg-muted"></div>
              <div className="space-y-2">
                <div className="h-6 w-32 rounded bg-muted"></div>
                <div className="h-4 w-48 rounded bg-muted"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-12 rounded bg-muted"></div>
              <div className="h-12 rounded bg-muted"></div>
              <div className="h-12 rounded bg-muted"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || contractError) {
    return (
      <div className="flex w-full max-w-screen flex-col px-6 pt-4 pb-12">
        <div className="mx-auto w-full max-w-lg text-center">
          <div className="mb-4">
            <Bot className="mx-auto size-16 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">
            {error ? "Agent Not Found" : "Contract Error"}
          </h2>
          <p className="mb-4 text-muted-foreground">
            {error
              ? "The agent you're looking for doesn't exist or has been removed."
              : "There was an error loading contract data. Please check your connection and try again."}
          </p>
          {contractError && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-left">
              <p className="text-sm text-red-600 dark:text-red-400">
                Contract Error: {contractError.message}
              </p>
            </div>
          )}
          <button
            onClick={() => navigate("/")}
            className="rounded-lg bg-accent px-4 py-2 text-accent-foreground transition-colors hover:bg-accent/90"
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
    <div className="flex w-full max-w-screen flex-col px-6 pt-4 lg:mx-auto lg:max-w-[84rem]">
      <div className="grid-cols-[auto_24rem] gap-4 lg:grid xl:grid-cols-[auto_28rem]">
        <div className="">
          <div className="flex w-full items-center gap-3">
            <Avatar className="size-16 border-3 border-accent md:size-20">
              <AvatarImage src={token.image} />
              <AvatarFallback>
                {token.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-bold uppercase">{token.name}</h1>
                  <span className="rounded-md bg-accent/20 px-2 py-1 text-sm text-accent">
                    {agent.tags[0]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {agent?.status && (
                    <div
                      hidden
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
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
                    <div className="rounded-lg bg-yellow-500/20 px-3 py-1 text-xs font-medium whitespace-nowrap text-yellow-600 dark:text-yellow-400">
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
                  Created by:{" "}
                  <span>{ellipsizeAddress(token.createdBy, 4, 4)}</span>
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
          <div className="mt-5 flex flex-col items-start gap-3 xl:flex-row xl:items-center">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex w-auto items-center gap-2 rounded-lg border bg-primary-foreground px-4 py-3">
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
                <div className="flex items-center justify-between gap-1 rounded-lg border bg-primary-foreground px-4 py-3">
                  <p>
                    Time Created:{" "}
                    <span>{formatISODate(token.creationDate)}</span>
                  </p>
                </div>
                {token.website && token.website !== "#" && (
                  <a
                    href={token.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border bg-primary-foreground px-4 py-3 transition-colors hover:bg-primary-foreground/80"
                  >
                    <Globe />
                  </a>
                )}
              </div>
            </div>
            {token.isRegistered && (
              <div className="flex w-full flex-col gap-2 rounded-lg border bg-primary-foreground px-4 py-3 lg:hidden">
                <div hidden>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Trading Status:</span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
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
                      <span className="font-medium text-accent">
                        {parseFloat(token.currentPrice).toFixed(10)} SEI
                      </span>
                    </div>
                  )}
                  {token.marketStats && (
                    <div className="flex items-center justify-between">
                      <span>Total Volume:</span>
                      <span className="font-medium text-accent">
                        {parseFloat(token.marketStats.ethCollected).toFixed(10)}{" "}
                        SEI
                      </span>
                    </div>
                  )}
                </div>
                {/* Curve Progress */}
                <div className="">
                  <div className="mb-2 flex w-full justify-between">
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
                    className="[&>div]:dark:bg-green-600"
                  />
                  <div className="mt-2 flex w-full justify-between text-sm">
                    <span>
                      Current:{" "}
                      {parseFloat(
                        token.marketStats?.ethCollected || "0",
                      ).toFixed(10)}{" "}
                      SEI
                    </span>
                    <span>
                      Target: {parseFloat(token.maxEthCap || "0").toFixed(0)}{" "}
                      SEI
                    </span>
                  </div>
                </div>
              </div>
            )}
            <button
              hidden={token.curveProgress.current < token.curveProgress.target}
              className="bg-button-gradient mr-0 ml-auto w-fit cursor-pointer rounded-xl px-3 py-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/25 md:mr-auto md:ml-0"
              onClick={() => setAgentChatOpen(true)}
            >
              Chat with agent
            </button>
          </div>
          <div className="my-8 hidden lg:block">
            <div className="">
              <TradingChart
                tokenAddress={token?.contractAddress}
                height={400}
                totalSupply={token?.supply}
              />
            </div>
          </div>
          <Tabs defaultValue="about" className="mt-5">
            <TabsList
              className="scrollbar-hide w-full flex-nowrap justify-start overflow-x-auto md:w-fit md:justify-center [&>*]:h-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <TabsTrigger
                value="about"
                className="flex min-w-fit flex-shrink-0 cursor-pointer items-center gap-2 data-[state=active]:text-accent dark:data-[state=active]:text-accent"
              >
                <Info className="size-5" />
                <h2 className="text-base font-semibold">About</h2>
              </TabsTrigger>
              <TabsTrigger
                value="trade"
                disabled={!isTradingEnabled}
                className={`flex min-w-fit flex-shrink-0 cursor-pointer items-center gap-2 data-[state=active]:text-accent lg:hidden dark:data-[state=active]:text-accent ${
                  !isTradingEnabled ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <BadgeDollarSign className="size-5" />
                <h2 className="text-base font-semibold">Buy/Sell</h2>
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                disabled={!isTradingEnabled}
                className={`flex min-w-fit flex-shrink-0 cursor-pointer items-center gap-2 data-[state=active]:text-accent dark:data-[state=active]:text-accent ${
                  !isTradingEnabled ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <Activity className="size-5" />
                <h2 className="text-base font-semibold">Activity</h2>
              </TabsTrigger>
              <TabsTrigger
                value="holders"
                disabled={!isTradingEnabled}
                className={`flex min-w-fit flex-shrink-0 cursor-pointer items-center gap-2 data-[state=active]:text-accent dark:data-[state=active]:text-accent ${
                  !isTradingEnabled ? "cursor-not-allowed opacity-50" : ""
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
            <TabsContent value="activity" asChild>
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
        <div className="relative hidden lg:block">
          <div className="sticky top-8 rounded-lg px-4 pb-4">
            {token.isRegistered && (
              <div className="mt-4 hidden w-full flex-col gap-2 rounded-lg border bg-primary-foreground px-4 py-3 lg:flex">
                <div hidden>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Trading Status:</span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
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
                      <span className="font-medium text-accent">
                        {parseFloat(token.currentPrice).toFixed(10)} SEI
                      </span>
                    </div>
                  )}
                  {token.marketStats && (
                    <div className="flex items-center justify-between">
                      <span>Total Volume:</span>
                      <span className="font-medium text-accent">
                        {parseFloat(token.marketStats.ethCollected).toFixed(10)}{" "}
                        SEI
                      </span>
                    </div>
                  )}
                </div>
                {/* Curve Progress */}
                <div className="">
                  <div className="mb-2 flex w-full justify-between">
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
                    className="[&>div]:dark:bg-green-600"
                  />
                  <div className="mt-2 flex w-full justify-between text-sm">
                    <span>
                      Current:{" "}
                      {parseFloat(
                        token.marketStats?.ethCollected || "0",
                      ).toFixed(10)}{" "}
                      SEI
                    </span>
                    <span>
                      Target: {parseFloat(token.maxEthCap || "0").toFixed(0)}{" "}
                      SEI
                    </span>
                  </div>
                </div>
              </div>
            )}
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
          </div>
        </div>
      </div>

      {agent && (
        <ChatDock
          agent={agent}
          openMini={agentChatOpen}
          onOpenMiniChange={setAgentChatOpen}
        />
      )}
    </div>
  );
};

export default Agent;
