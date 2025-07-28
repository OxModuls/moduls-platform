import { ArrowUpRight, Brain, Info } from "lucide-react";
import { GiNinjaHead } from "react-icons/gi";
import { Link } from "react-router";
import {  keepPreviousData, useQueries } from "@tanstack/react-query";
import { createFetcher } from "../lib/fetcher";
import config from "../shared/config";
import ordinal from "ordinal";
import { useWalletModalStore } from "../shared/store";
import { useAuth } from "../shared/hooks/useAuth";
import { useNavigate } from "react-router";
import { useAccount } from "wagmi";

// AgentCard component for consistent agent card UI
function AgentCard({ agent }) {
  return (
    <div className="py-3 px-4 bg-primary-foreground border rounded-lg flex gap-3 items-center">
      <div className="size-10 bg-accent rounded-lg flex items-center justify-center">
        {
          agent.logoUrl ? (
            <img src={agent.logoUrl} alt={agent.name} className="w-10 h-10 rounded-lg" />
          ) : (
            <span className="h-7 text-xl text-center font-extrabold">
              {agent.name?.[0] || 'A'}
            </span>
          )
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-accent truncate">{agent.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground truncate">{agent.description}</span>
        </div>
      </div>
      <div className="flex items-center">
        <Link
          to={`/agents/${agent.uniqueId}`}
          className="text-xs hover:text-accent flex items-center gap-0.5 transition-colors duration-500"
        >
          View
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

const Home = () => {

  const { user, isAuthenticated, accessToken, isAuthChecked } = useAuth();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();


    const [platformStatResult, myAgentsResult] = useQueries({
    queries : [{
    queryKey : [config.endpoints.stats],
    queryFn :  createFetcher({
      url : config.endpoints.stats,
      method : "GET",
    }),
    placeholderData : keepPreviousData,
    refetchInterval : 1000 * 60,
  },
{

  queryKey : [config.endpoints.agentsMine, address],
  queryFn :  createFetcher({
      url : config.endpoints.agentsMine,
      method : "GET",
      auth : { accessToken }
  }),
  placeholderData : keepPreviousData,
  enabled: isAuthenticated && isAuthChecked,
  refetchInterval : 1000 * 60,



}

]})


const {data : platformStats, isPending : isPlatformStatsPending} = platformStatResult;
const {data : agentsData, isLoading : isMyAgentsLoading} = myAgentsResult;



const myAgents = agentsData?.agents || [];



  return (
    <div className="px-6 pt-4 pb-12 flex flex-col items-center">
      <div className="max-w-lg mx-auto">
        <div className="w-full py-8 px-6 rounded-2xl shadow-l border flex flex-col items-center">
          <h1 className="text-2xl font-bold text-accent capitalize text-center">
            Deploy Modular Agents
          </h1>
          <p className="mt-2 text-center">
            Moduls are on-chain agents with their own logic, tokens, and UI.
          </p>
          <p className="mt-1 text-center">
            They are plug-and-play infra components for crypto builders.
          </p>
        </div>
        <div className="mt-8 w-full py-8 px-6 rounded-2xl shadow-l border flex flex-col items-center">
          <h2 className="text-2xl font-bold text-accent capitalize">
            Launch your Modul
          </h2>
          <p className="mt-2 text-center">

            {
              platformStats?.activeUsersCount > 0 ? `Deploy agents instantly with modular on-chain logic. Become the ${ordinal(platformStats?.activeUsersCount)} user to launch your own Modul` : 'Deploy agents instantly with modular on-chain logic.'
            }{" "}
            No coding required.

          </p>
          <div className="mt-4 px-4 py-4 w-full border rounded-2xl flex flex-col items-center">
            <button
              onClick={
                () => {
                  if(isConnected && address) {
                    navigate("/create");
                  } else {
                    useWalletModalStore.getState().openWalletModal();
                  }
                }
              }
              className="w-full px-3 py-2 bg-accent rounded-xl font-bold flex justify-center cursor-pointer hover:-translate-y-1 transition-all duration-500"
            >
              <div className="w-40 flex justify-between items-center">
                <Brain className="size-5" />
                <span className="">Launch Agent</span>
                <ArrowUpRight className="size-5" />
              </div>
            </button>
            {/* My Agents List */}
            <div className="w-full mt-4">
              <h3 className="text-lg font-semibold mb-2 ml-1">My Agents</h3>
              {isMyAgentsLoading && !myAgents  ? (
                <div className="h-16 w-full bg-accent/20 rounded-lg animate-pulse transition-opacity duration-500" />
              ) : myAgents && myAgents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {myAgents.map((agent) => (
                    <AgentCard key={agent.uniqueId} agent={agent} />
                  ))}
                </div>
              ) : (
                <div className="py-4 px-4 bg-primary-foreground border-2 border-dashed border-accent/20 rounded-lg text-center text-muted-foreground">
                  <span className="block font-semibold mb-1">
                    {isAuthenticated ? "No agents yet" : "Connect wallet first"}
                  </span>
                  <span className="text-xs">
                    {isAuthenticated 
                      ? "You haven't launched any agents. Click \"Launch Agent\" to get started!"
                      : "Connect your wallet to see your own agents"
                    }
                  </span>&nbsp;&nbsp;
                  {!isAuthenticated && (
                    <button
                      onClick={() => useWalletModalStore.getState().openWalletModal()}
                      className="mt-2 text-xs text-accent hover:underline transition-colors duration-200 hover:cursor-pointer"
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
        <div className="mt-8 w-full py-8 px-8 rounded-2xl shadow-l border flex items-start gap-4">
          <div className="p-2 flex-0 border border-accent rounded-lg">
            <Brain className="size-7 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Total Agents Created</h2>
            <div className="ml-1 mt-2 text min-h-[56px]">
              {isPlatformStatsPending ? (
                <div className="h-10 w-full bg-accent/20 rounded-xl animate-pulse transition-opacity duration-500" />
              ) : (
                <>
                  <p className="mt-2 text-accent text-4xl font-bold">
                    {platformStats?.activeAgentsCount ?? '0'}
                  </p>
                  <span className="mt-1 text-sm">Active Moduls</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mt-8 w-full py-8 px-8 rounded-2xl shadow-l border flex items-start gap-4">
          <div className="p-2 flex-0 border border-accent rounded-lg">
            <Info className="size-7 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              Ready to launch your own Modul?
            </h2>
            <div className="ml-1">
              <div className="mt-2 text">
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
                onClick={
                  () => {
                    if(isConnected && address) {
                      navigate("/create");
                    } else {
                      useWalletModalStore.getState().openWalletModal();
                    }
                  }
                }
                className="inline-block mt-3 px-3 py-2 bg-accent rounded-xl font-bold hover:scale-105 transition-all duration-500"
              >
                Get Started Now
              </button>
            </div>
          </div>
        </div>
        <div className="mt-8 w-full py-8 px-8 rounded-2xl shadow-l border flex items-start gap-4">
          <div className="p-2 flex-0 border border-accent rounded-lg">
            <GiNinjaHead className="size-7 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Built for Hackers</h2>
            <div className="ml-1 mt-2">
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