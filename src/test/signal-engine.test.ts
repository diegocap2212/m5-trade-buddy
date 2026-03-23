import { describe, it, expect } from 'vitest';
import { analyzeMarket, backtestCandles } from '@/lib/signal-engine';
import type { CandleData } from '@/lib/trading-types';

function makeCandles(count: number, basePrice = 100): CandleData[] {
  return Array.from({ length: count }, (_, i) => ({
    open: basePrice + Math.sin(i * 0.3) * 2,
    high: basePrice + Math.sin(i * 0.3) * 2 + 1,
    low: basePrice + Math.sin(i * 0.3) * 2 - 1,
    close: basePrice + Math.sin(i * 0.3) * 2 + 0.2,
    timestamp: 1000000 + i * 60000,
    volume: 100 + Math.random() * 50,
  }));
}

describe('analyzeMarket', () => {
  it('returns null for insufficient candles', () => {
    const candles = makeCandles(10);
    expect(analyzeMarket(candles, 'BTC/USD')).toBeNull();
  });

  it('returns analysis object for 20+ candles', () => {
    const candles = makeCandles(25);
    const result = analyzeMarket(candles, 'BTC/USD');
    expect(result).not.toBeNull();
    expect(result!.direction).toMatch(/CALL|PUT|WAIT/);
    expect(result!.price).toBeGreaterThan(0);
  });

  it('returns WAIT for non-extreme conditions', () => {
    const candles = makeCandles(30, 100);
    const result = analyzeMarket(candles, 'BTC/USD');
    expect(result).not.toBeNull();
    expect(result!.direction).toBe('WAIT');
  });
});

describe('backtestCandles', () => {
  it('returns empty for fewer than 24 candles', () => {
    const candles = makeCandles(22);
    const result = backtestCandles(candles, 'BTC/USD');
    expect(result.signals).toHaveLength(0);
  });

  it('handles large dataset without errors', () => {
    const candles = makeCandles(200);
    const result = backtestCandles(candles, 'BTC/USD');
    expect(result.stats).toBeDefined();
    expect(result.stats.winsDirect + result.stats.winsMG1 + result.stats.winsMG2 + result.stats.lossesMG1 + result.stats.lossesMG2 + result.stats.lossesDirect)
      .toBe(result.signals.length);
  });

  it('stats include MG2 fields', () => {
    const candles = makeCandles(200);
    const result = backtestCandles(candles, 'BTC/USD');
    expect(result.stats).toHaveProperty('winsMG2');
    expect(result.stats).toHaveProperty('lossesMG2');
    expect(typeof result.stats.winsMG2).toBe('number');
    expect(typeof result.stats.lossesMG2).toBe('number');
  });
});
