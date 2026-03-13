import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3, Target } from 'lucide-react';

interface SessionStatsProps {
  wins: number;
  losses: number;
  totalSignals: number;
  winRate: number;
}

const SessionStats = ({ wins, losses, totalSignals, winRate }: SessionStatsProps) => {
  const stats = [
    { label: 'Sinais', value: totalSignals, icon: BarChart3, color: 'text-foreground' },
    { label: 'Wins', value: wins, icon: TrendingUp, color: 'text-win' },
    { label: 'Losses', value: losses, icon: TrendingDown, color: 'text-loss' },
    { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, icon: Target, color: winRate >= 60 ? 'text-win' : winRate >= 50 ? 'text-pending' : 'text-loss' },
  ];

  return (
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
  );
};

export default SessionStats;
