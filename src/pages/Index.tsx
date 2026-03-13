import { useState } from 'react';
import AssetSelector from '@/components/trading/AssetSelector';
import CandleCountdown from '@/components/trading/CandleCountdown';
import ConnectionStatus from '@/components/trading/ConnectionStatus';
import SignalCard from '@/components/trading/SignalCard';
import SignalHistory from '@/components/trading/SignalHistory';
import SessionStats from '@/components/trading/SessionStats';
import { useTradingEngine } from '@/hooks/use-trading-engine';
import { Activity } from 'lucide-react';

const Index = () => {
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const { currentSignal, signalHistory, connected, wins, losses, totalSignals, winRate } =
    useTradingEngine(selectedAsset);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Top Bar */}
        <header className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="font-mono text-sm font-bold text-foreground tracking-wider">
              TRADING HUD
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <AssetSelector value={selectedAsset} onValueChange={setSelectedAsset} />
            <CandleCountdown />
            <ConnectionStatus connected={connected} />
          </div>
        </header>

        {/* Session Stats */}
        <SessionStats wins={wins} losses={losses} totalSignals={totalSignals} winRate={winRate} />

        {/* Main Signal */}
        {currentSignal ? (
          <SignalCard
            direction={currentSignal.direction}
            confidence={currentSignal.confidence}
            price={currentSignal.price}
            support={currentSignal.support}
            resistance={currentSignal.resistance}
            pattern={currentSignal.pattern}
          />
        ) : (
          <div className="flex items-center justify-center h-48 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground font-mono text-sm animate-pulse">
              Carregando sinais...
            </p>
          </div>
        )}

        {/* Signal History */}
        <SignalHistory
          signals={signalHistory}
          sessionWinRate={winRate}
          totalSignals={totalSignals}
          wins={wins}
          losses={losses}
        />

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground font-mono">
          Dados simulados — Conecte uma API para dados reais
        </p>
      </div>
    </div>
  );
};

export default Index;
