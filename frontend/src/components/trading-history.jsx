import React, { useState } from "react";
import {
  useTradingHistory,
  formatTradingAmount,
  formatTokenAmount,
  formatVolumeSEI,
  getChainExplorerParam,
} from "../shared/hooks/useTrading";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Filter,
} from "lucide-react";
import { ellipsizeAddress } from "@/lib/utils";

const TradingHistory = ({ tokenAddress, className = "" }) => {
  const [timeframe, setTimeframe] = useState("24h");
  const [type, setType] = useState("all");

  const {
    data: historyData,
    isLoading,
    error,
  } = useTradingHistory(tokenAddress, {
    timeframe,
    type,
    limit: 100,
  });

  const timeframeOptions = [
    { value: "1h", label: "1 Hour" },
    { value: "24h", label: "24 Hours" },
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "all", label: "All Time" },
  ];

  const typeOptions = [
    { value: "all", label: "All Trades" },
    { value: "buy", label: "Buys Only" },
    { value: "sell", label: "Sells Only" },
  ];

  if (isLoading) {
    return (
      <div className={`border border-border rounded-lg ${className}`}>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Trading History</h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="animate-pulse flex items-center gap-4 p-3 border border-border rounded"
              >
                <div className="h-4 w-4 bg-muted rounded"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !historyData?.data?.transactions) {
    return (
      <div className={`border border-border rounded-lg p-4 ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>Unable to load trading history</p>
        </div>
      </div>
    );
  }

  const transactions = historyData.data.transactions;

  return (
    <div className={`border border-border rounded-lg ${className}`}>
      {/* Header with filters */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Trading History</h3>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Timeframe:</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="text-sm border border-border rounded px-2 py-1 bg-background text-foreground"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="text-sm border border-border rounded px-2 py-1 bg-background text-foreground"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions list */}
      <div className="max-h-96 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No transactions found for the selected criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((transaction) => (
              <TransactionRow
                key={transaction.transactionHash}
                transaction={transaction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with pagination info */}
      {transactions.length > 0 && historyData.data.pagination && (
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          Showing {transactions.length} of {historyData.data.pagination.total}{" "}
          transactions
          {historyData.data.pagination.hasMore && (
            <span className="ml-2">• More available</span>
          )}
        </div>
      )}
    </div>
  );
};

const TransactionRow = ({ transaction }) => {
  const isBuy = transaction.type === "buy";
  const Icon = isBuy ? ArrowUpRight : ArrowDownLeft;
  const iconColor = isBuy ? "text-green-600" : "text-red-600";
  const bgColor = isBuy ? "bg-green-50" : "bg-red-50";

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  return (
    <div className="p-4 hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-4">
        {/* Trade type indicator */}
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full ${bgColor}`}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>

        {/* Transaction details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium capitalize ${iconColor}`}>
              {transaction.type}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatTokenAmount(transaction.tokenAmount, 18)} tokens
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>User: {ellipsizeAddress(transaction.userAddress)}</span>
            <span>{formatTime(transaction.blockTimestamp)}</span>
          </div>
        </div>

        {/* SEI amount */}
        <div className="text-right">
          <div className="font-medium text-foreground">
            {formatVolumeSEI(transaction.ethAmount)}
          </div>
          <div className="text-sm text-muted-foreground">
            @ {formatTradingAmount(transaction.price, 18)} SEI
          </div>
        </div>

        {/* External link */}
        <a
          href={`https://seitrace.com/tx/${transaction.transactionHash}?chain=${getChainExplorerParam()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="View on explorer"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export default TradingHistory;
