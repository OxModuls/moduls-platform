import React, { useEffect, useState, useMemo } from "react";
import { useTradingChart } from "../shared/hooks/useTrading";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import SimplePriceChart from "./simple-price-chart";
import AdvancedChart from "./advanced-chart";
import { cn } from "@/lib/utils";

const TradingChart = ({
  tokenAddress,
  height = 400,
  className = "",
  showControls = true,
  totalSupply = null,
}) => {
  const [chartError] = useState(false);

  const [timeframe, setTimeframe] = useState("24h");
  const [interval, setInterval] = useState("1h");
  const [showMarketCap, setShowMarketCap] = useState(false);
  const [forceChartMode, setForceChartMode] = useState(null); // null = auto, 'simple' = force simple, 'advanced' = force advanced

  const timeframeOptions = useMemo(
    () => [
      { value: "1h", label: "1H", intervals: ["5m", "10m", "15m"] },
      { value: "24h", label: "24H", intervals: ["15m", "30m", "1h"] },
      { value: "7d", label: "7D", intervals: ["1h", "4h", "6h"] },
      { value: "30d", label: "30D", intervals: ["6h", "12h", "1d"] },
    ],
    [],
  );

  // Ensure interval matches timeframe on mount
  useEffect(() => {
    const currentOption = timeframeOptions.find(
      (opt) => opt.value === timeframe,
    );
    if (currentOption && !currentOption.intervals.includes(interval)) {
      setInterval(currentOption.intervals[0]);
    }
  }, [timeframe, interval, timeframeOptions]);

  const {
    data: chartData,
    isLoading,
    error,
  } = useTradingChart(tokenAddress, {
    timeframe,
    interval,
    enabled: !!tokenAddress,
  });

  // Get current price trend
  const getCurrentTrend = () => {
    if (!chartData?.data?.chartData || chartData.data.chartData.length < 2) {
      return { direction: "neutral", change: 0 };
    }

    const data = chartData.data.chartData;
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    if (!latest || !previous) return { direction: "neutral", change: 0 };

    const latestPrice = parseFloat(latest.close);
    const previousPrice = parseFloat(previous.close);
    const change = ((latestPrice - previousPrice) / previousPrice) * 100;

    return {
      direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
      change: change,
    };
  };

  const trend = getCurrentTrend();

  const handleTimeframeChange = (newTimeframe) => {
    const option = timeframeOptions.find((opt) => opt.value === newTimeframe);
    if (option) {
      setTimeframe(newTimeframe);
      setInterval(option.intervals[0]); // Default to first interval
    }
  };

  const handleIntervalChange = (newInterval) => {
    setInterval(newInterval);
  };

  // Get available intervals for current timeframe
  const getCurrentTimeframeOption = () => {
    return timeframeOptions.find((opt) => opt.value === timeframe);
  };

  if (error) {
    return (
      <div className={`rounded-lg border border-border p-6 ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>Unable to load chart data</p>
          <p className="mt-1 text-sm">Please try again later</p>
        </div>
      </div>
    );
  }

  // Determine if we should use simple chart (but don't early return to maintain hook order)
  const autoShouldUseSimpleChart =
    chartError ||
    !chartData?.data?.chartData ||
    chartData.data.chartData.length === 0;

  const shouldUseSimpleChart =
    forceChartMode === "simple"
      ? true
      : forceChartMode === "advanced"
        ? false
        : autoShouldUseSimpleChart; // auto mode

  return (
    <div className={cn(`rounded-lg border border-border`, className)}>
      {showControls && (
        <div className="border-b border-border p-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h3 className="text-sm font-semibold text-foreground sm:text-base">
                {showMarketCap ? "Market Cap" : "Price"} Chart
              </h3>
              <button
                onClick={() => {
                  if (forceChartMode === null) {
                    // If auto mode, toggle to opposite of current auto state
                    setForceChartMode(
                      autoShouldUseSimpleChart ? "advanced" : "simple",
                    );
                  } else if (forceChartMode === "simple") {
                    setForceChartMode("advanced");
                  } else if (forceChartMode === "advanced") {
                    setForceChartMode("simple");
                  }
                }}
                onDoubleClick={() => {
                  // Double-click to reset to auto mode
                  setForceChartMode(null);
                }}
                className={`h-2 w-2 flex-shrink-0 cursor-pointer rounded-full transition-all hover:scale-110 ${
                  shouldUseSimpleChart
                    ? "bg-red-500 hover:bg-red-400"
                    : "bg-green-500 hover:bg-green-400"
                } ${
                  forceChartMode !== null
                    ? "ring-2 ring-gray-400 ring-offset-1"
                    : ""
                }`}
                title={`${shouldUseSimpleChart ? "Simple chart" : "Advanced chart"}${forceChartMode !== null ? ` (manual)` : ` (auto)`} - click to toggle, double-click for auto`}
              ></button>
              {totalSupply && (
                <button
                  onClick={() => setShowMarketCap(!showMarketCap)}
                  className="flex-shrink-0 cursor-pointer rounded bg-muted px-2 py-1 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {showMarketCap ? "Price" : "Market Cap"}
                </button>
              )}
              {!shouldUseSimpleChart && trend.direction !== "neutral" && (
                <div
                  className={`flex flex-shrink-0 items-center gap-1 text-xs sm:text-sm ${
                    trend.direction === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trend.direction === "up" ? (
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  <span>{trend.change.toFixed(2)}%</span>
                </div>
              )}
            </div>

            <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto pb-1">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimeframeChange(option.value)}
                  className={`flex-shrink-0 rounded px-2 py-1 text-xs whitespace-nowrap transition-colors sm:px-3 sm:text-sm ${
                    timeframe === option.value
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval controls */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              Interval:
            </span>
            <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto pb-1">
              {getCurrentTimeframeOption()?.intervals.map((intervalOption) => (
                <button
                  key={intervalOption}
                  onClick={() => handleIntervalChange(intervalOption)}
                  className={`flex-shrink-0 rounded px-2 py-1 text-xs whitespace-nowrap transition-colors ${
                    interval === intervalOption
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  {intervalOption}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading chart...
              </span>
            </div>
          </div>
        )}

        {shouldUseSimpleChart ? (
          <SimplePriceChart
            data={chartData?.data?.chartData || []}
            height={height - (showControls ? 100 : 0)}
            className=""
          />
        ) : (
          <AdvancedChart
            chartData={chartData}
            height={height - (showControls ? 100 : 0)}
            showMarketCap={showMarketCap}
            totalSupply={totalSupply}
          />
        )}
      </div>
    </div>
  );
};

export default TradingChart;
