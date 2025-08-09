import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const SimplePriceChart = ({ data, height = 400, className = "" }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`border border-border rounded-lg ${className}`}>
        <div
          className="flex items-center justify-center"
          style={{ height: `${height}px` }}
        >
          <div className="text-center text-muted-foreground">
            <p>No price data available</p>
            <p className="text-sm mt-1">
              Chart will appear once trading begins
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate chart dimensions
  const padding = 40;
  const chartWidth = 800 - padding * 2;
  const chartHeight = height - padding * 2;

  // Get price values
  const prices = data.map((item) => parseFloat(item.close) / 1e18);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // Create SVG path points
  const points = data
    .map((item, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const price = parseFloat(item.close) / 1e18;
      const y = padding + ((maxPrice - price) / priceRange) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  // Calculate trend
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;
  const isPositive = change >= 0;

  return (
    <div className={`border border-border rounded-lg ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Price Chart</h3>
          <div
            className={`flex items-center gap-1 text-sm ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{change.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <svg width="100%" height={height} viewBox={`0 0 800 ${height}`}>
          {/* Grid lines */}
          <defs>
            <pattern
              id="grid"
              width="80"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 80 0 L 0 0 0 40"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="1"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Price line */}
          <polyline
            fill="none"
            stroke={isPositive ? "#10B981" : "#EF4444"}
            strokeWidth="2"
            points={points}
          />

          {/* Data points */}
          {data.map((item, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const price = parseFloat(item.close) / 1e18;
            const y = padding + ((maxPrice - price) / priceRange) * chartHeight;

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={isPositive ? "#10B981" : "#EF4444"}
                className="opacity-60 hover:opacity-100 transition-opacity"
              />
            );
          })}

          {/* Price labels */}
          <text x={padding} y={padding - 10} fontSize="12" fill="#6B7280">
            {maxPrice.toFixed(6)} ETH
          </text>
          <text x={padding} y={height - 10} fontSize="12" fill="#6B7280">
            {minPrice.toFixed(6)} ETH
          </text>

          {/* Time labels */}
          <text x={padding} y={height - 10} fontSize="12" fill="#6B7280">
            {new Date(data[0].timestamp).toLocaleDateString()}
          </text>
          <text
            x={padding + chartWidth}
            y={height - 10}
            fontSize="12"
            fill="#6B7280"
            textAnchor="end"
          >
            {new Date(data[data.length - 1].timestamp).toLocaleDateString()}
          </text>
        </svg>
      </div>
    </div>
  );
};

export default SimplePriceChart;
