import { describe, it, expect } from 'vitest';
import { calculateEMA, calculateRSI, calculateBollingerBands, calculateVWAP, calculateATR, detectCandlePatterns, calculateStochastic } from '@/lib/trading-indicators';
import type { CandleData } from '@/lib/trading-types';

function makeCandles(closes: number[], volume = 100): CandleData[] {
  return closes.map((c, i) => ({
    open: c - 0.5,
    high: c + 1,
    low: c - 1,
    close: c,
    timestamp: 1000000 + i * 60000,
    volume,
  }));
}

describe('calculateEMA', () => {
  it('returns correct length', () => {
    const candles = makeCandles([10, 11, 12, 13, 14]);
    const ema = calculateEMA(candles, 3);
    expect(ema).toHaveLength(5);
  });

  it('first value equals first close', () => {
    const candles = makeCandles([50, 51, 52]);
    const ema = calculateEMA(candles, 3);
    expect(ema[0]).toBe(50);
  });
});

describe('calculateRSI', () => {
  it('returns 50 for insufficient data', () => {
    const candles = makeCandles([10, 11]);
    expect(calculateRSI(candles, 14)).toBe(50);
  });

  it('returns high RSI for consistently rising prices', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    const candles = makeCandles(prices);
    const rsi = calculateRSI(candles, 14);
    expect(rsi).toBe(100);
  });

  it('returns low RSI for consistently falling prices', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 - i);
    const candles = makeCandles(prices);
    const rsi = calculateRSI(candles, 14);
    expect(rsi).toBe(0);
  });
});

describe('calculateBollingerBands', () => {
  it('returns valid bands for 20 candles', () => {
    const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i) * 5);
    const candles = makeCandles(prices);
    const bb = calculateBollingerBands(candles, 20);
    expect(bb.upper).toBeGreaterThan(bb.middle);
    expect(bb.lower).toBeLessThan(bb.middle);
  });

  it('handles less than period candles gracefully', () => {
    const candles = makeCandles([10, 11, 12]);
    const bb = calculateBollingerBands(candles, 20);
    expect(bb.middle).toBe(12);
  });
});

describe('calculateVWAP', () => {
  it('returns 0 for empty array', () => {
    expect(calculateVWAP([])).toBe(0);
  });

  it('returns typical price for single candle', () => {
    const candles: CandleData[] = [{ open: 10, high: 12, low: 8, close: 10, timestamp: 1000, volume: 100 }];
    expect(calculateVWAP(candles)).toBe(10); // (12+8+10)/3 = 10
  });
});

describe('calculateATR', () => {
  it('returns 0 for single candle', () => {
    const candles = makeCandles([10]);
    expect(calculateATR(candles)).toBe(0);
  });

  it('returns positive value for multiple candles', () => {
    const candles = makeCandles([10, 12, 11, 13, 10, 14]);
    expect(calculateATR(candles)).toBeGreaterThan(0);
  });
});

describe('calculateStochastic', () => {
  it('returns default for insufficient data', () => {
    const candles = makeCandles([10, 11]);
    const result = calculateStochastic(candles, 5);
    expect(result.k).toBe(50);
  });
});

describe('detectCandlePatterns', () => {
  it('returns null for less than 3 candles', () => {
    const candles = makeCandles([10, 11]);
    expect(detectCandlePatterns(candles)).toBeNull();
  });

  it('detects hammer pattern', () => {
    const candles: CandleData[] = [
      { open: 10, high: 11, low: 9, close: 10, timestamp: 1000, volume: 100 },
      { open: 10, high: 11, low: 9, close: 10, timestamp: 2000, volume: 100 },
      { open: 10, high: 10.2, low: 7, close: 10.1, timestamp: 3000, volume: 100 }, // long lower wick
    ];
    const pattern = detectCandlePatterns(candles);
    expect(pattern?.bullish).toBe(true);
  });
});
