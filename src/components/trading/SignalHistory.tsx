import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TradingSignal } from '@/lib/trading-types';

interface SignalHistoryProps {
  signals: TradingSignal[];
  sessionWinRate: number;
  totalSignals: number;
  wins: number;
  losses: number;
}

const resultBadge = {
  WIN: 'bg-win/20 text-win border-win/30',
  LOSS: 'bg-loss/20 text-loss border-loss/30',
  PENDING: 'bg-pending/20 text-pending border-pending/30',
};

const directionBadge = {
  CALL: 'bg-signal-call/20 text-signal-call border-signal-call/30',
  PUT: 'bg-signal-put/20 text-signal-put border-signal-put/30',
  WAIT: 'bg-signal-wait/20 text-signal-wait border-signal-wait/30',
};

const SignalHistory = ({ signals, sessionWinRate, totalSignals, wins, losses }: SignalHistoryProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">Histórico de Sinais</CardTitle>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-win">{wins}W</span>
            <span className="text-loss">{losses}L</span>
            <span className="text-muted-foreground">|</span>
            <span className={sessionWinRate >= 60 ? 'text-win' : sessionWinRate >= 50 ? 'text-pending' : 'text-loss'}>
              {sessionWinRate.toFixed(0)}%
            </span>
            <span className="text-muted-foreground">({totalSignals})</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[280px]">
          {signals.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhum sinal registrado ainda
            </p>
          ) : (
            <div className="space-y-2">
              {signals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`${directionBadge[signal.direction]} font-mono text-xs border`}>
                      {signal.direction}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{signal.asset}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {signal.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Badge variant="outline" className={`${resultBadge[signal.result]} font-mono text-xs border`}>
                      {signal.result}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SignalHistory;
