import { useState, useEffect } from "react";

const CountdownTimer = ({ targetTimestamp, onComplete }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const remaining = Math.max(0, targetTimestamp - now);
      return remaining;
    };

    // Initial calculation -
    setTimeRemaining(calculateTimeRemaining());

    // Set up interval to update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Call onComplete callback when countdown reaches zero
      if (remaining === 0 && onComplete) {
        onComplete();
      }
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [targetTimestamp, onComplete]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return "00:00:00";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes
        .toString()
        .padStart(2, "0")}m`;
    } else if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}h ${minutes
        .toString()
        .padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    } else {
      return `${minutes.toString().padStart(2, "0")}m ${secs
        .toString()
        .padStart(2, "0")}s`;
    }
  };

  return <span className="font-mono">{formatTime(timeRemaining)}</span>;
};

export default CountdownTimer;
