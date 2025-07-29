import CandlestickChart from "@/components/candlestick-chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeftRight,
  ArrowUpDown,
  BadgeDollarSign,
  Banknote,
  Bot,
  Calendar,
  ChartCandlestick,
  CircleQuestionMark,
  Copy,
  Database,
  Globe,
  Info,
  Link,
  SquareArrowOutUpRight,
  UserRound,
  Wallet,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  ellipsizeAddress,
  formatISODate,
  getHumanReadableTimeAgo,
  writeToClipboard,
} from "@/lib/utils";
import { Input } from "@/components/ui/input";
import SeiIcon from "@/components/sei-icon";
import { useParams, useNavigate } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFetcher } from "@/lib/fetcher";
import config from "@/shared/config";
import { toast } from "sonner";

const Agent = () => {
  const { uniqueId } = useParams();
  const navigate = useNavigate();
  
  // Fetch agent data
  const { data: agentData, isLoading, error } = useQuery({
    queryKey: ['agent', uniqueId],
    queryFn: () => createFetcher({
      url: `${config.endpoints.agent}/${uniqueId}`,
      method: 'GET',
    })(),
    enabled: !!uniqueId,
    refetchInterval: 10000,
    placeholderData: keepPreviousData,
  });

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
  const [holders, _setHolders] = useState([
    {
      address: "0x742d35Cc6634C05329C3aAbb04cFeB53",
      percentage: 15.75,
    },
    {
      address: "0xAb5801a7D398351b8bE11C439e05C5B3259AeC9B",
      percentage: 10.2,
    },
    {
      address: "0x5A0b54D5dc17e0AadC383d2db43B0a0d3E0B2c0e",
      percentage: 8.5,
    },
    {
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      percentage: 7.0,
    },
    {
      address: "0x82fF41e3D4EbA3C1c5B7F8eB4C5A03C12b1875eA",
      percentage: 5.12,
    },
    {
      address: "0x1dBB943b1D2C9E4C2A3C4B5E6D7E8F9A0B1C2D3E",
      percentage: 4.88,
    },
    {
      address: "0x0A9F9B0000000000000000000000000000000000",
      percentage: 3.9,
    },
    {
      address: "0x2eCa6d4D3B000000000000000000000000000000",
      percentage: 3.5,
    },
    {
      address: "0x3f5CE5F1EDf14d80D1bE4A99979b977755555555",
      percentage: 2.1,
    },
    {
      address: "0x4feC95B5B3000000000000000000000000000000",
      percentage: 1.8,
    },
    {
      address: "0x5E6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D",
      percentage: 1.5,
    },
    {
      address: "0x6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B",
      percentage: 1.2,
    },
    {
      address: "0x7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C",
      percentage: 0.9,
    },
    {
      address: "0x8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D",
      percentage: 0.75,
    },
    {
      address: "0x9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E",
      percentage: 0.5,
    },
    {
      address: "0xA0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9",
      percentage: 0.25,
    },
    {
      address: "0xB0C1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A7B8C9",
      percentage: 0.1,
    },
    {
      address: "0xC1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A7B8C9D0",
      percentage: 0.05,
    },
    {
      address: "0xD2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A7B8C9D0E1",
      percentage: 0.01,
    },
  ]);
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
  if (isLoading && !agentData) {
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
  if (error) {
    return (
      <div className="w-full max-w-screen px-6 pt-4 pb-12 flex flex-col">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="mb-4">
            <Bot className="size-16 text-muted-foreground mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Agent Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The agent you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const agent = agentData?.agent;

  // Fallback data structure if agent is not available
  const token = {
    name: agent?.name || "Unknown Agent",
    image: agent?.logoUrl || "https://example.com/default-logo.png",
    contractAddress: agent?.tokenAddress || "0x0000000000000000000000000000000000000000",
    walletAddress: agent?.walletAddress,
    devAddress: agent?.creator?.walletAddress || "0x0000000000000000000000000000000000000000",
    createdBy: agent?.creator?.walletAddress || "0x0000000000000000000000000000000000000000",
    creationDate: agent?.createdAt,
    tokenSymbol: agent?.tokenSymbol ,
    curveProgress: {
      current: 25000,
      target: 100000,
    },
    website: agent?.websiteUrl || "#",
    supply: agent?.totalSupply,
    tradeFees: agent?.taxSettings?.totalTaxPercentage || 0,
  };

  

  return (
    <div className="w-full max-w-screen px-6 pt-4 pb-12 flex flex-col">
      <div className="w-full max-w-lg mx-auto">
        <div className="w-full flex items-center gap-3">
          <Avatar className="size-24 border-3 border-accent">
            <AvatarImage src={token.image} />
            <AvatarFallback>{token.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold uppercase">{token.name}</h1>
              {agent?.status && (
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  agent.status === 'ACTIVE' 
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                }`}>
                  {agent.status === 'ACTIVE' ? 'Confirmed' : 'Pending Confirmation'}
                </div>
              )}
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
          <div className="w-full px-4 py-3 bg-primary-foreground rounded-lg border flex flex-col justify-between gap-3">
            <div className="w-full flex justify-between">
              <span>Curve Progress:</span>
              <span className="text-accent">
                {((100 * token.curveProgress.current) / token.curveProgress.target).toFixed(2)}%
              </span>
            </div>
            <Progress
              value={(100 * token.curveProgress.current) / token.curveProgress.target}
              indicatorClassName="bg-green-500 dark:bg-green-600"
            />
            <div className="w-full flex justify-between">
              <span>
                Current: ${token.curveProgress.current.toLocaleString()}
              </span>
              <span>
                Target: ${token.curveProgress.target.toLocaleString()}
              </span>
            </div>
          </div>
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
              className="flex items-center gap-2 cursor-pointer data-[state=active]:text-accent dark:data-[state=active]:text-accent"
            >
              <BadgeDollarSign className="size-5" />
              <h2 className="text-base font-semibold">Buy/Sell</h2>
            </TabsTrigger>
            <TabsTrigger
              value="holders"
              className="flex items-center gap-2 cursor-pointer data-[state=active]:text-accent dark:data-[state=active]:text-accent"
            >
              <UserRound className="size-5" />
              <h2 className="text-base font-semibold">Holders</h2>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="about" asChild>
            <div className="mt-3">
              <div className="">
                <div className="ml-2 flex items-center gap-2">
                  <ChartCandlestick className="size-4" />
                  <h2 className="text-lg font-semibold">Chart</h2>
                </div>
                <div className="mt-2 px-2 py-4 bg-primary-foreground rounded-lg">
                  <CandlestickChart data={chartData} />
                </div>
              </div>
              <div className="mt-5">
                <div className="ml-2 flex items-center gap-2">
                  <Bot className="size-4" />
                  <h2 className="text-lg font-semibold">Agent Description</h2>
                </div>
                <div className="mt-2 px-2">
                  {agent?.description || "No description available for this agent."}
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3">
                <div className="ml-2 flex items-center gap-2">
                  <Info className="size-4" />
                  <h2 className="text-lg font-semibold">Info</h2>
                </div>
                <div className="px-4 py-3 bg-primary-foreground rounded-lg border flex justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="size-5" />
                    <span className="font-medium">Supply</span>
                  </div>
                  <span>{token.supply.toLocaleString()}</span>
                </div>
                <div className="px-4 py-3 bg-primary-foreground rounded-lg border flex justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-5" />
                    <span className="font-medium">Created</span>
                  </div>
                  <span>{formatISODate(token.creationDate)}</span>
                </div>
                <div className="px-4 py-3 bg-primary-foreground rounded-lg border flex justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="size-5" />
                    <span className="font-medium">Trade fees</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{token.tradeFees}%</span>
                    <CircleQuestionMark className="size-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="px-4 py-3 bg-primary-foreground rounded-lg border flex justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="size-5" />
                    <span className="font-medium">Contract Address:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{ellipsizeAddress(token.contractAddress)}</span>
                    <button
                      className="cursor-pointer"
                      onClick={() => {
                        writeToClipboard(token.contractAddress);
                        toast.success("Contract address copied to clipboard");
                      }}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 bg-primary-foreground rounded-lg border flex justify-between">
                  <div className="flex items-center gap-2">
                    <UserRound className="size-5" />
                    <span className="font-medium">Developer Address:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{ellipsizeAddress(token.devAddress)}</span>
                    <button
                      className="cursor-pointer"
                      onClick={() => {
                        writeToClipboard(token.devAddress);
                        toast.success("Developer address copied to clipboard");
                      }}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>
                {agent?.tags && agent.tags.length > 0 && (
                  <div className="px-4 py-3 bg-primary-foreground rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Tags:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-accent/20 text-accent rounded-md text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="trade" asChild>
            <div className="w-full">
              <div className="pt-4">
                <div className="w-full flex gap-2 bg-primary-foreground">
                  <button
                    data-active={activeTradeTab === "buy"}
                    className="py-2 flex-1 border-2 data-[active=true]:border-green-600 data-[active=true]:text-green-600 rounded-lg font-semibold cursor-pointer"
                    onClick={() => setActiveTradeTab("buy")}
                  >
                    Buy
                  </button>
                  <button
                    data-active={activeTradeTab === "sell"}
                    className="py-2 flex-1 border-2 data-[active=true]:border-red-600 data-[active=true]:text-red-600 rounded-lg font-semibold cursor-pointer"
                    onClick={() => setActiveTradeTab("sell")}
                  >
                    Sell
                  </button>
                </div>
                <div className="mt-3 px-2 py-4 bg-neutral-850 border rounded-lg flex flex-col gap-4">
                  <div className="w-full flex flex-col gap-1">
                    <label
                      htmlFor="slippage"
                      className="ml-1 text-sm font-semibold"
                    >
                      Slippage (%)
                    </label>
                    <Input
                      type="number"
                      id="slippage"
                      className="py-2"
                      defaultValue={5}
                    />
                  </div>
                  <div className="w-full flex flex-col gap-1">
                    <label
                      htmlFor="amount"
                      className="ml-1 text-sm font-semibold"
                    >
                      Amount
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        id="amount"
                        className="py-2 pr-28"
                        defaultValue={0}
                      />
                      <div className="absolute top-[50%] translate-y-[-50%] right-4 flex items-center gap-2 text-neutral-400">
                        <div className="flex items-center gap-2">
                          <span className="uppercase">sei</span>
                          <SeiIcon className="size-4" />
                        </div>
                        <div className="h-4 w-0.5 bg-neutral-400" />
                        <button className="cursor-pointer">
                          <ArrowLeftRight className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="px-1 w-full flex justify-between text-xs">
                      <span className="text-red-500">Insufficient balance</span>
                      <div className="flex items-center gap-1">
                        <Wallet className="size-3" />
                        <span className="">0 SEI</span>
                        <button className="text-green-500">MAX</button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <button
                      className={`py-2 w-full capitalize rounded-lg font-semibold cursor-pointer ${activeTradeTab === "buy" ? "bg-green-600" : "bg-red-600"}`}
                    >
                      {activeTradeTab}
                    </button>
                    <div className="mt-1.25 text-neutral-400 text-xs flex items-center justify-center">
                      <p>
                        You will receive <span>1,000,000</span>{" "}
                        {agent?.tokenSymbol?.toUpperCase() || token.name.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* transactions */}
              <div className="mt-5 w-full">
                <div className="ml-2 flex items-center gap-2">
                  <ArrowUpDown className="size-4" />
                  <h2 className="text-lg font-semibold">Transactions</h2>
                </div>
                <div className="mt-3 px-3 py-2 bg-primary-foreground border rounded-lg overflow-x-auto">
                  <table className="">
                    <thead>
                      <tr className="[&>th]:font-semibold [&>th]:px-4 border-b whitespace-nowrap">
                        <th scope="col">Time</th>
                        <th scope="col">Type</th>
                        <th scope="col">SEI</th>
                        <th scope="col" className="capitalize">
                          {agent?.tokenSymbol?.toUpperCase() || token.name}
                        </th>
                        <th>Account</th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr:not(:last-child)]:border-b">
                      {transactions.map((transaction, idx) => (
                        <tr
                          key={idx}
                          className="[&>td]:px-4 [&>td]:py-0.5 [&>td]:whitespace-nowrap"
                        >
                          <td>{getHumanReadableTimeAgo(transaction.date)}</td>
                          <td className="">
                            <div
                              className={`px-2.5 py-1 rounded-xl capitalize text-sm font-medium ${transaction.type === "sell" ? "bg-red-600" : "bg-green-600"}`}
                            >
                              {transaction.type}
                            </div>
                          </td>
                          <td className="font-mono text-center">
                            {transaction.seiAmount.toLocaleString()}
                          </td>
                          <td className="font-mono text-center">
                            {transaction.tokenAmount.toLocaleString()}
                          </td>
                          <td className="flex items-center gap-2 font-mono">
                            <span>
                              {ellipsizeAddress(transaction.account, 4, 4)}
                            </span>
                            <a
                              href={`https://seitrace.com/address/${transaction.account}`}
                              target="_blank"
                            >
                              <SquareArrowOutUpRight className="size-4" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="holders" asChild>
            <div>
              <p className="mt-3 ml-2 font-semibold">Top Token Holders</p>
              <div className="mt-3 px-3 py-2 bg-primary-foreground border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="[&>th]:font-semibold border-b">
                      <th scope="col">#</th>
                      <th scope="col">Holder</th>
                      <th scope="col">%</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono [&>tr:not(:last-child)]:border-b">
                    {holders.map((holder, idx) => (
                      <tr key={idx} className="[&>th,td]:py-0.5">
                        <th scope="row" className="font-semibold">
                          {idx + 1}
                        </th>
                        <td className="flex justify-center items-center gap-2">
                          <span className="text-accent">
                            {ellipsizeAddress(holder.address)}
                          </span>
                          <button
                            className="cursor-pointer"
                            onClick={() => writeToClipboard(holder.address)}
                          >
                            <Copy className="size-4" />
                          </button>
                        </td>
                        <td className="text-center">{holder.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Agent; 