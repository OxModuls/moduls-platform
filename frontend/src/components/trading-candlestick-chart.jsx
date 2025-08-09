import { ColorType, createChart, CandlestickSeries } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useTradingChart } from "../shared/hooks/useTrading";

const TradingCandlestickChart = ({
  tokenAddress,
  colors = {},
  width,
  height,
  timeframe = "24h",
  interval = "1h",
}) => {
  const {
    backgroundColor = "#171717",
    textColor = "#e5e5e5",
    areaBottomColor = "#2962ff47",
    upColor = "#26a69a",
    downColor = "#ef5350",
    wickUpColor = "#26a69a",
    wickDownColor = "#ef5350",
  } = colors;

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  // Fetch data from backend
  const { data: chartData } = useTradingChart(tokenAddress, {
    timeframe,
    interval,
    enabled: !!tokenAddress,
  });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: width || chartContainerRef.current.clientWidth,
      height: height || 300,
    });
    chart.timeScale().fitContent();

    const newSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      wickUpColor,
      wickDownColor,
    });

    chartRef.current = chart;

    // Format and set data if available
    if (chartData?.data?.chartData && chartData.data.chartData.length > 0) {
      const formattedData = chartData.data.chartData.map((item) => ({
        time: Math.floor(new Date(item.timestamp).getTime() / 1000),
        open: parseFloat(item.open) / 1e18,
        high: parseFloat(item.high) / 1e18,
        low: parseFloat(item.low) / 1e18,
        close: parseFloat(item.close) / 1e18,
      }));

      newSeries.setData(formattedData);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [
    chartData,
    backgroundColor,
    textColor,
    areaBottomColor,
    upColor,
    downColor,
    wickUpColor,
    wickDownColor,
    width,
    height,
  ]);

  return <div ref={chartContainerRef} />;
};

export default TradingCandlestickChart;
