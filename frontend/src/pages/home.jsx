import { ArrowUpRight, Brain, Info } from "lucide-react";
import { GiNinjaHead } from "react-icons/gi";
import { Link } from "react-router";

const Home = () => {
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
            Deploy agents instantly with modular on-chain logic. No coding
            required.
          </p>
          <div className="mt-4 px-4 py-4 w-full border rounded-2xl flex flex-col items-center">
            <Link
              to="/create"
              className="w-full px-3 py-2 bg-accent rounded-xl font-bold flex justify-center cursor-pointer hover:-translate-y-1 transition-all duration-500"
            >
              <div className="w-40 flex justify-between items-center">
                <Brain className="size-5" />
                <span className="">Launch Agent</span>
                <ArrowUpRight className="size-5" />
              </div>
            </Link>
            <div className="mt-4 py-3 px-4 w-full bg-primary-foreground border rounded-lg flex gap-3">
              <div className="size-10 bg-accent rounded-lg flex items-center justify-center">
                <span className="h-7 text-xl text-center font-extrabold">
                  M
                </span>
              </div>
              <div className="">
                <p>Modul Agent</p>
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-400">Official Agent</span>
                </div>
              </div>
              <div className="relative flex-1">
                <div className="flex items-center gap-1 absolute bottom-0 right-0">
                  <Link
                    to={"/agent"}
                    className="text-xs hover:text-accent flex items-center gap-0.5 transition-colors duration-500"
                  >
                    View
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 w-full py-8 px-8 rounded-2xl shadow-l border flex items-start gap-4">
          <div className="p-2 flex-0 border border-accent rounded-lg">
            <Brain className="size-7 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Total Agents Created</h2>
            <div className="ml-1 mt-2 text">
              <p className="mt-2 text-accent text-4xl font-bold">1234</p>
              <span className="mt-1 text-sm">Active Moduls</span>
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
              <Link
                to="/create"
                className="inline-block mt-3 px-3 py-2 bg-accent rounded-xl font-bold hover:scale-105 transition-all duration-500"
              >
                Get Started Now
              </Link>
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