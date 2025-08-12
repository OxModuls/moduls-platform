import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "../ui/sidebar";
import { useBalance } from "wagmi";
import {
  Copy,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelLeftClose,
  X,
} from "lucide-react";

import { ellipsizeAddress, writeToClipboard } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatBigIntToUnits } from "../../lib/utils";

const AgentChat = ({ agent, fullScreen, onFullScreenChange, onOpenChange }) => {
  const { open: sidebarOpen, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();

  const { data: agentWalletBalance } = useBalance({
    address: agent.walletAddress,
  });

  const promptSuggestions = [
    "What Can I Do? 🤔",
    "Get Trading Alpha 📈",
    "Defi Execution ⚡",
    "Defi Research 🔍",
    "Goal-oriented Tasks 🎯",
  ];

  return (
    <main className="flex flex-1 flex-col p-2">
      <div className="flex justify-between px-1 py-1">
        <div className="flex items-center gap-3">
          <button className="cursor-pointer" onClick={toggleSidebar}>
            {sidebarOpen ? (
              <PanelLeftClose className="size-6" />
            ) : (
              <PanelLeft className="size-6" />
            )}
          </button>

          <div className="flex items-center gap-3">
            <Avatar className="size-11 border-2 border-accent">
              <AvatarImage src={agent.logoUrl} />
              <AvatarFallback>
                {agent.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="font-medium">{agent.name}</p>
              <div className="flex items-center gap-1">
                <span className="">
                  {isMobile
                    ? ellipsizeAddress(agent.walletAddress, 4, 2)
                    : ellipsizeAddress(agent.walletAddress, 4, 4)}
                </span>
                <button
                  className="cursor-pointer"
                  onClick={() => writeToClipboard(agent.walletAddress)}
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="md:ml-2">
            {!!agentWalletBalance && (
              <div className="rounded-lg bg-neutral-700 px-2 py-1 text-sm">
                <span>
                  {Number(formatBigIntToUnits(
                    agentWalletBalance.value,
                    agentWalletBalance.decimals,
                  )).toFixed(6)}
                </span>{" "}
                SEI
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => onFullScreenChange(!fullScreen)}
            className="cursor-pointer"
          >
            {fullScreen ? (
              <Minimize2 className="size-5" />
            ) : (
              <Maximize2 className="size-5" />
            )}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* separator line*/}
      <Separator className="my-2" />

      <div className="flex min-h-[45vh] flex-1 items-center justify-center">
        <div className="mx-auto max-w-md">
          <div className="flex flex-col items-center justify-center gap-5 px-4">
            <div className="">
              <h2 className="text-xl font-semibold">
                What can I help you with?
              </h2>
            </div>
            <div className="w-full">
              <Textarea placeholder="Ask me anything" className="" />
              <button className="from-logo bg-button-gradient mt-3 w-full cursor-pointer rounded-lg py-2 font-medium">
                Start Chat
              </button>
            </div>
          </div>

          <div className="mt-8 flex w-full justify-center">
            <div className="flex w-full flex-wrap justify-center gap-1.5 p-4">
              {promptSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  className="cursor-pointer rounded-xl bg-neutral-800 px-2 py-1"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AgentChat;
