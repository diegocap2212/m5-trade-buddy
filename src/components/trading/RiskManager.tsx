import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, DollarSign, Ban, RefreshCw, TrendingUp } from 'lucide-react';
import { CRYPTO_ASSETS } from '@/lib/trading-types';

interface RiskManagerProps {
  consecutiveLosses: number;
  totalLosses: number;
  totalSignals: number;
  selectedAsset: string;
  lastSignalResult?: 'WIN' | 'LOSS' | 'PENDING';
}

const RiskManager = ({
  consecutiveLosses,
  totalLosses,
  totalSignals,
  selectedAsset,
  lastSignalResult,
}: RiskManagerProps) => {
  const [capital, setCapital] = useState<string>('1000');
  const capitalNum = parseFloat(capital) || 0;

  const asset = CRYPTO_ASSETS.find(a => a.pair === selectedAsset);
  const payout = asset?.payout || 85;

  // Auto-calculate: 2% of capital as base entry
  const baseEntry = capitalNum * 0.02;

  // Martingale 1x calculation
  // After a LOSS, need to recover: lostAmount + desiredProfit
  // martingaleEntry = (lostAmount + baseEntry * payout/100) / (payout/100)
  const isMartingale = consecutiveLosses === 1; // Only 1x martingale (after 1 loss)
  const martingaleEntry = isMartingale
    ? (baseEntry + baseEntry * (payout / 100)) / (payout / 100)
    : 0;

  const currentEntry = isMartingale ? martingaleEntry : baseEntry;

  const riskPerTrade = capitalNum * 0.01;
  const dailyDrawdownLimit = capitalNum * 0.03;
  const currentDrawdown = totalLosses * baseEntry;
  const drawdownHit = currentDrawdown >= dailyDrawdownLimit && capitalNum > 0;
  const stopLoss = consecutiveLosses >= 2; // After martingale 1x fails = 2 consecutive losses → stop
  const alert = drawdownHit || stopLoss;

  return (
    <Card className={`bg-card border ${alert ? 'border-loss/50 glow-put' : 'border-border'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Gestão de Risco + Martingale 1x
          {alert && (
            <span className="ml-auto flex items-center gap-1 text-loss text-xs font-mono animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              {stopLoss ? 'PARE: Martingale falhou' : 'STOP DIÁRIO ATINGIDO'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Capital input */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Capital total"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            className="h-8 font-mono text-sm bg-secondary border-border"
          />
          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
            Payout: {payout}%
          </span>
        </div>

        {/* Entry suggestions */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-lg p-3 border ${
            !isMartingale ? 'bg-primary/10 border-primary/30' : 'bg-secondary border-border'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              <p className="text-[10px] text-muted-foreground font-mono">ENTRADA BASE (2%)</p>
            </div>
            <p className="font-mono text-lg font-bold text-foreground">
              ${baseEntry.toFixed(2)}
            </p>
          </div>
          <div className={`rounded-lg p-3 border ${
            isMartingale ? 'bg-amber-500/10 border-amber-500/30 animate-pulse' : 'bg-secondary border-border opacity-50'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <RefreshCw className={`h-3 w-3 ${isMartingale ? 'text-amber-400' : 'text-muted-foreground'}`} />
              <p className="text-[10px] text-muted-foreground font-mono">MARTINGALE 1x</p>
            </div>
            <p className={`font-mono text-lg font-bold ${isMartingale ? 'text-amber-400' : 'text-foreground'}`}>
              ${martingaleEntry > 0 ? martingaleEntry.toFixed(2) : '—'}
            </p>
          </div>
        </div>

        {/* Martingale active banner */}
        {isMartingale && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
            <RefreshCw className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-amber-400 font-mono">
              MARTINGALE ATIVO — Use ${martingaleEntry.toFixed(2)} na próxima entrada para recuperar o loss + lucro
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Entrada atual</p>
            <p className={`font-mono text-sm font-bold ${isMartingale ? 'text-amber-400' : 'text-foreground'}`}>
              ${currentEntry.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Drawdown</p>
            <p className={`font-mono text-sm font-bold ${drawdownHit ? 'text-loss' : 'text-foreground'}`}>
              ${currentDrawdown.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Losses seguidos</p>
            <p className={`font-mono text-sm font-bold ${consecutiveLosses >= 2 ? 'text-loss' : consecutiveLosses === 1 ? 'text-amber-400' : 'text-foreground'}`}>
              {consecutiveLosses}/2
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Lucro/entrada</p>
            <p className="font-mono text-sm font-bold text-win">
              ${(baseEntry * payout / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {stopLoss && (
          <div className="flex items-center gap-2 bg-loss/10 border border-loss/30 rounded-lg p-2">
            <Ban className="h-4 w-4 text-loss" />
            <p className="text-xs text-loss font-mono">
              STOP — Martingale 1x falhou (2 losses seguidos). Pare e aguarde novo ciclo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskManager;
