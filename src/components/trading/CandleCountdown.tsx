import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

const CandleCountdown = () => {
  const [timeLeft, setTimeLeft] = useState('00:00');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // M5 candle closes every 5 minutes (0, 5, 10, 15, ...)
      const currentCandleMinute = Math.floor(minutes / 5) * 5;
      const nextClose = currentCandleMinute + 5;
      
      const remainingMinutes = nextClose - minutes - 1;
      const remainingSeconds = 60 - seconds;
      
      const finalMinutes = remainingSeconds === 60 ? remainingMinutes + 1 : remainingMinutes;
      const finalSeconds = remainingSeconds === 60 ? 0 : remainingSeconds;
      
      setTimeLeft(
        `${String(Math.max(0, finalMinutes)).padStart(2, '0')}:${String(finalSeconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const [min] = timeLeft.split(':').map(Number);
  const isUrgent = min < 1;

  return (
    <div className={`flex items-center gap-2 font-mono text-sm ${isUrgent ? 'text-signal-put' : 'text-foreground'}`}>
      <Timer className="h-4 w-4" />
      <span className="tracking-wider">{timeLeft}</span>
      <span className="text-xs text-muted-foreground">M5</span>
    </div>
  );
};

export default CandleCountdown;
