import React, { useEffect, useRef } from "react";
import { createChart, AreaSeries, HistogramSeries } from "lightweight-charts";

const AdvancedChart = ({
  chartData,
  height = 400,
  showMarketCap = false,
  totalSupply = null,
}) => {
  const chartContainerRef = useRef();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: "solid", color: "#1a1a1a" },
        textColor: "white",
      },
      rightPriceScale: {
        borderVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: Math.max(height, 200),
    });

    chart.timeScale().fitContent();

    // Add area series for price
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#2962FF",
      topColor: "#2962FF",
      bottomColor: "rgba(41, 98, 255, 0.28)",
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 8,
        minMove: 0.00000001,
      },
    });
    areaSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.4,
      },
    });

    // Add histogram series for volume
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    // Process and set data if available
    if (chartData?.data?.chartData) {
      try {
        const rawData = chartData.data.chartData;

        // Calculate multiplier for market cap if needed
        const supplyMultiplier =
          showMarketCap && totalSupply ? parseFloat(totalSupply) / 1e18 : 1;

        // Debug: Log raw data to see what we're getting
        console.log("Chart raw data sample:", rawData.slice(0, 3));
        console.log("Supply multiplier:", supplyMultiplier);

        // Process price data - backend returns values in wei format as strings
        const priceData = rawData
          .map((item) => {
            const timestamp = new Date(item.timestamp);
            if (isNaN(timestamp.getTime())) {
              console.warn("Invalid timestamp:", item.timestamp);
              return null;
            }
            // Use UNIX timestamp for intraday data (better for 5m, 15m, 1h intervals)
            const timeValue = Math.floor(timestamp.getTime() / 1000);

            // Convert from wei to ether and apply market cap multiplier
            const priceInEther = parseFloat(item.close) / 1e18;
            const displayValue = priceInEther * supplyMultiplier;

            console.log(
              `Price conversion - close: ${item.close}, priceInEther: ${priceInEther}, displayValue: ${displayValue}`,
            );

            return {
              time: timeValue,
              value: displayValue,
            };
          })
          .filter((item) => item && item.value > 0);

        console.log("Processed price data sample:", priceData.slice(0, 3));

        // Process volume data - backend returns values in wei format as strings
        const volumeData = rawData
          .map((item, index) => {
            const timestamp = new Date(item.timestamp);
            if (isNaN(timestamp.getTime())) {
              return null;
            }

            // Use UNIX timestamp for intraday data (better for 5m, 15m, 1h intervals)
            const timeValue = Math.floor(timestamp.getTime() / 1000);

            // Determine color based on price direction (compare wei values)
            let color = "#26a69a"; // green
            if (index > 0) {
              const currentPrice = parseFloat(item.close);
              const previousPrice = parseFloat(rawData[index - 1].close);
              if (currentPrice < previousPrice) {
                color = "#ef5350"; // red
              }
            }

            // Convert volume from wei to ether for display
            const volumeInEther =
              parseFloat(item.volume || item.ethAmount || 0) / 1e18;

            return {
              time: timeValue,
              value: volumeInEther,
              color: color,
            };
          })
          .filter((item) => item && item.value >= 0); // Allow 0 volume

        if (priceData.length > 0) {
          areaSeries.setData(priceData);
          console.log("Area series data set with", priceData.length, "points");
        } else {
          console.warn("No valid price data to set");
        }

        if (volumeData.length > 0) {
          volumeSeries.setData(volumeData);
          console.log(
            "Volume series data set with",
            volumeData.length,
            "points",
          );
        } else {
          console.warn("No valid volume data to set");
        }

        chart.timeScale().fitContent();

        // Auto-fit the price scale
        setTimeout(() => {
          chart.timeScale().fitContent();
        }, 100);
      } catch (error) {
        console.error("Error processing chart data:", error);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [chartData, height, showMarketCap, totalSupply]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        height: `${height}px`,
        minHeight: `${height}px`,
        width: "100%",
        maxWidth: "100%",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
      }}
      className="w-full overflow-hidden"
    />
  );
};

export default AdvancedChart;
