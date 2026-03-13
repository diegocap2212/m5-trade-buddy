import { useState, useEffect } from 'react';
import type { TradingSignal, CandleData, Timeframe } from '@/lib/trading-types';
import { CRYPTO_ASSETS } from '@/lib/trading-types';
import { analyzeMarket } from '@/lib/signal-engine';

function generateMockCandle(basePrice: number): CandleData {
  const variance = basePrice * 0.001;
  const open = basePrice + (Math.random() - 0.5) * variance;
  const close = open + (Math.random() - 0.5) * variance;
  const high = Math.max(open, close) + Math.random() * variance * 0.5;
  const low = Math.min(open, close) - Math.random() * variance * 0.5;
  const volume = 100 + Math.floor(Math.random() * 500);
  return { open, high, low, close, timestamp: Date.now(), volume };
}

export function useTradingEngine(selectedAsset: string, timeframe: Timeframe) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  const [signalHistory, setSignalHistory] = useState<TradingSignal[]>([]);
  const [connected, setConnected] = useState(false);

  const asset = CRYPTO_ASSETS.find(a => a.pair === selectedAsset);
  const basePrice = asset?.basePrice || 1.0;

  // Update interval: M1 = 5s, M5 = 10s
  const updateInterval = timeframe === 'M1' ? 5000 : 10000;

  useEffect(() => {
    const timer = setTimeout(() => setConnected(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Initialize candles
  useEffect(() => {
    const initial: CandleData[] = [];
    let price = basePrice;
    for (let i = 0; i < 30; i++) {
      const candle = generateMockCandle(price);
      initial.push(candle);
      price = candle.close;
    }
    setCandles(initial);
  }, [basePrice, selectedAsset]);

  // Update signal
  useEffect(() => {
    if (candles.length === 0) return;

    const updateSignal = () => {
      const newCandle = generateMockCandle(candles[candles.length - 1]?.close || basePrice);
      setCandles(prev => [...prev.slice(-39), newCandle]);

      const allCandles = [...candles.slice(-39), newCandle];
      const analysis = analyzeMarket(allCandles, selectedAsset);
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
    };

    updateSignal();
    const interval = setInterval(updateSignal, updateInterval);
    return () => clearInterval(interval);
  }, [candles.length > 0, selectedAsset, updateInterval]);

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
      }, timeframe === 'M1' ? 8000 : 15000);
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
    wins,
    losses,
    totalSignals: signalHistory.length,
    winRate,
    consecutiveLosses,
  };
}
