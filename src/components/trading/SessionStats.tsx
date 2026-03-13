import { TrendingUp, Shield, ShieldAlert, TrendingDown, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SessionStatsProps {
  wins: number;
  losses: number;
  totalSignals: number;
  winRate: number;
  mg1Stats?: {
    winsDirect: number;
    winsMG1: number;
    lossesMG1: number;
    lossesDirect: number;
  };
}

const SessionStats = ({ wins, losses, totalSignals, winRate, mg1Stats }: SessionStatsProps) => {
  const wd = mg1Stats?.winsDirect ?? wins;
  const wm = mg1Stats?.winsMG1 ?? 0;
  const lm = mg1Stats?.lossesMG1 ?? losses;
  const ld = mg1Stats?.lossesDirect ?? 0;
  const total = wd + wm + lm + ld;

  const wrColor = winRate >= 70 ? 'text-win' : winRate >= 55 ? 'text-pending' : 'text-loss';
  const wrBarColor = winRate >= 70 ? 'bg-win' : winRate >= 55 ? 'bg-pending' : 'bg-loss';

  return (
    <div className="space-y-3">
      {/* Win Rate Hero */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className={`h-4 w-4 ${wrColor}`} />
            <span className="font-mono text-xs text-muted-foreground tracking-wider">WIN RATE</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{total} sinais</span>
        </div>
        <div className="flex items-end gap-2">
          <span className={`font-mono text-3xl font-bold ${wrColor}`}>{winRate.toFixed(1)}%</span>
        </div>
        <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
          <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${wrBarColor}`} style={{ width: `${Math.min(winRate, 100)}%` }} />
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={TrendingUp} label="Win Direto" value={wd} colorClass="text-win" bgClass="bg-win/10" />
        <StatCard icon={Shield} label="Win MG1" value={wm} colorClass="text-pending" bgClass="bg-pending/10" />
        <StatCard icon={ShieldAlert} label="Loss MG1" value={lm} colorClass="text-loss" bgClass="bg-loss/10" />
        <StatCard icon={TrendingDown} label="Loss Direto" value={ld} colorClass="text-muted-foreground" bgClass="bg-muted/30" />
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value, colorClass, bgClass }: {
  icon: React.ElementType;
  label: string;
  value: number;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={`rounded-lg border border-border p-3 ${bgClass} flex items-center gap-3`}>
      <Icon className={`h-4 w-4 ${colorClass} shrink-0`} />
      <div className="min-w-0">
        <span className={`font-mono text-lg font-bold ${colorClass} block leading-tight`}>{value}</span>
        <span className="font-mono text-[10px] text-muted-foreground block truncate">{label}</span>
      </div>
    </div>
  );
}

export default SessionStats;