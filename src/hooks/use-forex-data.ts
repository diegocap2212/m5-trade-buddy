import { useState, useEffect, useRef, useCallback } from 'react';
import type { CandleData, Timeframe } from '@/lib/trading-types';
import type { WsStatus } from './use-binance-ws';
import {
  getOrCreateForexCandles,
  updateForexCache,
  getBasePrice,
  getVolatility,
} from '@/lib/forex-candle-cache';

// Re-export for backward compatibility (tests etc.)
export { generateHistoricalCandles } from '@/lib/forex-candle-cache';

const CANDLE_BUFFER = 200;
const POLL_INTERVAL_MS = 3000;

const EMPTY: CandleData[] = [];

export function useForexData(pair: string, timeframe: Timeframe, enabled = true) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const currentPairRef = useRef(pair);
  const currentTfRef = useRef(timeframe);
  const priceRef = useRef(getBasePrice(pair));
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startPolling = useCallback(() => {
    const vol = getVolatility(pair);
    const intervalMs = timeframe === 'M1' ? 60_000 : 300_000;

    timerRef.current = setInterval(() => {
      if (currentPairRef.current !== pair || currentTfRef.current !== timeframe) return;

      setCandles(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const now = Date.now();
        const currentCandleTs = Math.floor(now / intervalMs) * intervalMs;

        let updated: CandleData[];
        if (last.timestamp === currentCandleTs) {
          const move = (Math.random() - 0.5) * vol;
          const newClose = +(last.close + move).toFixed(5);
          priceRef.current = newClose;
          const updatedCandle: CandleData = {
            ...last,
            high: Math.max(last.high, newClose),
            low: Math.min(last.low, newClose),
            close: newClose,
          };
          updated = [...prev.slice(0, -1), updatedCandle];
        } else {
          const open = priceRef.current;
          const move = (Math.random() - 0.5) * vol;
          const close = +(open + move).toFixed(5);
          priceRef.current = close;
          const newCandle: CandleData = {
            open, high: Math.max(open, close), low: Math.min(open, close), close,
            volume: Math.floor(Math.random() * 5000 + 500), timestamp: currentCandleTs,
          };
          const next = [...prev, newCandle];
          updated = next.length > CANDLE_BUFFER ? next.slice(-CANDLE_BUFFER) : next;
        }

        // Sync to shared cache so scanner sees the same data
        updateForexCache(pair, timeframe, updated);
        return updated;
      });
    }, POLL_INTERVAL_MS);
  }, [pair, timeframe]);

  useEffect(() => {
    if (!enabled) {
      clearInterval(timerRef.current);
      setCandles([]);
      setStatus('disconnected');
      return;
    }

    currentPairRef.current = pair;
    currentTfRef.current = timeframe;
    priceRef.current = getBasePrice(pair);

    setCandles([]);
    setStatus('connecting');

    // Use shared cache — deterministic, same data scanner will see
    const historical = getOrCreateForexCandles(pair, timeframe, 50);
    priceRef.current = historical[historical.length - 1].close;
    setCandles(historical);
    setStatus('connected');

    startPolling();

    return () => { clearInterval(timerRef.current); };
  }, [pair, timeframe, enabled, startPolling]);

  return { candles: enabled ? candles : EMPTY, status: enabled ? status : ('disconnected' as WsStatus) };
}
