import { useState, useEffect, useRef, useCallback } from 'react';
import type { CandleData, Timeframe } from '@/lib/trading-types';
import type { WsStatus } from './use-binance-ws';

const CANDLE_BUFFER = 200;
const POLL_INTERVAL_MS = 3000;

// Base prices for forex pairs (approximate)
const FOREX_BASE_PRICES: Record<string, number> = {
  'EUR/USD': 1.0850, 'EUR/GBP': 0.8580, 'AUD/JPY': 97.50, 'NZD/USD': 0.5920,
  'EUR/JPY': 162.50, 'GBP/USD': 1.2650, 'AUD/CAD': 0.8950, 'USD/CAD': 1.3650,
  'USD/JPY': 149.80, 'CAD/JPY': 109.70, 'CHF/JPY': 170.20, 'EUR/NZD': 1.8320,
  'AUD/CHF': 0.5730, 'EUR/AUD': 1.6580, 'GBP/CHF': 1.1250, 'GBP/AUD': 1.9320,
  'GBP/JPY': 189.50, 'USD/CHF': 0.8780, 'NZD/JPY': 88.60, 'EUR/CHF': 0.9530,
  'CAD/CHF': 0.6430, 'EUR/CAD': 1.4820, 'AUD/NZD': 1.0950, 'AUD/USD': 0.6540,
  'NZD/CHF': 0.5230, 'GBP/CAD': 1.7280, 'GBP/NZD': 2.1380, 'NZD/CAD': 0.8090,
};

function getVolatility(pair: string): number {
  const base = FOREX_BASE_PRICES[pair] ?? 1;
  if (pair.includes('JPY')) return base * 0.0003;
  return base * 0.00015;
}

/** Exported for testing */
export function generateHistoricalCandles(pair: string, timeframe: Timeframe, count: number): CandleData[] {
  const intervalMs = timeframe === 'M1' ? 60_000 : 300_000;
  const now = Date.now();
  const startTs = Math.floor(now / intervalMs) * intervalMs - (count * intervalMs);
  const vol = getVolatility(pair);
  let price = FOREX_BASE_PRICES[pair] ?? 1;

  const candles: CandleData[] = [];
  for (let i = 0; i < count; i++) {
    const ts = startTs + i * intervalMs;
    const open = price;
    const move1 = (Math.random() - 0.5) * vol * 2;
    const move2 = (Math.random() - 0.5) * vol * 2;
    const high = Math.max(open, open + Math.abs(move1) + Math.abs(move2) * 0.3);
    const low = Math.min(open, open - Math.abs(move2) - Math.abs(move1) * 0.3);
    const close = open + (Math.random() - 0.5) * vol * 2;
    price = close;
    candles.push({
      open: +open.toFixed(5),
      high: +high.toFixed(5),
      low: +low.toFixed(5),
      close: +close.toFixed(5),
      volume: Math.floor(Math.random() * 10000 + 1000),
      timestamp: ts,
    });
  }
  return candles;
}

const EMPTY: CandleData[] = [];

export function useForexData(pair: string, timeframe: Timeframe, enabled = true) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const currentPairRef = useRef(pair);
  const currentTfRef = useRef(timeframe);
  const priceRef = useRef(FOREX_BASE_PRICES[pair] ?? 1);
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

        if (last.timestamp === currentCandleTs) {
          const move = (Math.random() - 0.5) * vol;
          const newClose = +(last.close + move).toFixed(5);
          priceRef.current = newClose;
          const updated: CandleData = {
            ...last,
            high: Math.max(last.high, newClose),
            low: Math.min(last.low, newClose),
            close: newClose,
          };
          return [...prev.slice(0, -1), updated];
        }

        const open = priceRef.current;
        const move = (Math.random() - 0.5) * vol;
        const close = +(open + move).toFixed(5);
        priceRef.current = close;
        const newCandle: CandleData = {
          open, high: Math.max(open, close), low: Math.min(open, close), close,
          volume: Math.floor(Math.random() * 5000 + 500), timestamp: currentCandleTs,
        };
        const next = [...prev, newCandle];
        return next.length > CANDLE_BUFFER ? next.slice(-CANDLE_BUFFER) : next;
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
    priceRef.current = FOREX_BASE_PRICES[pair] ?? 1;

    setCandles([]);
    setStatus('connecting');

    const historical = generateHistoricalCandles(pair, timeframe, 50);
    priceRef.current = historical[historical.length - 1].close;
    setCandles(historical);
    setStatus('connected');

    startPolling();

    return () => { clearInterval(timerRef.current); };
  }, [pair, timeframe, enabled, startPolling]);

  return { candles: enabled ? candles : EMPTY, status: enabled ? status : ('disconnected' as WsStatus) };
}
