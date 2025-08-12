import { ArrowUpRight, Bot, Info } from "lucide-react";
import { GiNinjaHead } from "react-icons/gi";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { createFetcher } from "../lib/fetcher";
import config from "../shared/config";
import ordinal from "ordinal";
import { useWalletModalStore } from "../shared/store";
import { useNavigate } from "react-router";
import { useAccount } from "wagmi";

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
            className="bg-button-gradient mt-3 flex w-fit cursor-pointer justify-center rounded-xl px-3 py-2 transition-all duration-500 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="">Launch Agent</span>
            </div>
          </button>
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
