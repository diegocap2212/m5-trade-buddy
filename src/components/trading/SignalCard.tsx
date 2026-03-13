import { ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SignalDirection } from '@/lib/trading-types';

interface SignalCardProps {
  direction: SignalDirection;
  confidence: number;
  price: number;
  support: number;
  resistance: number;
  pattern: string;
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

const SignalCard = ({ direction, confidence, price, support, resistance, pattern }: SignalCardProps) => {
  const config = signalConfig[direction];
  const Icon = config.icon;

  return (
    <Card className={`${config.bgClass} ${config.borderClass} ${config.glowClass} border-2 transition-all duration-500`}>
      <CardContent className="p-6 flex flex-col items-center gap-4">
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

        {/* Pattern */}
        {pattern && (
          <div className="px-3 py-1 bg-secondary rounded-full">
            <span className="text-xs font-mono text-muted-foreground">Padrão: </span>
            <span className={`text-xs font-mono font-semibold ${config.colorClass}`}>{pattern}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCard;
