import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FlaskConical, TrendingUp, TrendingDown, Shield, Flame, ShieldAlert, Play, BarChart3 } from 'lucide-react';
import { CRYPTO_ASSETS, type Timeframe, type TradingSignal } from '@/lib/trading-types';
import { useMarketData } from '@/hooks/use-market-data';
import { backtestCandles, type BacktestResult } from '@/lib/signal-engine';

const Backtest = () => {
  const [selectedAsset, setSelectedAsset] = useState('BTC/USD');
  const [timeframe, setTimeframe] = useState<Timeframe>('M5');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [ran, setRan] = useState(false);

  const { candles, status } = useMarketData(selectedAsset, timeframe);

  const runBacktest = useCallback(() => {
    if (candles.length < 24) return;
    const bt = backtestCandles(candles, selectedAsset);
    setResult(bt);
    setRan(true);
  }, [candles, selectedAsset]);

  const stats = useMemo(() => {
    if (!result) return null;
    const s = result.stats;
    const total = s.winsDirect + s.winsMG1 + s.winsMG2 + s.lossesMG1 + s.lossesMG2 + s.lossesDirect;
    const wins = s.winsDirect + s.winsMG1 + s.winsMG2;
    const losses = s.lossesMG1 + s.lossesMG2 + s.lossesDirect;
    const winRateWithMG = total > 0 ? (wins / total) * 100 : 0;
    const directOnly = s.winsDirect + s.lossesDirect;
    const winRateWithoutMG = directOnly > 0 ? (s.winsDirect / directOnly) * 100 : 0;
    return { total, wins, losses, winRateWithMG, winRateWithoutMG, ...s };
  }, [result]);

  const detailIcon: Record<string, React.ElementType> = {
    WIN_DIRECT: TrendingUp,
    WIN_MG1: Shield,
    WIN_MG2: Flame,
    LOSS_DIRECT: TrendingDown,
    LOSS_MG1: ShieldAlert,
    LOSS_MG2: ShieldAlert,
  };

  const detailColor: Record<string, string> = {
    WIN_DIRECT: 'text-emerald-400',
    WIN_MG1: 'text-amber-400',
    WIN_MG2: 'text-orange-400',
    LOSS_DIRECT: 'text-red-400',
    LOSS_MG1: 'text-red-400',
    LOSS_MG2: 'text-red-500',
  };

  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between bg-card/80 backdrop-blur-sm border border-border rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <h1 className="font-mono text-sm font-bold text-foreground tracking-wider">BACKTEST</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedAsset} onValueChange={v => { setSelectedAsset(v); setResult(null); setRan(false); }}>
              <SelectTrigger className="w-36 h-8 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRYPTO_ASSETS.map(a => (
                  <SelectItem key={a.pair} value={a.pair}>{a.pair}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeframe} onValueChange={v => { setTimeframe(v as Timeframe); setResult(null); setRan(false); }}>
              <SelectTrigger className="w-20 h-8 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M1">M1</SelectItem>
                <SelectItem value="M5">M5</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={runBacktest}
              disabled={candles.length < 24 || status !== 'connected'}
              className="gap-2 font-mono text-xs"
            >
              <Play className="h-3.5 w-3.5" />
              Rodar ({candles.length} velas)
            </Button>
          </div>
        </header>

        {!ran ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <FlaskConical className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-mono text-sm text-muted-foreground">
                Selecione ativo e timeframe, depois clique <strong>Rodar</strong>
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/50">
                O backtest usa as velas carregadas da Binance para validar a estratégia de Reversão por Exaustão
              </p>
            </CardContent>
          </Card>
        ) : stats && result ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card>
                <CardContent className="p-4">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">Total Sinais</span>
                  <p className="font-mono text-xl font-bold text-foreground mt-1">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">Win Rate (c/ MG)</span>
                  <p className={`font-mono text-xl font-bold mt-1 ${stats.winRateWithMG >= 65 ? 'text-emerald-400' : stats.winRateWithMG >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {stats.winRateWithMG.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">Win Rate (sem MG)</span>
                  <p className={`font-mono text-xl font-bold mt-1 ${stats.winRateWithoutMG >= 65 ? 'text-emerald-400' : stats.winRateWithoutMG >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {stats.winRateWithoutMG.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">Wins</span>
                  <p className="font-mono text-xl font-bold text-emerald-400 mt-1">{stats.wins}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">
                    {stats.winsDirect}D + {stats.winsMG1}MG1 + {stats.winsMG2}MG2
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">Losses</span>
                  <p className="font-mono text-xl font-bold text-red-400 mt-1">{stats.losses}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">
                    {stats.lossesDirect}D + {stats.lossesMG1}MG1 + {stats.lossesMG2}MG2
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Signal List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-xs flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Sinais do Backtest ({result.signals.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="divide-y divide-border">
                    {result.signals.map((signal) => {
                      const Icon = detailIcon[signal.resultDetail || 'WIN_DIRECT'];
                      const color = detailColor[signal.resultDetail || 'WIN_DIRECT'];
                      return (
                        <div key={signal.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={`font-mono text-[10px] border px-1.5 py-0 ${
                              signal.direction === 'CALL' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }`}>
                              {signal.direction}
                            </Badge>
                            <span className="font-mono text-xs text-foreground">{signal.asset}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {signal.timestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-muted-foreground">{signal.confidence}%</span>
                            <span className="font-mono text-[10px] text-muted-foreground">${signal.price.toFixed(2)}</span>
                            <Badge variant="outline" className={`font-mono text-[10px] border px-1.5 py-0 flex items-center gap-1 ${color}`}>
                              <Icon className="h-2.5 w-2.5" />
                              {signal.resultDetail?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="font-mono text-sm text-muted-foreground">Nenhum sinal encontrado no backtest</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Backtest;
