import { useState, useEffect, useCallback } from 'react';
import type { TradingSignal, CandleData } from '@/lib/trading-types';
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

const BASE_PRICES: Record<string, number> = {
  'EUR/USD': 1.08750, 'GBP/USD': 1.27200, 'USD/JPY': 149.500,
  'AUD/USD': 0.65400, 'USD/CAD': 1.36200, 'EUR/GBP': 0.85500,
  'EUR/JPY': 162.600, 'GBP/JPY': 190.100, 'NZD/USD': 0.61200,
  'USD/CHF': 0.88100,
  'BTC/USD': 93575.5, 'ETH/USD': 3337.28, 'SOL/USD': 189.63,
  'BNB/USD': 695.40, 'XRP/USD': 2.18, 'LTC/USD': 105.00,
  'EUR/USD (OTC)': 1.08700, 'GBP/USD (OTC)': 1.27100, 'USD/JPY (OTC)': 149.400,
  'AUD/USD (OTC)': 0.65300, 'EUR/GBP (OTC)': 0.85400, 'GBP/JPY (OTC)': 189.900,
};

export function useTradingEngine(selectedAsset: string) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  const [signalHistory, setSignalHistory] = useState<TradingSignal[]>([]);
  const [connected, setConnected] = useState(false);

  const basePrice = BASE_PRICES[selectedAsset] || 1.0;

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

  // Update signal every 10 seconds
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
    const interval = setInterval(updateSignal, 10000);
    return () => clearInterval(interval);
  }, [candles.length > 0, selectedAsset]);

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
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [currentSignal?.id]);

  const wins = signalHistory.filter(s => s.result === 'WIN').length;
  const losses = signalHistory.filter(s => s.result === 'LOSS').length;
  const decided = wins + losses;
  const winRate = decided > 0 ? (wins / decided) * 100 : 0;

  // Consecutive losses
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
