import { useState } from 'react';
import { useGlobalStats } from '@/hooks/use-global-stats';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import type { PeriodStats } from '@/lib/global-stats';

interface Props {
  refreshTrigger: number;
}

function WinRateValue({ value, size = 'lg' }: { value: number; size?: 'lg' | 'sm' }) {
  const color = value >= 65 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : value > 0 ? 'text-red-400' : 'text-muted-foreground';
  const textSize = size === 'lg' ? 'text-lg font-bold' : 'text-xs font-medium';
  return <span className={`font-mono ${textSize} ${color}`}>{value > 0 ? `${value.toFixed(1)}%` : '—'}</span>;
}

function PeriodColumn({ label, stats, compareStats }: { label: string; stats: PeriodStats; compareStats?: PeriodStats }) {
  const trend = compareStats && compareStats.total > 0 && stats.total > 0
    ? stats.winRateWithMG - compareStats.winRateWithMG
    : null;

  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      
      <div className="flex items-center gap-1">
        <WinRateValue value={stats.winRateWithMG} />
        {trend !== null && (
          trend > 2 ? <TrendingUp className="h-3 w-3 text-emerald-400" /> :
          trend < -2 ? <TrendingDown className="h-3 w-3 text-red-400" /> :
          <Minus className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-muted-foreground font-mono">sem MG:</span>
        <WinRateValue value={stats.winRateWithoutMG} size="sm" />
      </div>
      
      <span className="font-mono text-[9px] text-muted-foreground/60">
        {stats.total} sinais • {stats.wins}W {stats.losses}L
      </span>
    </div>
  );
}

export default function GlobalAssertiveness({ refreshTrigger }: Props) {
  const [showBacktest, setShowBacktest] = useState(false);
  const source = showBacktest ? 'backtest' : 'live';
  const { today, week, month } = useGlobalStats(refreshTrigger, source);
  
  const hasData = today.total > 0 || week.total > 0 || month.total > 0;

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2 justify-center">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          Assertividade Global
        </span>
        <button
          onClick={() => setShowBacktest(!showBacktest)}
          className={`ml-2 font-mono text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
            showBacktest 
              ? 'bg-primary/20 border-primary/40 text-primary' 
              : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {showBacktest ? 'BACKTEST' : 'LIVE'}
        </button>
      </div>
      
      {hasData ? (
        <div className="grid grid-cols-3 divide-x divide-border">
          <PeriodColumn label="Hoje" stats={today} compareStats={week} />
          <PeriodColumn label="7 dias" stats={week} />
          <PeriodColumn label="30 dias" stats={month} />
        </div>
      ) : (
        <p className="text-center font-mono text-[10px] text-muted-foreground/50 py-1">
          {showBacktest ? 'Nenhum backtest registrado' : 'Nenhum sinal live registrado ainda'}
        </p>
      )}
    </div>
  );
}
