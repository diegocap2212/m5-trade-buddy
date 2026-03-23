import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, DollarSign, Ban, RefreshCw, TrendingUp, Flame } from 'lucide-react';
import { CRYPTO_ASSETS } from '@/lib/trading-types';

interface RiskManagerProps {
  consecutiveLosses: number;
  totalLosses: number;
  totalSignals: number;
  selectedAsset: string;
  lastSignalResult?: 'WIN' | 'LOSS' | 'PENDING';
  capital: number;
  onCapitalChange: (value: number) => void;
  mg2StopTriggered?: boolean;
}

const RiskManager = ({
  consecutiveLosses,
  totalLosses,
  totalSignals,
  selectedAsset,
  lastSignalResult,
  capital,
  onCapitalChange,
  mg2StopTriggered = false,
}: RiskManagerProps) => {
  const asset = CRYPTO_ASSETS.find(a => a.pair === selectedAsset);
  const payout = asset?.payout || 85;

  const baseEntry = capital * 0.02;
  const isMG1 = consecutiveLosses === 1;
  const isMG2 = consecutiveLosses === 2;
  const mg1Entry = (baseEntry + baseEntry * (payout / 100)) / (payout / 100);
  const mg2Entry = (baseEntry + mg1Entry + (baseEntry + mg1Entry) * (payout / 100)) / (payout / 100);

  const currentEntry = isMG2 ? mg2Entry : isMG1 ? mg1Entry : baseEntry;
  const totalCycleRisk = baseEntry + mg1Entry + mg2Entry;
  const cycleRiskPercent = capital > 0 ? (totalCycleRisk / capital) * 100 : 0;
  const dailyDrawdownLimit = capital * 0.03;
  const currentDrawdown = totalLosses * baseEntry;
  const drawdownHit = currentDrawdown >= dailyDrawdownLimit && capital > 0;
  const stopLoss = consecutiveLosses >= 3 || mg2StopTriggered;
  const alert = drawdownHit || stopLoss;

  return (
    <Card className={`bg-card border ${alert ? 'border-loss/50 glow-put' : 'border-border'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Gestão de Risco + MG2
          {alert && (
            <span className="ml-auto flex items-center gap-1 text-loss text-xs font-mono animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              {mg2StopTriggered ? 'STOP: MG2 falhou — PARE NO DIA' : stopLoss ? 'PARE: Martingale 2 falhou' : 'STOP DIÁRIO ATINGIDO'}
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
            onChange={(e) => onCapitalChange(parseFloat(e.target.value) || 0)}
            className="h-8 font-mono text-sm bg-secondary border-border"
          />
          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
            Payout: {payout}%
          </span>
        </div>

        {/* Entry suggestions — 3 columns */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`rounded-lg p-3 border ${
            !isMG1 && !isMG2 ? 'bg-primary/10 border-primary/30' : 'bg-secondary border-border'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              <p className="text-[10px] text-muted-foreground font-mono">BASE (2%)</p>
            </div>
            <p className="font-mono text-lg font-bold text-foreground">
              ${baseEntry.toFixed(2)}
            </p>
          </div>
          <div className={`rounded-lg p-3 border ${
            isMG1 ? 'bg-pending/10 border-pending/30 animate-pulse' : 'bg-secondary border-border opacity-50'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <RefreshCw className={`h-3 w-3 ${isMG1 ? 'text-pending' : 'text-muted-foreground'}`} />
              <p className="text-[10px] text-muted-foreground font-mono">MG1</p>
            </div>
            <p className={`font-mono text-lg font-bold ${isMG1 ? 'text-pending' : 'text-foreground'}`}>
              ${mg1Entry.toFixed(2)}
            </p>
          </div>
          <div className={`rounded-lg p-3 border ${
            isMG2 ? 'bg-[#ff6d00]/10 border-[#ff6d00]/30 animate-pulse' : 'bg-secondary border-border opacity-50'
          }`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className={`h-3 w-3 ${isMG2 ? 'text-[#ff6d00]' : 'text-muted-foreground'}`} />
              <p className="text-[10px] text-muted-foreground font-mono">MG2</p>
            </div>
            <p className={`font-mono text-lg font-bold ${isMG2 ? 'text-[#ff6d00]' : 'text-foreground'}`}>
              ${mg2Entry.toFixed(2)}
            </p>
          </div>
        </div>

        {isMG1 && (
          <div className="flex items-center gap-2 bg-pending/10 border border-pending/30 rounded-lg p-2">
            <RefreshCw className="h-4 w-4 text-pending" />
            <p className="text-xs text-pending font-mono">
              MG1 ATIVO — Use ${mg1Entry.toFixed(2)} na próxima entrada
            </p>
          </div>
        )}

        {isMG2 && !mg2StopTriggered && (
          <div className="flex items-center gap-2 bg-[#ff6d00]/10 border border-[#ff6d00]/30 rounded-lg p-2">
            <Flame className="h-4 w-4 text-[#ff6d00]" />
            <p className="text-xs text-[#ff6d00] font-mono">
              ⚠️ MG2 ATIVO — Use ${mg2Entry.toFixed(2)} | Se perder, PARE NO DIA
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Entrada atual</p>
            <p className={`font-mono text-sm font-bold ${isMG2 ? 'text-[#ff6d00]' : isMG1 ? 'text-pending' : 'text-foreground'}`}>
              ${currentEntry.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Risco ciclo</p>
            <p className={`font-mono text-sm font-bold ${cycleRiskPercent > 10 ? 'text-loss' : 'text-foreground'}`}>
              {cycleRiskPercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Losses seguidos</p>
            <p className={`font-mono text-sm font-bold ${consecutiveLosses >= 3 ? 'text-loss' : consecutiveLosses >= 1 ? 'text-pending' : 'text-foreground'}`}>
              {consecutiveLosses}/3
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Lucro/base</p>
            <p className="font-mono text-sm font-bold text-win">
              ${(baseEntry * payout / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {mg2StopTriggered && (
          <div className="flex items-center gap-2 bg-loss/10 border border-loss/30 rounded-lg p-3">
            <Ban className="h-5 w-5 text-loss" />
            <div>
              <p className="text-sm text-loss font-mono font-bold">
                🛑 STOP DO DIA — MG2 FALHOU
              </p>
              <p className="text-[10px] text-loss/80 font-mono mt-0.5">
                Martingale 2 perdeu. Não opere mais hoje. Aguarde novo dia.
              </p>
            </div>
          </div>
        )}

        {stopLoss && !mg2StopTriggered && (
          <div className="flex items-center gap-2 bg-loss/10 border border-loss/30 rounded-lg p-2">
            <Ban className="h-4 w-4 text-loss" />
            <p className="text-xs text-loss font-mono">
              STOP — 3 losses seguidos. Pare e aguarde novo ciclo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskManager;
