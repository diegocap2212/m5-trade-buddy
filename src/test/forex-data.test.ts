import { describe, it, expect } from 'vitest';
import { generateHistoricalCandles } from '@/hooks/use-forex-data';

describe('generateHistoricalCandles', () => {
  it('generates correct number of candles', () => {
    const candles = generateHistoricalCandles('EUR/USD', 'M5', 50);
    expect(candles).toHaveLength(50);
  });

  it('timestamps are monotonically increasing', () => {
    const candles = generateHistoricalCandles('EUR/USD', 'M1', 30);
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i].timestamp).toBeGreaterThan(candles[i - 1].timestamp);
    }
  });

  it('M1 candles are spaced 60s apart', () => {
    const candles = generateHistoricalCandles('EUR/USD', 'M1', 10);
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i].timestamp - candles[i - 1].timestamp).toBe(60_000);
    }
  });

  it('M5 candles are spaced 300s apart', () => {
    const candles = generateHistoricalCandles('GBP/USD', 'M5', 10);
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i].timestamp - candles[i - 1].timestamp).toBe(300_000);
    }
  });

  it('OHLCV values are consistent (low <= open/close, high >= open/close)', () => {
    const candles = generateHistoricalCandles('USD/JPY', 'M5', 50);
    for (const c of candles) {
      expect(c.high).toBeGreaterThanOrEqual(c.open);
      expect(c.high).toBeGreaterThanOrEqual(c.close);
      expect(c.low).toBeLessThanOrEqual(c.open);
      expect(c.low).toBeLessThanOrEqual(c.close);
      expect(c.volume).toBeGreaterThan(0);
    }
  });

  it('works with JPY pairs (higher volatility)', () => {
    const candles = generateHistoricalCandles('USD/JPY', 'M1', 20);
    expect(candles).toHaveLength(20);
    // JPY prices should be in reasonable range
    for (const c of candles) {
      expect(c.open).toBeGreaterThan(100);
      expect(c.open).toBeLessThan(200);
    }
  });
});
