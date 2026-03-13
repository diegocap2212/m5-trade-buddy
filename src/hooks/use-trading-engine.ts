import { useState, useEffect, useCallback } from 'react';
import type { TradingSignal, SignalDirection, CandleData } from '@/lib/trading-types';

// Simulated candle data generator (will be replaced by real API)
function generateMockCandle(basePrice: number): CandleData {
  const variance = basePrice * 0.001;
  const open = basePrice + (Math.random() - 0.5) * variance;
  const close = open + (Math.random() - 0.5) * variance;
  const high = Math.max(open, close) + Math.random() * variance * 0.5;
  const low = Math.min(open, close) - Math.random() * variance * 0.5;
  return { open, high, low, close, timestamp: Date.now() };
}

// Detect candle patterns
function detectPattern(candles: CandleData[]): { pattern: string; bullish: boolean } | null {
  if (candles.length < 3) return null;
  
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const body = Math.abs(last.close - last.open);
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const range = last.high - last.low;
  
  // Pin Bar (martelo / estrela cadente)
  if (range > 0 && lowerWick > body * 2 && upperWick < body * 0.5) {
    return { pattern: 'Pin Bar (Martelo)', bullish: true };
  }
  if (range > 0 && upperWick > body * 2 && lowerWick < body * 0.5) {
    return { pattern: 'Pin Bar (Estrela Cadente)', bullish: false };
  }
  
  // Engolfo
  const prevBody = Math.abs(prev.close - prev.open);
  if (body > prevBody * 1.3) {
    if (last.close > last.open && prev.close < prev.open) {
      return { pattern: 'Engolfo de Alta', bullish: true };
    }
    if (last.close < last.open && prev.close > prev.open) {
      return { pattern: 'Engolfo de Baixa', bullish: false };
    }
  }
  
  // Doji
  if (range > 0 && body / range < 0.1) {
    return { pattern: 'Doji', bullish: Math.random() > 0.5 };
  }
  
  return null;
}

// Calculate support/resistance from candles
function calculateLevels(candles: CandleData[]): { support: number; resistance: number } {
  if (candles.length === 0) return { support: 0, resistance: 0 };
  
  const lows = candles.map(c => c.low);
  const highs = candles.map(c => c.high);
  
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
}

// Generate signal based on S/R + patterns
function generateSignal(
  candles: CandleData[],
  asset: string,
): Omit<TradingSignal, 'id' | 'timestamp' | 'result'> | null {
  if (candles.length < 5) return null;
  
  const pattern = detectPattern(candles);
  const { support, resistance } = calculateLevels(candles);
  const currentPrice = candles[candles.length - 1].close;
  const range = resistance - support;
  
  if (!pattern || range === 0) {
    return {
      asset,
      direction: 'WAIT' as SignalDirection,
      confidence: 30 + Math.floor(Math.random() * 20),
      price: currentPrice,
      support,
      resistance,
      pattern: 'Sem padrão claro',
    };
  }
  
  const distToSupport = (currentPrice - support) / range;
  const distToResistance = (resistance - currentPrice) / range;
  
  let direction: SignalDirection = 'WAIT';
  let confidence = 40;
  
  // CALL: price near support + bullish pattern
  if (distToSupport < 0.3 && pattern.bullish) {
    direction = 'CALL';
    confidence = 65 + Math.floor((1 - distToSupport) * 25);
  }
  // PUT: price near resistance + bearish pattern
  else if (distToResistance < 0.3 && !pattern.bullish) {
    direction = 'PUT';
    confidence = 65 + Math.floor((1 - distToResistance) * 25);
  }
  
  return {
    asset,
    direction,
    confidence: Math.min(95, confidence),
    price: currentPrice,
    support,
    resistance,
    pattern: pattern.pattern,
  };
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

  // Simulate connection
  useEffect(() => {
    const timer = setTimeout(() => setConnected(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Generate candles periodically (simulating M5 data feed)
  useEffect(() => {
    // Initialize with some historical candles
    const initial: CandleData[] = [];
    let price = basePrice;
    for (let i = 0; i < 20; i++) {
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
      setCandles(prev => [...prev.slice(-29), newCandle]);
      
      const signalData = generateSignal([...candles.slice(-29), newCandle], selectedAsset);
      if (signalData) {
        const signal: TradingSignal = {
          ...signalData,
          id: crypto.randomUUID(),
          timestamp: new Date(),
          result: 'PENDING',
        };
        setCurrentSignal(signal);
      }
    };

    updateSignal();
    const interval = setInterval(updateSignal, 10000);
    return () => clearInterval(interval);
  }, [candles.length > 0, selectedAsset]);

  // Resolve pending signals after some time (simulate result)
  const resolveSignal = useCallback((signalId: string, result: 'WIN' | 'LOSS') => {
    setSignalHistory(prev =>
      prev.map(s => s.id === signalId ? { ...s, result } : s)
    );
  }, []);

  // When a new signal comes and old one was CALL/PUT, add old to history
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

  return {
    currentSignal,
    signalHistory,
    connected,
    wins,
    losses,
    totalSignals: signalHistory.length,
    winRate,
    resolveSignal,
  };
}
