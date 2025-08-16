import { ArrowDownWideNarrow, Bot, Info, RefreshCw } from "lucide-react";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { createFetcher } from "../lib/fetcher";
import config from "../shared/config";
import ordinal from "ordinal";
import { useWalletModalStore } from "../shared/store";
import { Link, useNavigate } from "react-router";
import { useAccount } from "wagmi";
import { dummyAgents } from "../shared/dummy-data";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ellipsizeAddress } from "../lib/utils";
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useState } from "react";

const Home = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  const [platformStatResult] = useQueries({
    queries: [
      {
        queryKey: [config.endpoints.getStats],
        queryFn: createFetcher({
          url: config.endpoints.getStats,
          method: "GET",
        }),
        placeholderData: keepPreviousData,
        refetchInterval: 1000 * 60,
      },
    ],
  });

  const { data: platformStats, isPending: isPlatformStatsPending } =
    platformStatResult;

  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState("Creation Time");

  return (
    <div className="flex flex-col items-center px-6 pt-4">
      <div className="mx-auto max-w-lg">
        <div className="shadow-l flex w-full flex-col items-center rounded-2xl border px-6 py-8">
          <h1 className="text-center text-2xl font-bold text-accent capitalize">
            Deploy Modular Agents
          </h1>
          <p className="mt-2 text-center">
            Deploy agents instantly with modular on-chain logic. No coding
            required.
          </p>
          <button
            onClick={() => {
              if (isConnected && address) {
                navigate("/create");
              } else {
                useWalletModalStore.getState().openWalletModal();
              }
            }}
            className="bg-button-gradient mt-3 flex w-fit cursor-pointer justify-center rounded-xl px-3 py-2 transition-all duration-500 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="">Launch Agent</span>
            </div>
          </button>
        </div>

        {/* agents */}
        <div className="shadow-l mt-8">
          <div className="flex w-full gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filters" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "GameFi NPC",
                  "DeFAI",
                  "Meme Token",
                  "Oracle Feed",
                  "Custom Logic",
                ].map((x, idx) => (
                  <SelectItem key={idx} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              defaultValue="Creation Time"
              value={sortKey}
              onValueChange={setSortKey}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Creation Time",
                  "Trading Volume",
                  "Progress",
                  "Last Trade",
                ].map((x, idx) => (
                  <SelectItem key={idx} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button className="cursor-pointer rounded-lg border bg-input/50 p-2">
              <ArrowDownWideNarrow className="size-5" />
            </button>
            <button className="cursor-pointer rounded-lg border bg-input/50 p-2">
              <RefreshCw className="size-5" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-x-1 gap-y-2">
            {dummyAgents.map((agent, idx) => (
              <Link
                key={idx}
                to={`/agents/${agent.uniqueId}`}
                className="flex gap-2 rounded-2xl border p-2 md:p-4"
              >
                <Avatar className="size-16 shrink-0 border-2 border-accent">
                  <AvatarImage src={agent.logoUrl} />
                  <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex grow flex-col items-start">
                  <div className="flex w-full items-center gap-2">
                    <span className="text-sm">{agent.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {agent.tokenSymbol}
                    </span>
                    <span className="grow-0 rounded-md bg-accent/20 px-1 py-0.5 text-xs text-accent">
                      {agent.tags[0]}
                    </span>
                  </div>
                  <span className="w-48 overflow-hidden text-xs text-muted-foreground overflow-ellipsis whitespace-nowrap">
                    {agent.description}
                  </span>
                  <div className="mt-1 flex w-full justify-between text-sm">
                    <span>Created by:</span>
                    <span>
                      {ellipsizeAddress(agent.creator.walletAddress, 4, 4)}
                    </span>
                  </div>
                  <div className="mt-1 flex w-full justify-between text-sm">
                    <span>Market Cap:</span>
                    <span>10K SEI</span>
                  </div>
                  <div className="mt-1 flex w-full items-center gap-1">
                    <Progress
                      value={agent.curveProgress}
                      className="[&>div]:dark:bg-green-600"
                    />
                    <span className="text-xs">{agent.curveProgress}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="shadow-l mt-8 flex w-full items-start gap-4 rounded-2xl border px-8 py-8">
          <div className="flex-0 rounded-lg border border-accent p-2">
            <Bot className="size-7 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Total Agents Created</h2>
            <div className="text mt-2 ml-1 min-h-[56px]">
              {isPlatformStatsPending ? (
                <div className="h-10 w-full animate-pulse rounded-xl bg-accent/20 transition-opacity duration-500" />
              ) : (
                <>
                  <p className="mt-2 text-4xl font-bold text-accent">
                    {platformStats?.activeAgentsCount ?? "0"}
                  </p>
                  <span className="mt-1 text-sm">Active Moduls</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="shadow-l mt-8 flex w-full items-start gap-4 rounded-2xl border px-8 py-8">
          <div className="flex-0 rounded-lg border border-accent p-2">
            <Info className="size-7 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              Ready to launch your own Modul?
            </h2>
            <div className="ml-1">
              <div className="text mt-2">
                <div>
                  <p className="font-semibold">1-click launch from templates</p>
                  <p className="text-sm text-neutral-400">
                    Customize agent. Choose a modul. Deploy.
                  </p>
                </div>
                <div className="mt-2">
                  <p className="font-semibold">
                    Launch your agent with optional revenue sharing
                  </p>
                  <p className="text-sm text-neutral-400">
                    Fund the agent. Feed the dev, or don't 😉.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isConnected && address) {
                    navigate("/create");
                  } else {
                    useWalletModalStore.getState().openWalletModal();
                  }
                }}
                className="bg-button-gradient mt-3 inline-block rounded-xl px-3 py-2 transition-all duration-500 hover:scale-105"
              >
                Get Started Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
