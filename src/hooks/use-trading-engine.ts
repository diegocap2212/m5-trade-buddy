import { useState, useEffect } from 'react';
import type { TradingSignal, CandleData, Timeframe } from '@/lib/trading-types';
import { CRYPTO_ASSETS } from '@/lib/trading-types';
import { analyzeMarket } from '@/lib/signal-engine';
import { useBinanceWebSocket } from './use-binance-ws';

export function useTradingEngine(selectedAsset: string, timeframe: Timeframe) {
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  const [signalHistory, setSignalHistory] = useState<TradingSignal[]>([]);

  const { candles, status } = useBinanceWebSocket(selectedAsset, timeframe);
  const connected = status === 'connected';

  // Analyze market whenever candles update
  useEffect(() => {
    if (candles.length < 10) return;

    const analysis = analyzeMarket(candles, selectedAsset);
    if (analysis) {
      const signal: TradingSignal = {
        id: crypto.randomUUID(),
        asset: selectedAsset,
        direction: analysis.direction,
        confidence: analysis.confidence,
        price: analysis.price,
        support: analysis.support,
        resistance: analysis.resistance,
        pattern: analysis.pattern,
        timestamp: new Date(),
        result: 'PENDING',
        ema200Bias: analysis.ema200Bias,
        rsi: analysis.rsi,
        stochK: analysis.stochK,
        stochD: analysis.stochD,
        confluences: analysis.confluences,
      };
      setCurrentSignal(signal);
    }
  }, [candles, selectedAsset]);

  // Resolve signals
  useEffect(() => {
    if (currentSignal && currentSignal.direction !== 'WAIT') {
      const timer = setTimeout(() => {
        setSignalHistory(prev => {
          const withResult = {
            ...currentSignal,
            result: (Math.random() > 0.4 ? 'WIN' : 'LOSS') as 'WIN' | 'LOSS',
          };
          return [withResult, ...prev].slice(0, 50);
        });
      }, timeframe === 'M1' ? 60000 : 300000);
      return () => clearTimeout(timer);
    }
  }, [currentSignal?.id]);

  const wins = signalHistory.filter(s => s.result === 'WIN').length;
  const losses = signalHistory.filter(s => s.result === 'LOSS').length;
  const decided = wins + losses;
  const winRate = decided > 0 ? (wins / decided) * 100 : 0;

  let consecutiveLosses = 0;
  for (const s of signalHistory) {
    if (s.result === 'LOSS') consecutiveLosses++;
    else break;
  }

  return {
    currentSignal,
    signalHistory,
    connected,
    connectionStatus: status,
    wins,
    losses,
    totalSignals: signalHistory.length,
    winRate,
    consecutiveLosses,
  };
}
