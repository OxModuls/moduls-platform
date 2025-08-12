import React, { useState } from "react";
import {
  useTradingMetrics,
  formatVolumeSEI,
  formatPriceChange,
  getPriceChangeColor,
  formatTradingAmount,
} from "../shared/hooks/useTrading";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

const TradingMetrics = ({
  tokenAddress,
  totalSupply = null,
  agentData = null,
  className = "",
}) => {
  const {
    data: metrics,
    isLoading,
    error,
  } = useTradingMetrics(tokenAddress, {
    enabled: !!tokenAddress,
  });

  const [showMarketCap, setShowMarketCap] = useState(false);

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <div className="animate-pulse">
              <div className="mb-2 h-4 w-16 rounded bg-muted"></div>
              <div className="h-6 w-20 rounded bg-muted"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !metrics?.data) {
    return (
      <div className={`rounded-lg border border-border p-4 ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>Unable to load trading metrics</p>
        </div>
      </div>
    );
  }

  const data = metrics.data;

  // Helper function to calculate Greatest Common Divisor (GCD)
  const gcd = (a, b) => {
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  };

  // Helper function to reduce ratio to lowest form
  const getReducedRatio = (buys, sells) => {
    if (buys === 0 && sells === 0) return { buys: 0, sells: 0 };
    if (buys === 0) return { buys: 0, sells: 1 };
    if (sells === 0) return { buys: 1, sells: 0 };

    const divisor = gcd(buys, sells);
    return {
      buys: buys / divisor,
      sells: sells / divisor,
    };
  };

  // Calculate market cap (using passed totalSupply, agentData, or from metrics data)
  const calculateMarketCap = () => {
    const supplySource =
      totalSupply || agentData?.totalSupply || data.totalSupply;

    if (!data.currentPrice || !supplySource) {
      return "0";
    }

    try {
      const price = parseFloat(formatTradingAmount(data.currentPrice, 18));
      const supply = parseFloat(supplySource);
      const marketCap = price * supply;

      if (marketCap >= 1000000) {
        return `${(marketCap / 1000000).toFixed(2)}M`;
      } else if (marketCap >= 1000) {
        return `${(marketCap / 1000).toFixed(2)}K`;
      } else {
        return marketCap.toFixed(4);
      }
    } catch (error) {
      console.error("Error calculating market cap:", error);
      return "0";
    }
  };

  // Main metrics (most important)
  const mainMetrics = [
    {
      label: "24h Volume",
      value: formatVolumeSEI(data.volume24h),
      icon: BarChart3,
      color: "text-blue-600",
    },
    {
      label: "24h Change",
      value: formatPriceChange(data.priceChange24h),
      icon: data.priceChange24h >= 0 ? TrendingUp : TrendingDown,
      color: getPriceChangeColor(data.priceChange24h),
    },
    {
      label: "24h High",
      value: `${formatTradingAmount(data.high24h, 18)} SEI`,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "24h Low",
      value: `${formatTradingAmount(data.low24h, 18)} SEI`,
      icon: TrendingDown,
      color: "text-red-600",
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Price/Market Cap Toggle */}
      <div className="rounded-lg border border-border p-4">
        <div hidden className="debug text-center">
          <button
            onClick={() =>
              (totalSupply || agentData?.totalSupply || data.totalSupply) &&
              setShowMarketCap(!showMarketCap)
            }
            className={`mb-1 text-sm text-muted-foreground transition-colors ${
              totalSupply || agentData?.totalSupply || data.totalSupply
                ? "cursor-pointer hover:text-foreground"
                : "cursor-default"
            }`}
          >
            {showMarketCap ? "Market Cap" : "Current Price"}{" "}
            {(totalSupply || agentData?.totalSupply || data.totalSupply) &&
              "(click to toggle)"}
          </button>
          <div className="text-2xl font-bold text-foreground">
            {showMarketCap
              ? `${calculateMarketCap()} SEI`
              : `${formatTradingAmount(data.currentPrice, 18)} SEI`}
          </div>
          {data.priceChange24h !== 0 && (
            <div
              className={`mt-1 text-sm ${getPriceChangeColor(data.priceChange24h)}`}
            >
              {formatPriceChange(data.priceChange24h)} (24h)
            </div>
          )}
        </div>
        <div className="">
          <div className="flex w-full justify-between">
            <p>Price</p>
            <span>{formatTradingAmount(data.currentPrice, 18)} SEI</span>
          </div>
          {(totalSupply || agentData?.totalSupply || data.totalSupply) && (
            <div className="flex w-full justify-between">
              <p>Market Cap</p>
              <span>{calculateMarketCap()} SEI</span>
            </div>
          )}
          {data.priceChange24h !== 0 && (
            <div
              className={`mt-1 text-center text-sm ${getPriceChangeColor(data.priceChange24h)}`}
            >
              {formatPriceChange(data.priceChange24h)} (24h)
            </div>
          )}
        </div>
      </div>

      {/* Main Metrics Grid - Max 2 per row */}
      <div className="grid grid-cols-2 gap-4">
        {mainMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Buy/Sell Ratio */}
      {data.totalTrades > 0 &&
        (() => {
          const reducedRatio = getReducedRatio(data.totalBuys, data.totalSells);
          return (
            <div className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-green-600">Buys ({data.totalBuys})</span>
                <span className="text-red-600">Sells ({data.totalSells})</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-green-600 transition-all duration-300"
                  style={{
                    width: `${(data.totalBuys / data.totalTrades) * 100}%`,
                  }}
                />
                <div
                  className="h-full bg-red-600 transition-all duration-300"
                  style={{
                    width: `${(data.totalSells / data.totalTrades) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {((data.totalBuys / data.totalTrades) * 100).toFixed(1)}%
                </span>
                <span>
                  {((data.totalSells / data.totalTrades) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, color }) => {
  return (
    <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-center">
      <div className="mb-2 flex items-center justify-center gap-1">
        <Icon className={`h-3 w-3 ${color} opacity-70`} />
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div
        className="text-sm font-semibold break-words text-foreground"
        title={value}
      >
        {value}
      </div>
    </div>
  );
};

export default TradingMetrics;
