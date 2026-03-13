import { describe, it, expect } from 'vitest';
import { backtestCandles } from '@/lib/signal-engine';
import { calculateBollingerBands, calculateEMA, calculateVWAP } from '@/lib/trading-indicators';
import type { CandleData } from '@/lib/trading-types';

function makeCandles(count: number): CandleData[] {
  return Array.from({ length: count }, (_, i) => ({
    open: 100 + Math.sin(i * 0.1) * 10,
    high: 100 + Math.sin(i * 0.1) * 10 + 2,
    low: 100 + Math.sin(i * 0.1) * 10 - 2,
    close: 100 + Math.sin(i * 0.1) * 10 + Math.cos(i * 0.2),
    timestamp: 1000000 + i * 60000,
    volume: 100 + i,
  }));
}

describe('Performance', () => {
  it('backtestCandles with 1000 candles runs under 500ms', () => {
    const candles = makeCandles(1000);
    const start = performance.now();
    backtestCandles(candles, 'BTC/USD');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it('calculateBollingerBands with 200 candles runs under 10ms', () => {
    const candles = makeCandles(200);
    const start = performance.now();
    calculateBollingerBands(candles, 20);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10);
  });

  it('calculateEMA with 500 candles runs under 5ms', () => {
    const candles = makeCandles(500);
    const start = performance.now();
    calculateEMA(candles, 200);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });

  it('calculateVWAP with 500 candles runs under 5ms', () => {
    const candles = makeCandles(500);
    const start = performance.now();
    calculateVWAP(candles);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });
});
