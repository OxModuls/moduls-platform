import { Copy, Users, RefreshCw, Database, BarChart3 } from "lucide-react";
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
      <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
        <div className="mb-2 flex items-center gap-2">
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
      <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Users className="size-4 text-red-600 dark:text-red-400" />
          <h3 className="font-medium text-red-600 dark:text-red-400">
            Failed to Load Data
          </h3>
        </div>
        <p className="mb-3 text-sm text-red-600/80 dark:text-red-400/80">
          Failed to load holder data. Please try again.
        </p>
        <Button
          onClick={handleRetry}
          variant="outline"
          size="sm"
          disabled={isRetrying}
        >
          {isRetrying ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {isRetrying ? "Retrying..." : "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Controls */}
      <div className="mb-5">
        <div className="ml-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4" />
            <h2 className="text-lg font-semibold">
              Token Holders {stats && <span>({stats.totalHolders || 0})</span>}
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={holdersLoading || statsLoading || isRetrying}
          >
            {holdersLoading || statsLoading || isRetrying ? (
              <div className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            {holdersLoading || statsLoading || isRetrying
              ? "Refreshing..."
              : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Holders Table */}
      <div className="rounded-lg border bg-primary-foreground px-2 py-4">
        {holdersLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
            <span className="text-muted-foreground">Loading holders...</span>
          </div>
        ) : holders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No holders found</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {holders.map((holder) => (
                <div
                  key={holder.address}
                  className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="min-w-[2rem] font-medium text-muted-foreground">
                      #{holder.rank}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {shortenAddress(holder.address)}
                      </span>
                      <button
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => writeToClipboard(holder.address)}
                        title="Copy address"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSpecialHolderType(holder.address) ? (
                        <span
                          className={`rounded-full border border-blue-200 bg-blue-100 px-1 py-0.5 text-xs ${getSpecialHolderType(holder.address).color} font-medium`}
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
                        {formatHolderPercentage(holder.percentage)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total > limit && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
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
