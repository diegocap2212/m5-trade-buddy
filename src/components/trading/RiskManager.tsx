import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, DollarSign, Ban, RefreshCw, TrendingUp, Flame } from 'lucide-react';
import { CRYPTO_ASSETS } from '@/lib/trading-types';
import { Progress } from '@/components/ui/progress';

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
  const stopLoss = consecutiveLosses >= 3 || mg2StopTriggered;
  const alert = stopLoss;

  // Phase for progress bar
  const phase = isMG2 ? 2 : isMG1 ? 1 : 0;
  const phaseLabel = isMG2 ? 'MG2' : isMG1 ? 'MG1' : 'BASE';
  const phaseColor = isMG2 ? 'text-[hsl(var(--loss))]' : isMG1 ? 'text-[hsl(var(--pending))]' : 'text-primary';
  const phaseIcon = isMG2 ? <Flame className="h-3.5 w-3.5" /> : isMG1 ? <RefreshCw className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />;

  return (
    <Card className={`bg-card border ${alert ? 'border-[hsl(var(--loss))]/50' : 'border-border'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Gestão de Risco
          {alert && (
            <span className="ml-auto flex items-center gap-1 text-[hsl(var(--loss))] text-xs font-mono animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              STOP
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Capital + Entrada ativa */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="number"
            placeholder="Capital"
            value={capital}
            onChange={(e) => onCapitalChange(parseFloat(e.target.value) || 0)}
            className="h-7 font-mono text-xs bg-secondary border-border flex-1 min-w-0"
          />
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md border shrink-0 ${
            isMG2 ? 'bg-[hsl(var(--loss))]/10 border-[hsl(var(--loss))]/30' :
            isMG1 ? 'bg-[hsl(var(--pending))]/10 border-[hsl(var(--pending))]/30' :
            'bg-primary/10 border-primary/30'
          }`}>
            {phaseIcon}
            <span className={`font-mono text-xs font-bold ${phaseColor}`}>
              ${currentEntry.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Barra de progresso do ciclo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>Ciclo: {phaseLabel}</span>
            <span>Payout: {payout}%</span>
          </div>
          <div className="flex gap-1">
            {[
              { label: 'BASE', value: baseEntry, active: phase >= 0 },
              { label: 'MG1', value: mg1Entry, active: phase >= 1 },
              { label: 'MG2', value: mg2Entry, active: phase >= 2 },
            ].map((step, i) => (
              <div key={step.label} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${
                  i === phase
                    ? i === 2 ? 'bg-[hsl(var(--loss))]' : i === 1 ? 'bg-[hsl(var(--pending))]' : 'bg-primary'
                    : step.active ? 'bg-muted-foreground/40' : 'bg-secondary'
                }`} />
                <div className="flex justify-between mt-0.5">
                  <span className={`text-[8px] font-mono ${i === phase ? phaseColor : 'text-muted-foreground/50'}`}>
                    {step.label}
                  </span>
                  <span className={`text-[8px] font-mono ${i === phase ? phaseColor : 'text-muted-foreground/50'}`}>
                    ${step.value.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Métricas compactas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-secondary rounded-lg p-2 text-center">
            <p className="text-[9px] text-muted-foreground font-mono mb-0.5">Risco do ciclo</p>
            <p className={`font-mono text-sm font-bold ${cycleRiskPercent > 10 ? 'text-[hsl(var(--loss))]' : 'text-foreground'}`}>
              {cycleRiskPercent.toFixed(1)}%
            </p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <p className="text-[9px] text-muted-foreground font-mono mb-0.5">Losses seguidos</p>
            <p className={`font-mono text-sm font-bold ${consecutiveLosses >= 3 ? 'text-[hsl(var(--loss))]' : consecutiveLosses >= 1 ? 'text-[hsl(var(--pending))]' : 'text-foreground'}`}>
              {consecutiveLosses}/3
            </p>
          </div>
        </div>

        {/* Alerta único relevante */}
        {mg2StopTriggered ? (
          <div className="flex items-center gap-2 bg-[hsl(var(--loss))]/10 border border-[hsl(var(--loss))]/30 rounded-lg p-2.5">
            <Ban className="h-4 w-4 text-[hsl(var(--loss))] shrink-0" />
            <div>
              <p className="text-xs text-[hsl(var(--loss))] font-mono font-bold">🛑 STOP DO DIA</p>
              <p className="text-[9px] text-[hsl(var(--loss))]/80 font-mono">MG2 falhou. Não opere mais hoje.</p>
            </div>
          </div>
        ) : stopLoss ? (
          <div className="flex items-center gap-2 bg-[hsl(var(--loss))]/10 border border-[hsl(var(--loss))]/30 rounded-lg p-2">
            <Ban className="h-4 w-4 text-[hsl(var(--loss))] shrink-0" />
            <p className="text-xs text-[hsl(var(--loss))] font-mono">STOP — 3 losses seguidos. Pare e aguarde.</p>
          </div>
        ) : isMG2 ? (
          <div className="flex items-center gap-2 bg-[hsl(var(--loss))]/10 border border-[hsl(var(--loss))]/30 rounded-lg p-2 animate-pulse">
            <Flame className="h-4 w-4 text-[hsl(var(--loss))] shrink-0" />
            <p className="text-xs text-[hsl(var(--loss))] font-mono">⚠️ MG2 ATIVO — Se perder, PARE NO DIA</p>
          </div>
        ) : isMG1 ? (
          <div className="flex items-center gap-2 bg-[hsl(var(--pending))]/10 border border-[hsl(var(--pending))]/30 rounded-lg p-2">
            <RefreshCw className="h-4 w-4 text-[hsl(var(--pending))] shrink-0" />
            <p className="text-xs text-[hsl(var(--pending))] font-mono">MG1 ATIVO — Entrada: ${mg1Entry.toFixed(2)}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default RiskManager;
