import { TrendingUp, Shield, ShieldAlert, TrendingDown, Target, DollarSign, Flame } from 'lucide-react';
import { CRYPTO_ASSETS } from '@/lib/trading-types';

interface SessionStatsProps {
  wins: number;
  losses: number;
  totalSignals: number;
  winRate: number;
  mg1Stats?: {
    winsDirect: number;
    winsMG1: number;
    winsMG2: number;
    lossesMG1: number;
    lossesMG2: number;
    lossesDirect: number;
  };
  operating?: boolean;
  capital?: number;
  selectedAsset?: string;
}

const SessionStats = ({ wins, losses, totalSignals, winRate, mg1Stats, operating, capital = 0, selectedAsset }: SessionStatsProps) => {
  const wd = mg1Stats?.winsDirect ?? wins;
  const wm1 = mg1Stats?.winsMG1 ?? 0;
  const wm2 = mg1Stats?.winsMG2 ?? 0;
  const lm1 = mg1Stats?.lossesMG1 ?? 0;
  const lm2 = mg1Stats?.lossesMG2 ?? losses;
  const ld = mg1Stats?.lossesDirect ?? 0;
  const total = wd + wm1 + wm2 + lm1 + lm2 + ld;

  const wrColor = winRate >= 70 ? 'text-win' : winRate >= 55 ? 'text-pending' : 'text-loss';
  const wrBarColor = winRate >= 70 ? 'bg-win' : winRate >= 55 ? 'bg-pending' : 'bg-loss';

  // P&L calculation when operating
  const asset = CRYPTO_ASSETS.find(a => a.pair === selectedAsset);
  const payout = asset?.payout ?? 85;
  const baseEntry = capital * 0.02;
  const mg1Entry = (baseEntry + baseEntry * (payout / 100)) / (payout / 100);
  const mg2Entry = (baseEntry + mg1Entry + (baseEntry + mg1Entry) * (payout / 100)) / (payout / 100);
  
  const pnl = operating ? (
    wd * (baseEntry * payout / 100) +
    wm1 * (mg1Entry * payout / 100 - baseEntry) +
    wm2 * (mg2Entry * payout / 100 - baseEntry - mg1Entry) -
    lm2 * (baseEntry + mg1Entry + mg2Entry) -
    lm1 * (baseEntry + mg1Entry) -
    ld * baseEntry
  ) : 0;

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

        {/* P&L when operating */}
        {operating && capital > 0 && (
          <div className={`flex items-center justify-between mt-2 pt-2 border-t border-border`}>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">P&L SESSÃO</span>
            </div>
            <span className={`font-mono text-sm font-bold ${pnl >= 0 ? 'text-win' : 'text-loss'}`}>
              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Detail Grid — 3x2 for MG2 */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={TrendingUp} label="Win Direto" value={wd} colorClass="text-win" bgClass="bg-win/10" />
        <StatCard icon={Shield} label="Win MG1" value={wm1} colorClass="text-pending" bgClass="bg-pending/10" />
        <StatCard icon={Flame} label="Win MG2" value={wm2} colorClass="text-[#ff6d00]" bgClass="bg-[#ff6d00]/10" />
        <StatCard icon={ShieldAlert} label="Loss MG1" value={lm1} colorClass="text-muted-foreground" bgClass="bg-muted/30" />
        <StatCard icon={ShieldAlert} label="Loss MG2" value={lm2} colorClass="text-loss" bgClass="bg-loss/10" />
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
    <div className={`rounded-lg border border-border p-2.5 ${bgClass} flex items-center gap-2`}>
      <Icon className={`h-3.5 w-3.5 ${colorClass} shrink-0`} />
      <div className="min-w-0">
        <span className={`font-mono text-base font-bold ${colorClass} block leading-tight`}>{value}</span>
        <span className="font-mono text-[9px] text-muted-foreground block truncate">{label}</span>
      </div>
    </div>
  );
}

export default SessionStats;
