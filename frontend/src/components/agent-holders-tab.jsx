import {
  Copy,
  Users,
  TrendingUp,
  Clock,
  RefreshCw,
  Database,
  BarChart3,
} from "lucide-react";
import { writeToClipboard } from "@/lib/utils";
import {
  useTokenHolders,
  useTokenHolderStats,
  formatHolderBalance,
  formatHolderPercentage,
  getHolderCategory,
  getSpecialHolderType,
  shortenAddress,
} from "@/shared/hooks/useHolders";
import { useState } from "react";
import { Button } from "./ui/button";
import CountdownTimer from "./countdown-timer";

const AgentHoldersTab = ({
  tokenAddress,
  isTradingEnabled,
  timeUntilTrading,
  targetTimestamp,
  onCountdownComplete,
}) => {
  const [sortBy, setSortBy] = useState("balance");
  const [currentPage, setCurrentPage] = useState(0);
  const limit = 20;

  // Fetch holder data
  const {
    data: holdersData,
    isLoading: holdersLoading,
    error: holdersError,
    refetch: refetchHolders,
  } = useTokenHolders(tokenAddress, {
    limit,
    offset: currentPage * limit,
    sort: sortBy,
    enabled: isTradingEnabled && !!tokenAddress,
  });

  // Fetch holder statistics
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useTokenHolderStats(tokenAddress, {
    enabled: isTradingEnabled && !!tokenAddress,
  });

  const holders = holdersData?.data?.holders || [];
  const stats = statsData?.data;
  const pagination = holdersData?.data?.pagination;

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(0); // Reset to first page when sorting changes
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await Promise.all([refetchHolders(), refetchStats()]);
    } catch (error) {
      console.error("Error retrying data fetch:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isTradingEnabled) {
    return (
      <div className="mt-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Users className="size-4 text-yellow-600 dark:text-yellow-400" />
          <h3 className="font-medium text-yellow-600 dark:text-yellow-400">
            {timeUntilTrading > 0 ? "Trading Opens Soon" : "Trading Scheduled"}
          </h3>
        </div>
        <p className="text-sm text-yellow-600/80 dark:text-yellow-400/80">
          {timeUntilTrading > 0 ? (
            <>
              Holder data will be available when trading opens in{" "}
              <CountdownTimer
                targetTimestamp={targetTimestamp}
                onComplete={onCountdownComplete}
              />
              .
            </>
          ) : (
            "Holder data will be available once trading is enabled for this token."
          )}
        </p>
      </div>
    );
  }

  if (holdersError || statsError) {
    return (
      <div className="mt-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Users className="size-4 text-red-600 dark:text-red-400" />
          <h3 className="font-medium text-red-600 dark:text-red-400">
            Failed to Load Data
          </h3>
        </div>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-3">
          Failed to load holder data. Please try again.
        </p>
        <Button
          onClick={handleRetry}
          variant="outline"
          size="sm"
          disabled={isRetrying}
        >
          {isRetrying ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isRetrying ? "Retrying..." : "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Statistics */}
      {stats && (
        <div className="mb-5">
          <div className="ml-2 flex items-center gap-2">
            <BarChart3 className="size-4" />
            <h2 className="text-lg font-semibold">Holder Statistics</h2>
          </div>
          <div className="mt-2 px-4 py-3 bg-primary-foreground rounded-lg border flex justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-5" />
              <span className="font-medium">Total Holders</span>
            </div>
            <span className="font-semibold text-accent">
              {stats.totalHolders || 0}
            </span>
          </div>
          <div className="mt-2 px-4 py-3 bg-primary-foreground rounded-lg border flex justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-5" />
              <span className="font-medium">Average Balance</span>
            </div>
            <span className="font-semibold text-accent">
              {formatHolderBalance(stats.avgBalance || "0")}
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-5">
        <div className="ml-2 flex items-center gap-2">
          <Users className="size-4" />
          <h2 className="text-lg font-semibold">Token Holders</h2>
        </div>
        <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
          <div className="flex gap-2">
            <Button
              variant={sortBy === "balance" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("balance")}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Balance
            </Button>
            <Button
              variant={sortBy === "recent" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("recent")}
            >
              <Clock className="h-4 w-4 mr-1" />
              Recent
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={holdersLoading || statsLoading || isRetrying}
          >
            {holdersLoading || statsLoading || isRetrying ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></div>
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            {holdersLoading || statsLoading || isRetrying
              ? "Refreshing..."
              : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Holders Table */}
      <div className="px-2 py-4 bg-primary-foreground rounded-lg border">
        {holdersLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mr-3"></div>
            <span className="text-muted-foreground">Loading holders...</span>
          </div>
        ) : holders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No holders found</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {holders.map((holder) => (
                <div
                  key={holder.address}
                  className="px-4 py-3 bg-background rounded-lg border flex justify-between items-center hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-muted-foreground min-w-[2rem]">
                      #{holder.rank}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {shortenAddress(holder.address)}
                      </span>
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => writeToClipboard(holder.address)}
                        title="Copy address"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSpecialHolderType(holder.address) ? (
                        <span
                          className={`text-xs px-2 py-1 rounded-full bg-blue-100 border border-blue-200 ${getSpecialHolderType(holder.address).color} font-medium`}
                          title={getSpecialHolderType(holder.address).tooltip}
                        >
                          {getSpecialHolderType(holder.address).name}
                        </span>
                      ) : (
                        <span
                          className={`text-lg ${getHolderCategory(holder.percentage).color}`}
                          title={getHolderCategory(holder.percentage).tooltip}
                        >
                          {getHolderCategory(holder.percentage).name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-mono text-sm font-semibold">
                        {formatHolderBalance(holder.balance)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatHolderPercentage(holder.percentage)} of supply
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total > limit && (
              <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Showing {currentPage * limit + 1} -{" "}
                  {Math.min((currentPage + 1) * limit, pagination.total)} of{" "}
                  {pagination.total} holders
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AgentHoldersTab;
