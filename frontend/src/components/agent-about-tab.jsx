import { BadgeDollarSign, Banknote, Bot, Calendar, ChartCandlestick, CircleQuestionMark, Copy, Database, Info, Link, UserRound } from "lucide-react";
import { toast } from "sonner";
import CandlestickChart from "./candlestick-chart";
import { ellipsizeAddress, formatISODate, writeToClipboard } from "@/lib/utils";

const AgentAboutTab = ({ 
  token, 
  agent, 
  isTradingEnabled, 
  chartData 
}) => {
  return (
    <div className="mt-3">
      {!token.isAddressValid && (
        <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BadgeDollarSign className="size-4 text-red-600 dark:text-red-400" />
            <h3 className="font-medium text-red-600 dark:text-red-400">No Token Contract</h3>
          </div>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">
            This agent doesn't have a valid token contract address. Trading functionality is not available.
          </p>
        </div>
      )}
      {!isTradingEnabled && token.isAddressValid && (
        <div className="mb-5 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BadgeDollarSign className="size-4 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-medium text-yellow-600 dark:text-yellow-400">Trading Not Open</h3>
          </div>
          <p className="text-sm text-yellow-600/80 dark:text-yellow-400/80">
            This token is not yet open for trading. Click the "Open Trading" button above to enable buying and selling.
          </p>
        </div>
      )}
      {isTradingEnabled && (
        <div className="">
          <div className="ml-2 flex items-center gap-2">
            <ChartCandlestick className="size-4" />
            <h2 className="text-lg font-semibold">Chart</h2>
          </div>
          <div className="mt-2 px-2 py-4 bg-primary-foreground rounded-lg">
            <CandlestickChart data={chartData} />
          </div>
        </div>
      )}
      <div className="mt-5">
        <div className="ml-2 flex items-center gap-2">
          <Bot className="size-4" />
          <h2 className="text-lg font-semibold">Agent Description</h2>
        </div>
        <div className="mt-2 px-2 break-words">
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
  );
};

export default AgentAboutTab; 