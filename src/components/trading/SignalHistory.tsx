import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Shield, ShieldAlert, TrendingDown } from 'lucide-react';
import type { TradingSignal, ResultDetail, Timeframe } from '@/lib/trading-types';

interface SignalHistoryProps {
  signals: TradingSignal[];
  sessionWinRate: number;
  totalSignals: number;
  wins: number;
  losses: number;
  selectedAsset?: string;
  timeframe?: Timeframe;
}

const detailConfig: Record<ResultDetail, { label: string; icon: React.ElementType; className: string }> = {
  WIN_DIRECT: { label: 'Win', icon: TrendingUp, className: 'bg-win/15 text-win border-win/30' },
  WIN_MG1: { label: 'MG1 ✓', icon: Shield, className: 'bg-pending/15 text-pending border-pending/30' },
  LOSS_MG1: { label: 'MG1 ✗', icon: ShieldAlert, className: 'bg-loss/15 text-loss border-loss/30' },
  LOSS_DIRECT: { label: 'Loss', icon: TrendingDown, className: 'bg-loss/15 text-loss border-loss/30' },
};

const fallbackResult: Record<string, { label: string; className: string }> = {
  WIN: { label: 'Win', className: 'bg-win/15 text-win border-win/30' },
  LOSS: { label: 'Loss', className: 'bg-loss/15 text-loss border-loss/30' },
  PENDING: { label: '...', className: 'bg-pending/15 text-pending border-pending/30' },
};

const directionBadge = {
  CALL: 'bg-signal-call/20 text-signal-call border-signal-call/30',
  PUT: 'bg-signal-put/20 text-signal-put border-signal-put/30',
  WAIT: 'bg-signal-wait/20 text-signal-wait border-signal-wait/30',
};

const SignalHistory = ({ signals, sessionWinRate, totalSignals, wins, losses, selectedAsset, timeframe }: SignalHistoryProps) => {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground tracking-wider">HISTÓRICO</span>
          {selectedAsset && timeframe && (
            <Badge variant="outline" className="font-mono text-[9px] border-border text-muted-foreground px-1.5 py-0">
              {selectedAsset} • {timeframe}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-win">{wins}W</span>
          <span className="text-loss">{losses}L</span>
          <span className="text-muted-foreground">•</span>
          <span className={sessionWinRate >= 60 ? 'text-win' : sessionWinRate >= 50 ? 'text-pending' : 'text-loss'}>
            {sessionWinRate.toFixed(0)}%
          </span>
        </div>
      </div>

      <ScrollArea className="h-[300px]">
        {signals.length === 0 ? (
          <p className="text-center text-muted-foreground text-xs py-8 font-mono">
            Nenhum sinal registrado
          </p>
        ) : (
          <div className="divide-y divide-border">
            {signals.map((signal) => {
              const detail = signal.resultDetail ? detailConfig[signal.resultDetail] : null;
              const fb = fallbackResult[signal.result];
              const DetailIcon = detail?.icon;

              return (
                <div key={signal.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Badge variant="outline" className={`${directionBadge[signal.direction]} font-mono text-[10px] border px-1.5 py-0`}>
                      {signal.direction}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">{signal.asset}</span>
                    <span className="font-mono text-[10px] text-muted-foreground opacity-60">{signal.confidence}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {signal.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Badge variant="outline" className={`${detail?.className ?? fb.className} font-mono text-[10px] border px-1.5 py-0 flex items-center gap-1`}>
                      {DetailIcon && <DetailIcon className="h-2.5 w-2.5" />}
                      {detail?.label ?? fb.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default SignalHistory;
