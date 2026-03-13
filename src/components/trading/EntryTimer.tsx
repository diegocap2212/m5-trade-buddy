import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface EntryTimerProps {
  entryTime: Date;
  martingaleTime?: Date | null;
  direction: 'CALL' | 'PUT';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const EntryTimer = ({ entryTime, martingaleTime, direction }: EntryTimerProps) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const msUntilEntry = entryTime.getTime() - now;
  const isUrgent = msUntilEntry > 0 && msUntilEntry <= 5000;
  const isNow = msUntilEntry <= 0 && msUntilEntry > -3000;
  const isPast = msUntilEntry <= -3000;

  return (
    <div className="flex flex-col items-end gap-0.5 font-mono text-[11px]">
      {/* Entry time */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">ENTRADA</span>
        <span
          className={`font-bold tracking-wider ${
            isNow
              ? direction === 'CALL'
                ? 'text-green-400 animate-pulse'
                : 'text-red-400 animate-pulse'
              : isUrgent
                ? 'text-yellow-400 animate-pulse'
                : isPast
                  ? 'text-muted-foreground'
                  : 'text-foreground'
          }`}
        >
          {formatTime(entryTime)}
        </span>
        {!isPast && (
          <span
            className={`text-[10px] ${
              isNow
                ? 'text-green-400 font-bold'
                : isUrgent
                  ? 'text-yellow-400'
                  : 'text-muted-foreground'
            }`}
          >
            {isNow ? 'AGORA!' : `⏱ ${formatCountdown(msUntilEntry)}`}
          </span>
        )}
      </div>

      {/* Martingale time */}
      {martingaleTime && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-yellow-500/80">MG1</span>
          <span className="text-yellow-500/80 tracking-wider">
            {formatTime(martingaleTime)}
          </span>
          <span className="text-[10px] text-muted-foreground">(se loss)</span>
        </div>
      )}
    </div>
  );
};

export default EntryTimer;
