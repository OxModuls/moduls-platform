import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";
import { useTradingChart } from "../shared/hooks/useTrading";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import SimplePriceChart from "./simple-price-chart";

const TradingChart = ({
  tokenAddress,
  height = 400,
  className = "",
  showControls = true,
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const seriesTypeRef = useRef(null);
  const [chartError, setChartError] = useState(false);

  const [timeframe, setTimeframe] = useState("24h");
  const [interval, setInterval] = useState("1h");

  const {
    data: chartData,
    isLoading,
    error,
  } = useTradingChart(tokenAddress, {
    timeframe,
    interval,
    enabled: !!tokenAddress,
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Small delay to ensure container is properly rendered
    const timeoutId = setTimeout(() => {
      if (!chartContainerRef.current) return;

      try {
        const containerWidth = chartContainerRef.current.clientWidth;
        const containerHeight = height;

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: "#ffffff" },
            textColor: "#374151",
          },
          grid: {
            vertLines: { color: "#E5E7EB" },
            horzLines: { color: "#E5E7EB" },
          },
          crosshair: {
            mode: 0,
          },
          rightPriceScale: {
            borderColor: "#E5E7EB",
          },
          timeScale: {
            borderColor: "#E5E7EB",
            timeVisible: true,
            secondsVisible: false,
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
          width: Math.max(containerWidth, 300),
          height: Math.max(containerHeight, 200),
        });

        // Try to add candlestick series first, fallback to line series if needed
        let series;
        let seriesType;
        try {
          series = chart.addCandlestickSeries({
            upColor: "#22c55e",
            downColor: "#ef4444",
            borderVisible: true,
            wickUpColor: "#22c55e",
            wickDownColor: "#ef4444",
            borderUpColor: "#16a34a",
            borderDownColor: "#dc2626",
          });
          seriesType = "candlestick";
        } catch (candlestickError) {
          console.warn(
            "Candlestick series failed, falling back to line series:",
            candlestickError,
          );
          series = chart.addLineSeries({
            color: "#3b82f6",
            lineWidth: 3,
          });
          seriesType = "line";
        }

        chartRef.current = chart;
        seriesRef.current = series;
        seriesTypeRef.current = seriesType;

        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
          if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
            seriesRef.current = null;
            seriesTypeRef.current = null;
          }
        };
      } catch (error) {
        console.error("Error initializing chart:", error);
        setChartError(true);
      }
    }, 100); // 100ms delay

    return () => {
      clearTimeout(timeoutId);
    };
  }, [height]);

  // Update chart data
  useEffect(() => {
    if (!chartData?.data?.chartData || !seriesRef.current) return;

    try {
      const rawData = chartData.data.chartData;

      // Check if we have OHLC data and what series type we're using
      const hasOHLCData =
        rawData.length > 0 &&
        rawData[0].open !== undefined &&
        rawData[0].high !== undefined &&
        rawData[0].low !== undefined;

      let formattedData;

      if (hasOHLCData && seriesTypeRef.current === "candlestick") {
        // Format as candlestick data
        formattedData = rawData
          .map((item) => {
            const timestamp = new Date(item.timestamp);
            if (isNaN(timestamp.getTime())) {
              console.warn("Invalid timestamp:", item.timestamp);
              return null;
            }
            return {
              time: Math.floor(timestamp.getTime() / 1000),
              open: parseFloat(item.open) / 1e18,
              high: parseFloat(item.high) / 1e18,
              low: parseFloat(item.low) / 1e18,
              close: parseFloat(item.close) / 1e18,
            };
          })
          .filter(
            (item) =>
              item &&
              item.open > 0 &&
              item.high > 0 &&
              item.low > 0 &&
              item.close > 0,
          );
      } else {
        // Format as line data using close price
        formattedData = rawData
          .map((item) => {
            const timestamp = new Date(item.timestamp);
            if (isNaN(timestamp.getTime())) {
              console.warn("Invalid timestamp:", item.timestamp);
              return null;
            }
            return {
              time: Math.floor(timestamp.getTime() / 1000),
              value: parseFloat(item.close) / 1e18,
            };
          })
          .filter((item) => item && item.value > 0);
      }

      if (formattedData.length > 0) {
        seriesRef.current.setData(formattedData);
        // Fit chart to data
        chartRef.current?.timeScale().fitContent();
      }
    } catch (error) {
      console.error("Error updating chart data:", error);
    }
  }, [chartData]);

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

  const timeframeOptions = [
    { value: "1h", label: "1H", interval: "5m" },
    { value: "24h", label: "24H", interval: "1h" },
    { value: "7d", label: "7D", interval: "4h" },
    { value: "30d", label: "30D", interval: "1d" },
  ];

  const handleTimeframeChange = (newTimeframe) => {
    const option = timeframeOptions.find((opt) => opt.value === newTimeframe);
    if (option) {
      setTimeframe(newTimeframe);
      setInterval(option.interval);
    }
  };

  if (error) {
    return (
      <div className={`border border-border rounded-lg p-6 ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>Unable to load chart data</p>
          <p className="text-sm mt-1">Please try again later</p>
        </div>
      </div>
    );
  }

  // Use simple chart as fallback if advanced chart fails or no data
  if (
    chartError ||
    !chartData?.data?.chartData ||
    chartData.data.chartData.length === 0
  ) {
    return (
      <div className={`border border-border rounded-lg ${className}`}>
        {showControls && (
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Price Chart</h3>
            <div className="flex items-center gap-1">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimeframeChange(option.value)}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    timeframe === option.value
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <SimplePriceChart
          data={chartData?.data?.chartData || []}
          height={height - (showControls ? 60 : 0)}
          className=""
        />
      </div>
    );
  }

  return (
    <div className={`border border-border rounded-lg ${className}`}>
      {showControls && (
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground">Price Chart</h3>
            {trend.direction !== "neutral" && (
              <div
                className={`flex items-center gap-1 text-sm ${
                  trend.direction === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{trend.change.toFixed(2)}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {timeframeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleTimeframeChange(option.value)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  timeframe === option.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading chart...
              </span>
            </div>
          </div>
        )}

        <div
          ref={chartContainerRef}
          style={{
            height: `${height}px`,
            minHeight: `${height}px`,
            width: "100%",
            minWidth: "300px",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default TradingChart;
