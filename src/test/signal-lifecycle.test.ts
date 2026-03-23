import { describe, it, expect } from 'vitest';
import { backtestCandles } from '@/lib/signal-engine';
import type { CandleData } from '@/lib/trading-types';

function makeCandle(timestamp: number, close: number, open?: number): CandleData {
  const o = open ?? close;
  return { timestamp, open: o, high: Math.max(o, close) + 0.5, low: Math.min(o, close) - 0.5, close, volume: 100 };
}

describe('Signal lifecycle', () => {
  it('every backtest signal has a resolvedTimestamp', () => {
    const candles: CandleData[] = [];
    const baseTime = Date.now() - 60 * 60_000;
    for (let i = 0; i < 50; i++) {
      const price = 100 + Math.sin(i * 0.5) * 5;
      candles.push(makeCandle(baseTime + i * 60_000, price, price - 0.5));
    }

    const result = backtestCandles(candles, 'TEST/USD');
    
    for (const signal of result.signals) {
      expect(signal.resolvedTimestamp).toBeDefined();
      expect(signal.resolvedTimestamp).toBeInstanceOf(Date);
      expect(signal.resolvedTimestamp!.getTime()).toBeGreaterThan(signal.timestamp.getTime());
      expect(signal.result).not.toBe('PENDING');
      expect(signal.resultDetail).toBeDefined();
    }
  });

  it('resolvedTimestamp matches expected candle for WIN_DIRECT vs MG1 vs MG2', () => {
    const candles: CandleData[] = [];
    const baseTime = Date.now() - 70 * 60_000;
    for (let i = 0; i < 70; i++) {
      const price = 100 + Math.sin(i * 0.3) * 8;
      candles.push(makeCandle(baseTime + i * 60_000, price, price - 1));
    }

    const result = backtestCandles(candles, 'TEST/USD');

    for (const signal of result.signals) {
      const entryIdx = candles.findIndex(c => c.timestamp === signal.timestamp.getTime());
      if (entryIdx < 0) continue;

      const resolvedTime = signal.resolvedTimestamp!.getTime();
      if (signal.resultDetail === 'WIN_DIRECT') {
        expect(resolvedTime).toBe(candles[entryIdx + 1].timestamp);
      } else if (signal.resultDetail === 'WIN_MG1') {
        expect(resolvedTime).toBe(candles[entryIdx + 2].timestamp);
      } else {
        // WIN_MG2 or LOSS_MG2 — resolved at i+3
        expect(resolvedTime).toBe(candles[entryIdx + 3].timestamp);
      }
    }
  });

  it('signalHistory slice(0,10) returns newest signals', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      id: `sig-${i}`,
      timestamp: new Date(Date.now() - i * 60_000),
    }));

    const recent = history.slice(0, 10);
    expect(recent[0].id).toBe('sig-0');
    expect(recent[9].id).toBe('sig-9');
  });
});
