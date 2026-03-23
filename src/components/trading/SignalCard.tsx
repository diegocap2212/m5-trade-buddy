import { ArrowUpCircle, ArrowDownCircle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { SignalDirection, MacroBias, ResultDetail } from '@/lib/trading-types';

interface SignalCardProps {
  direction: SignalDirection;
  confidence: number;
  price: number;
  support: number;
  resistance: number;
  pattern: string;
  ema200Bias?: MacroBias;
  rsi?: number;
  stochK?: number;
  stochD?: number;
  confluences?: string[];
  currentPhase?: ResultDetail;
}

const signalConfig = {
  CALL: {
    label: 'ENTRAR CALL',
    sublabel: 'Compra',
    icon: ArrowUpCircle,
    colorClass: 'text-signal-call',
    bgClass: 'bg-signal-call/10',
    borderClass: 'border-signal-call/30',
    glowClass: 'glow-call',
  },
  PUT: {
    label: 'ENTRAR PUT',
    sublabel: 'Venda',
    icon: ArrowDownCircle,
    colorClass: 'text-signal-put',
    bgClass: 'bg-signal-put/10',
    borderClass: 'border-signal-put/30',
    glowClass: 'glow-put',
  },
  WAIT: {
    label: 'AGUARDAR',
    sublabel: 'Sem confluência',
    icon: Clock,
    colorClass: 'text-signal-wait',
    bgClass: 'bg-signal-wait/10',
    borderClass: 'border-signal-wait/30',
    glowClass: 'glow-wait',
  },
};

const biasConfig = {
  BULL: { label: 'BULL', icon: TrendingUp, color: 'text-win', bg: 'bg-win/15 border-win/30' },
  BEAR: { label: 'BEAR', icon: TrendingDown, color: 'text-loss', bg: 'bg-loss/15 border-loss/30' },
  NEUTRAL: { label: 'NEUTRO', icon: Minus, color: 'text-pending', bg: 'bg-pending/15 border-pending/30' },
};

const SignalCard = ({
  direction,
  confidence,
  price,
  support,
  resistance,
  pattern,
  ema200Bias = 'NEUTRAL',
  rsi = 50,
  stochK = 50,
  stochD = 50,
  confluences = [],
  currentPhase,
}: SignalCardProps) => {
  const config = signalConfig[direction];
  const Icon = config.icon;
  const bias = biasConfig[ema200Bias];
  const BiasIcon = bias.icon;

  const phaseLabel = currentPhase === 'LOSS_DIRECT' ? '🔄 FASE MG1'
    : currentPhase === 'LOSS_MG1' ? '🔥 FASE MG2'
    : null;

  return (
    <Card className={`${config.bgClass} ${config.borderClass} ${config.glowClass} border-2 transition-all duration-500`}>
      <CardContent className="p-6 flex flex-col items-center gap-4">
        {/* MG Phase Banner */}
        {phaseLabel && (
          <div className="w-full text-center py-2 rounded-lg bg-pending/20 border border-pending/40 animate-pulse">
            <span className="font-mono text-sm font-bold text-pending">{phaseLabel}</span>
          </div>
        )}
        {/* Macro Bias Badge */}
        <div className="w-full flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${bias.bg}`}>
            <BiasIcon className={`h-3 w-3 ${bias.color}`} />
            <span className={`text-xs font-mono font-bold ${bias.color}`}>EMA200 {bias.label}</span>
          </div>
          {pattern && pattern !== 'Sem padrão claro' && (
            <div className="px-2.5 py-1 bg-secondary rounded-full">
              <span className={`text-xs font-mono font-semibold ${config.colorClass}`}>{pattern}</span>
            </div>
          )}
        </div>

        {/* Signal */}
        <div className="flex flex-col items-center gap-2">
          <Icon className={`h-16 w-16 ${config.colorClass} pulse-signal`} />
          <h2 className={`text-3xl font-bold font-mono tracking-wider ${config.colorClass}`}>
            {config.label}
          </h2>
          <span className="text-sm text-muted-foreground">{config.sublabel}</span>
        </div>

        {/* Confidence */}
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Confiança</span>
            <span className={`font-mono ${config.colorClass}`}>{confidence}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                direction === 'CALL' ? 'bg-signal-call' :
                direction === 'PUT' ? 'bg-signal-put' : 'bg-signal-wait'
              }`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {/* RSI & Stochastic gauges */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>RSI(7)</span>
              <span className={`font-mono ${rsi < 30 ? 'text-signal-call' : rsi > 70 ? 'text-signal-put' : 'text-foreground'}`}>
                {rsi}
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  rsi < 30 ? 'bg-signal-call' : rsi > 70 ? 'bg-signal-put' : 'bg-muted-foreground'
                }`}
                style={{ width: `${rsi}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Stoch</span>
              <span className={`font-mono ${stochK < 20 ? 'text-signal-call' : stochK > 80 ? 'text-signal-put' : 'text-foreground'}`}>
                {stochK}/{stochD}
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stochK < 20 ? 'bg-signal-call' : stochK > 80 ? 'bg-signal-put' : 'bg-muted-foreground'
                }`}
                style={{ width: `${stochK}%` }}
              />
            </div>
          </div>
        </div>

        {/* Price levels */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-sm text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Resistência</p>
            <p className="font-mono text-sm text-signal-put">{resistance.toFixed(5)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Preço Atual</p>
            <p className="font-mono text-lg font-bold text-foreground">{price.toFixed(5)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Suporte</p>
            <p className="font-mono text-sm text-signal-call">{support.toFixed(5)}</p>
          </div>
        </div>

        {/* Confluences */}
        {confluences.length > 0 && (
          <div className="w-full">
            <p className="text-xs text-muted-foreground mb-2">Confluências ({confluences.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {confluences.map((c, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs font-mono border-border bg-secondary/50 text-muted-foreground"
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCard;
