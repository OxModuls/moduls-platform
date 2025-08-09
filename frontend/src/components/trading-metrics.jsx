import React from "react";
import {
  useTradingMetrics,
  formatVolumeETH,
  formatPriceChange,
  getPriceChangeColor,
  formatTradingAmount,
} from "../shared/hooks/useTrading";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Clock,
} from "lucide-react";

const TradingMetrics = ({ tokenAddress, className = "" }) => {
  const {
    data: metrics,
    isLoading,
    error,
  } = useTradingMetrics(tokenAddress, {
    enabled: !!tokenAddress,
  });

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

  const metricsData = [
    {
      label: "24h Volume",
      value: formatVolumeETH(data.volume24h),
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
      value: `${formatTradingAmount(data.high24h, 18)} ETH`,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "24h Low",
      value: `${formatTradingAmount(data.low24h, 18)} ETH`,
      icon: TrendingDown,
      color: "text-red-600",
    },
    {
      label: "Total Volume",
      value: formatVolumeETH(data.totalVolume),
      icon: Activity,
      color: "text-purple-600",
    },
    {
      label: "Total Trades",
      value: data.totalTrades.toLocaleString(),
      icon: Activity,
      color: "text-orange-600",
    },
    {
      label: "All Time High",
      value: `${formatTradingAmount(data.allTimeHigh, 18)} ETH`,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "Last Trade",
      value: data.lastTradeTime
        ? new Date(data.lastTradeTime).toLocaleString()
        : "No trades yet",
      icon: Clock,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Price */}
      <div className="border border-border rounded-lg p-6">
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">
            Current Price
          </div>
          <div className="text-3xl font-bold text-foreground">
            {formatTradingAmount(data.currentPrice, 18)} ETH
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricsData.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Buy/Sell Ratio */}
      {data.totalTrades > 0 && (
        <div className="border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-3">
            Buy/Sell Ratio
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-green-600">Buys</span>
                <span>{data.totalBuys}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(data.totalBuys / data.totalTrades) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-red-600">Sells</span>
                <span>{data.totalSells}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(data.totalSells / data.totalTrades) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, color }) => {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div
        className="text-lg font-semibold text-foreground truncate"
        title={value}
      >
        {value}
      </div>
    </div>
  );
};

export default TradingMetrics;
