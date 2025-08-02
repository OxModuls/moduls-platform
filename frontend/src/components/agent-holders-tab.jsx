import {
  Copy,
  Users,
  TrendingUp,
  Clock,
  RefreshCw,
  Database,
  BarChart3,
} from "lucide-react";
import { ellipsizeAddress, writeToClipboard } from "@/lib/utils";
import {
  useTokenHolders,
  useTokenHolderStats,
} from "@/shared/hooks/useTokenHolders";
import { useState } from "react";
import { Button } from "./ui/button";

const AgentHoldersTab = ({ tokenAddress, isTradingEnabled }) => {
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
            Trading Not Open
          </h3>
        </div>
        <p className="text-sm text-yellow-600/80 dark:text-yellow-400/80">
          Holder data will be available once trading is enabled for this token.
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
              {stats.holderCount || 0}
            </span>
          </div>
          <div className="mt-2 px-4 py-3 bg-primary-foreground rounded-lg border flex justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-5" />
              <span className="font-medium">Total Supply</span>
            </div>
            <span className="font-semibold text-accent">
              {parseFloat(stats.totalSupplyFormatted || "0").toLocaleString()}
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
            {/* Sales Manager Pool Balance */}
            {stats?.salesManagerBalance && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    Liquidity Pool
                  </span>
                </div>
                <div className="px-4 py-3 bg-background rounded-lg border flex justify-between items-center text-red-600 dark:text-red-400">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-muted-foreground min-w-[2rem]">
                      #0
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {ellipsizeAddress(stats.salesManagerBalance.address)}
                      </span>
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() =>
                          writeToClipboard(stats.salesManagerBalance.address)
                        }
                        title="Copy address"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-mono text-sm font-semibold">
                        {parseFloat(
                          stats.salesManagerBalance.balanceFormatted,
                        ).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stats.salesManagerBalance.percentage}% of supply
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {holders.map((holder, idx) => (
                <div
                  key={holder.address}
                  className="px-4 py-3 bg-background rounded-lg border flex justify-between items-center hover:bg-muted/30 transition-colors text-red-600 dark:text-red-400"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-muted-foreground min-w-[2rem]">
                      #{currentPage * limit + idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {ellipsizeAddress(holder.address)}
                      </span>
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => writeToClipboard(holder.address)}
                        title="Copy address"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-mono text-sm font-semibold">
                        {parseFloat(holder.balanceFormatted).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {holder.percentage}% of supply
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
