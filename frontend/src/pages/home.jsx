import { ArrowUpRight, Bot, Info } from "lucide-react";
import { GiNinjaHead } from "react-icons/gi";
import { Link } from "react-router";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { createFetcher } from "../lib/fetcher";
import config from "../shared/config";
import ordinal from "ordinal";
import { useWalletModalStore } from "../shared/store";
import { useAuth } from "../shared/hooks/useAuth";
import { useNavigate } from "react-router";
import { useAccount } from "wagmi";

// AgentCard component for consistent agent card UI
function AgentCard({ agent }) {
  const isPending = agent.status === "PENDING";
  const isInactive = agent.status === "INACTIVE";
  const isActive = agent.status === "ACTIVE";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-primary-foreground px-4 py-3 ${
        isPending ? "opacity-60" : isInactive ? "bg-muted/20 opacity-40" : ""
      }`}
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
        {agent.logoUrl ? (
          <img
            src={agent.logoUrl}
            alt={agent.name}
            className="h-10 w-10 rounded-lg"
          />
        ) : (
          <span className="h-7 text-center text-xl font-extrabold">
            {agent.name?.[0] || "A"}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-bold text-accent">{agent.name}</p>
          {!isActive && (
            <div
              className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                isPending
                  ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                  : "bg-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              {isPending ? "Pending" : "Inactive"}
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {agent.description}
          </span>
        </div>
      </div>
      <div className="flex items-center">
        <Link
          to={`/agents/${agent.uniqueId}`}
          className="flex items-center gap-0.5 text-xs transition-colors duration-500 hover:text-accent"
        >
          View
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  const [platformStatResult, myAgentsResult] = useQueries({
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

  const { data: platformStats, isPending: isPlatformStatsPending } =
    platformStatResult;
  const { data: agentsData, isLoading: isMyAgentsLoading } = myAgentsResult;

  const myAgents = agentsData?.agents || [];

  return (
    <div className="flex flex-col items-center px-6 pt-4">
      <div className="mx-auto max-w-lg">
        <div className="shadow-l flex w-full flex-col items-center rounded-2xl border px-6 py-8">
          <h1 className="text-center text-2xl font-bold text-accent capitalize">
            Deploy Modular Agents
          </h1>
          <p className="mt-2 text-center">
            Deploy agents instantly with modular on-chain logic. {" "}
            {platformStats?.activeUsersCount > 0 &&
              `Become the ${ordinal(platformStats?.activeUsersCount)} user to launch your own Modul.`}{" "}
            No coding required.
          </p>
          <button
            onClick={() => {
              if (isConnected && address) {
                navigate("/create");
              } else {
                useWalletModalStore.getState().openWalletModal();
              }
            }}
            className="bg-button-gradient mt-3 flex w-full cursor-pointer justify-center rounded-xl px-3 py-2 transition-all duration-500 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between gap-1">
              <Bot className="size-5" />
              <span className="">Launch Agent</span>
              <ArrowUpRight className="size-5" />
            </div>
          </button>
        </div>

        {/* My agents component */}
        <div className="hidden shadow-l mt-8 flex w-full flex-col items-center rounded-2xl border px-6 py-8">
          <h2 className="text-2xl font-bold text-accent capitalize">
            Launch your Modul
          </h2>
          <p className="mt-2 text-center">
            {platformStats?.activeUsersCount > 0
              ? `Deploy agents instantly with modular on-chain logic. Become the ${ordinal(platformStats?.activeUsersCount)} user to launch your own Modul`
              : "Deploy agents instantly with modular on-chain logic."}{" "}
            No coding required.
          </p>
          <div className="mt-4 flex w-full flex-col items-center rounded-2xl border px-4 py-4">
            <button
              onClick={() => {
                if (isConnected && address) {
                  navigate("/create");
                } else {
                  useWalletModalStore.getState().openWalletModal();
                }
              }}
              className="flex w-full cursor-pointer justify-center rounded-xl bg-accent px-3 py-2 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between gap-1">
                <Bot className="size-5" />
                <span className="">Launch Agent</span>
                <ArrowUpRight className="size-5" />
              </div>
            </button>
            {/* My Agents List */}
            <div className="mt-4 w-full">
              <h3 className="mb-2 ml-1 text-lg font-semibold">My Agents</h3>
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
                  <span className="mb-1 block font-semibold">
                    {isAuthenticated ? "No agents yet" : "Connect wallet first"}
                  </span>
                  <span className="text-xs">
                    {isAuthenticated
                      ? 'You haven\'t launched any agents. Click "Launch Agent" to get started!'
                      : "Connect your wallet to see your own agents"}
                  </span>
                  &nbsp;&nbsp;
                  {!isAuthenticated && (
                    <button
                      onClick={() =>
                        useWalletModalStore.getState().openWalletModal()
                      }
                      className="mt-2 text-xs text-accent transition-colors duration-200 hover:cursor-pointer hover:underline"
                    >
                      Connect Wallet
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* End My Agents List */}
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
        <div className="shadow-l mt-8 flex w-full items-start gap-4 rounded-2xl border px-8 py-8">
          <div className="flex-0 rounded-lg border border-accent p-2">
            <GiNinjaHead className="size-7 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Built for Hackers</h2>
            <div className="mt-2 ml-1">
              <p className="font-semibold">Why devs love moduls:</p>
              <div className="mt-1 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span>🦩 Bonding Curve Presets</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>💬 Embedded Chat UI</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🛠️ Agent Memory & Hooks</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📦 Deploy to Sei</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
