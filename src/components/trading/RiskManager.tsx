import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, DollarSign, Ban } from 'lucide-react';

interface RiskManagerProps {
  consecutiveLosses: number;
  totalLosses: number;
  totalSignals: number;
}

const RiskManager = ({ consecutiveLosses, totalLosses, totalSignals }: RiskManagerProps) => {
  const [capital, setCapital] = useState<string>('1000');
  const capitalNum = parseFloat(capital) || 0;
  const riskPerTrade = capitalNum * 0.01;
  const dailyDrawdownLimit = capitalNum * 0.03;
  const currentDrawdown = totalLosses * riskPerTrade;
  const drawdownHit = currentDrawdown >= dailyDrawdownLimit && capitalNum > 0;
  const stopLoss = consecutiveLosses >= 3;
  const alert = drawdownHit || stopLoss;

  return (
    <Card className={`bg-card border ${alert ? 'border-loss/50 glow-put' : 'border-border'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Gestão de Risco
          {alert && (
            <span className="ml-auto flex items-center gap-1 text-loss text-xs font-mono animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              {stopLoss ? 'PARE: 3 losses seguidos' : 'STOP DIÁRIO ATINGIDO'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Capital total"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
            className="h-8 font-mono text-sm bg-secondary border-border"
          />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">1% Risco</p>
            <p className="font-mono text-sm font-bold text-foreground">
              ${riskPerTrade.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Drawdown</p>
            <p className={`font-mono text-sm font-bold ${drawdownHit ? 'text-loss' : 'text-foreground'}`}>
              ${currentDrawdown.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Losses seguidos</p>
            <p className={`font-mono text-sm font-bold ${stopLoss ? 'text-loss' : 'text-foreground'}`}>
              {consecutiveLosses}/3
            </p>
          </div>
        </div>
        {stopLoss && (
          <div className="flex items-center gap-2 bg-loss/10 border border-loss/30 rounded-lg p-2">
            <Ban className="h-4 w-4 text-loss" />
            <p className="text-xs text-loss font-mono">
              Parar operações — 3 perdas consecutivas. Faça uma pausa.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskManager;
