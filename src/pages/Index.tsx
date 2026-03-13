import { useState } from 'react';
import AssetSelector from '@/components/trading/AssetSelector';
import CandleCountdown from '@/components/trading/CandleCountdown';
import ConnectionStatus from '@/components/trading/ConnectionStatus';
import CandlestickChart from '@/components/trading/CandlestickChart';
import SignalHistory from '@/components/trading/SignalHistory';
import SessionStats from '@/components/trading/SessionStats';
import RiskManager from '@/components/trading/RiskManager';
import MarketSession from '@/components/trading/MarketSession';
import { useTradingEngine } from '@/hooks/use-trading-engine';
import { Activity } from 'lucide-react';
import type { Timeframe } from '@/lib/trading-types';

const Index = () => {
  const [selectedAsset, setSelectedAsset] = useState('BTC/USD');
  const [timeframe, setTimeframe] = useState<Timeframe>('M5');
  const { currentSignal, signalHistory, candles, connected, connectionStatus, wins, losses, totalSignals, winRate, consecutiveLosses } =
    useTradingEngine(selectedAsset, timeframe);

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
            <CandleCountdown timeframe={timeframe} onTimeframeChange={setTimeframe} />
            <ConnectionStatus connected={connected} status={connectionStatus} />
          </div>
        </header>

        {/* Market Session */}
        <MarketSession />

        {/* Candlestick Chart with signals */}
        <CandlestickChart
          candles={candles}
          currentSignal={currentSignal}
          signalHistory={signalHistory}
        />

        {/* Session Stats */}
        <SessionStats wins={wins} losses={losses} totalSignals={totalSignals} winRate={winRate} />

        {/* Risk Manager */}
        <RiskManager
          consecutiveLosses={consecutiveLosses}
          totalLosses={losses}
          totalSignals={totalSignals}
        />

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
          Dados em tempo real via Binance — Motor de 3 camadas com confluência
        </p>
      </div>
    </div>
  );
};

export default Index;
