import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import type { Timeframe } from '@/lib/trading-types';

interface CandleCountdownProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

const CandleCountdown = ({ timeframe, onTimeframeChange }: CandleCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState('00:00');
  const minutes_interval = timeframe === 'M1' ? 1 : 5;

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      const currentCandleMinute = Math.floor(minutes / minutes_interval) * minutes_interval;
      const nextClose = currentCandleMinute + minutes_interval;

      const remainingMinutes = nextClose - minutes - 1;
      const remainingSeconds = 60 - seconds;

      const finalMinutes = remainingSeconds === 60 ? remainingMinutes + 1 : remainingMinutes;
      const finalSeconds = remainingSeconds === 60 ? 0 : remainingSeconds;

      setTimeLeft(
        `${String(Math.max(0, finalMinutes)).padStart(2, '0')}:${String(finalSeconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [minutes_interval]);

  const [min] = timeLeft.split(':').map(Number);
  const isUrgent = min < 1;

  return (
    <div className="flex items-center gap-2">
      <div className="flex bg-secondary rounded-md overflow-hidden border border-border">
        <button
          onClick={() => onTimeframeChange('M1')}
          className={`px-2 py-1 text-xs font-mono font-bold transition-colors ${
            timeframe === 'M1'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          M1
        </button>
        <button
          onClick={() => onTimeframeChange('M5')}
          className={`px-2 py-1 text-xs font-mono font-bold transition-colors ${
            timeframe === 'M5'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          M5
        </button>
      </div>
      <div className={`flex items-center gap-1.5 font-mono text-sm ${isUrgent ? 'text-signal-put' : 'text-foreground'}`}>
        <Timer className="h-4 w-4" />
        <span className="tracking-wider">{timeLeft}</span>
      </div>
    </div>
  );
};

export default CandleCountdown;
