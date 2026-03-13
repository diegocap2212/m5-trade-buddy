import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3, Target, Shield } from 'lucide-react';

interface SessionStatsProps {
  wins: number;
  losses: number;
  totalSignals: number;
  winRate: number;
  mg1Stats?: {
    winsDirect: number;
    winsMG1: number;
    lossesReal: number;
  };
}

const SessionStats = ({ wins, losses, totalSignals, winRate, mg1Stats }: SessionStatsProps) => {
  const total = (mg1Stats?.winsDirect ?? 0) + (mg1Stats?.winsMG1 ?? 0) + (mg1Stats?.lossesReal ?? 0);
  const hasBacktest = total > 0;

  const stats = [
    { label: 'Win Direto', value: mg1Stats?.winsDirect ?? wins, icon: TrendingUp, color: 'text-win' },
    { label: 'Win MG1', value: mg1Stats?.winsMG1 ?? 0, icon: Shield, color: 'text-pending' },
    { label: 'Loss Real', value: mg1Stats?.lossesReal ?? losses, icon: TrendingDown, color: 'text-loss' },
    { label: 'WR Final', value: `${winRate.toFixed(0)}%`, icon: Target, color: winRate >= 70 ? 'text-win' : winRate >= 55 ? 'text-pending' : 'text-loss' },
  ];

  return (
    <div className="space-y-2">
      {hasBacktest && (
        <div className="flex items-center gap-2 px-1">
          <BarChart3 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">
            Backtest histórico ({total} sinais)
          </span>
        </div>
      )}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className={`font-mono text-lg font-bold ${stat.color}`}>{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SessionStats;
