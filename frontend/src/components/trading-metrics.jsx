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
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-border rounded-lg p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-16 mb-2"></div>
              <div className="h-6 bg-muted rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !metrics?.data) {
    return (
      <div className={`border border-border rounded-lg p-4 ${className}`}>
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
      <div className="border border-border rounded-lg p-4">
        <div className="text-center">
          <button
            onClick={() =>
              (totalSupply || agentData?.totalSupply || data.totalSupply) &&
              setShowMarketCap(!showMarketCap)
            }
            className={`text-sm text-muted-foreground mb-1 transition-colors ${
              totalSupply || agentData?.totalSupply || data.totalSupply
                ? "hover:text-foreground cursor-pointer"
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
              className={`text-sm mt-1 ${getPriceChangeColor(data.priceChange24h)}`}
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
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <span>Buy/Sell Ratio</span>
                <span>
                  {reducedRatio.buys}:{reducedRatio.sells}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-green-600">Buys ({data.totalBuys})</span>
                <span className="text-red-600">Sells ({data.totalSells})</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
                <div
                  className="bg-green-600 h-full transition-all duration-300"
                  style={{
                    width: `${(data.totalBuys / data.totalTrades) * 100}%`,
                  }}
                />
                <div
                  className="bg-red-600 h-full transition-all duration-300"
                  style={{
                    width: `${(data.totalSells / data.totalTrades) * 100}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
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
    <div className="border border-border/30 rounded-lg p-3 text-center bg-muted/20">
      <div className="flex items-center justify-center gap-1 mb-2">
        <Icon className={`h-3 w-3 ${color} opacity-70`} />
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <div
        className="text-sm font-semibold text-foreground break-words"
        title={value}
      >
        {value}
      </div>
    </div>
  );
};

export default TradingMetrics;
