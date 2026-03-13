import { useState } from 'react';
import AssetSelector from '@/components/trading/AssetSelector';
import CandleCountdown from '@/components/trading/CandleCountdown';
import ConnectionStatus from '@/components/trading/ConnectionStatus';
import CandlestickChart from '@/components/trading/CandlestickChart';
import SignalHistory from '@/components/trading/SignalHistory';
import SessionStats from '@/components/trading/SessionStats';
import RiskManager from '@/components/trading/RiskManager';
import MarketSession from '@/components/trading/MarketSession';
import GlobalAssertiveness from '@/components/trading/GlobalAssertiveness';
import OperatingModeToggle from '@/components/trading/OperatingModeToggle';
import OpportunityBanner from '@/components/trading/OpportunityBanner';
import { useTradingEngine } from '@/hooks/use-trading-engine';
import { useMultiScanner } from '@/hooks/use-multi-scanner';
import { Activity, Volume2, VolumeX, FileBarChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Timeframe } from '@/lib/trading-types';
import { isMuted, setMuted } from '@/lib/sound-alerts';

const Index = () => {
  const [selectedAsset, setSelectedAsset] = useState('BTC/USD');
  const [timeframe, setTimeframe] = useState<Timeframe>('M5');
  const [soundMuted, setSoundMuted] = useState(false);
  const [operating, setOperating] = useState(false);
  const [capital, setCapital] = useState(1000);

  const toggleMute = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    setMuted(next);
  };
  const { currentSignal, signalHistory, candles, connected, connectionStatus, wins, losses, totalSignals, winRate, consecutiveLosses, entryTime, martingaleTime, mg1Stats } =
    useTradingEngine(selectedAsset, timeframe);
  const { opportunities, scanning, dismissOpportunity } = useMultiScanner(selectedAsset, timeframe);

  return (
    <div className="min-h-screen bg-background p-3 md:p-5">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header */}
        <header className="flex items-center justify-between bg-card/80 backdrop-blur-sm border border-border rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold text-foreground tracking-wider leading-tight">
                TRADING HUD
              </h1>
              <span className="font-mono text-[10px] text-muted-foreground">Exhaustion Reversal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/relatorio">
              <button className="h-8 px-2.5 rounded-lg border border-border bg-secondary/50 flex items-center gap-1.5 hover:bg-secondary transition-colors font-mono text-[10px] text-muted-foreground">
                <FileBarChart className="h-3.5 w-3.5" />
                Relatório
              </button>
            </Link>
            <OperatingModeToggle operating={operating} onToggle={setOperating} />
            <div className="w-px h-6 bg-border" />
            <AssetSelector value={selectedAsset} onValueChange={setSelectedAsset} />
            <CandleCountdown timeframe={timeframe} onTimeframeChange={setTimeframe} />
            <button
              onClick={toggleMute}
              className="h-8 w-8 rounded-lg border border-border bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
              title={soundMuted ? 'Ativar som' : 'Silenciar'}
            >
              {soundMuted ? <VolumeX className="h-3.5 w-3.5 text-muted-foreground" /> : <Volume2 className="h-3.5 w-3.5 text-primary" />}
            </button>
            <ConnectionStatus connected={connected} status={connectionStatus} />
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Chart */}
          <div className="lg:col-span-4 space-y-2">
            <MarketSession />
            <CandlestickChart
              key={`${selectedAsset}_${timeframe}`}
              candles={candles}
              currentSignal={currentSignal}
              signalHistory={signalHistory}
              entryTime={entryTime}
              martingaleTime={martingaleTime}
              consecutiveLosses={consecutiveLosses}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <SessionStats
              wins={wins}
              losses={losses}
              totalSignals={totalSignals}
              winRate={winRate}
              mg1Stats={mg1Stats}
              operating={operating}
              capital={capital}
              selectedAsset={selectedAsset}
            />
            {operating && (
              <RiskManager
                consecutiveLosses={consecutiveLosses}
                totalLosses={losses}
                totalSignals={totalSignals}
                selectedAsset={selectedAsset}
                lastSignalResult={signalHistory.length > 0 ? signalHistory[0].result : undefined}
                capital={capital}
                onCapitalChange={setCapital}
              />
            )}
            <SignalHistory
              signals={signalHistory}
              sessionWinRate={winRate}
              totalSignals={totalSignals}
              wins={wins}
              losses={losses}
              selectedAsset={selectedAsset}
              timeframe={timeframe}
            />
          </div>
        </div>

        <GlobalAssertiveness refreshTrigger={signalHistory.length} />

        <p className="text-center font-mono text-[10px] text-muted-foreground/50 py-1">
          Dados em tempo real via Binance • Motor de 3 camadas com confluência
        </p>
      </div>
    </div>
  );
};

export default Index;
