import { useState, useEffect, useRef, useCallback } from 'react';
import type { CandleData, Timeframe } from '@/lib/trading-types';
import type { WsStatus } from './use-binance-ws';
import {
  getOrCreateForexCandles,
  updateForexCache,
  getBasePrice,
  getVolatility,
  setForexCacheSource,
  type ForexDataSource,
} from '@/lib/forex-candle-cache';
import { fetchForexCandles, getForexApiKey, type ForexApiStatus } from '@/lib/forex-api';

// Re-export for backward compatibility (tests etc.)
export { generateHistoricalCandles } from '@/lib/forex-candle-cache';

const CANDLE_BUFFER = 200;
const POLL_INTERVAL_MS = 3000;
const API_POLL_INTERVAL_MS = 15_000; // 15s for API polling (respect rate limits)

const EMPTY: CandleData[] = [];

export function useForexData(pair: string, timeframe: Timeframe, enabled = true) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const [dataSource, setDataSource] = useState<ForexDataSource>('simulated');
  const [apiStatus, setApiStatus] = useState<ForexApiStatus>('no_key');
  const currentPairRef = useRef(pair);
  const currentTfRef = useRef(timeframe);
  const priceRef = useRef(getBasePrice(pair));
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const apiTimerRef = useRef<ReturnType<typeof setInterval>>();
  const hasRealDataRef = useRef(false);

  // Try to fetch real data from Twelve Data API
  const fetchRealData = useCallback(async () => {
    if (currentPairRef.current !== pair || currentTfRef.current !== timeframe) return;
    
    const result = await fetchForexCandles(pair, timeframe, 50);
    setApiStatus(result.status);
    
    if (result.status === 'ok' && result.candles.length > 10) {
      hasRealDataRef.current = true;
      setDataSource('twelvedata');
      setForexCacheSource(pair, timeframe, 'twelvedata');
      
      const lastPrice = result.candles[result.candles.length - 1].close;
      priceRef.current = lastPrice;
      
      updateForexCache(pair, timeframe, result.candles);
      setCandles(result.candles);
      setStatus('connected');
    }
  }, [pair, timeframe]);

  // Simulated polling fallback (only runs if no real data)
  const startSimulatedPolling = useCallback(() => {
    const vol = getVolatility(pair);
    const intervalMs = timeframe === 'M1' ? 60_000 : 300_000;

    timerRef.current = setInterval(() => {
      if (currentPairRef.current !== pair || currentTfRef.current !== timeframe) return;
      if (hasRealDataRef.current) return; // Skip if we have real data

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

        updateForexCache(pair, timeframe, updated);
        return updated;
      });
    }, POLL_INTERVAL_MS);
  }, [pair, timeframe]);

  // API polling (fetches new data periodically)
  const startApiPolling = useCallback(() => {
    apiTimerRef.current = setInterval(() => {
      if (currentPairRef.current !== pair || currentTfRef.current !== timeframe) return;
      fetchRealData();
    }, API_POLL_INTERVAL_MS);
  }, [pair, timeframe, fetchRealData]);

  useEffect(() => {
    if (!enabled) {
      clearInterval(timerRef.current);
      clearInterval(apiTimerRef.current);
      setCandles([]);
      setStatus('disconnected');
      setDataSource('simulated');
      return;
    }

    currentPairRef.current = pair;
    currentTfRef.current = timeframe;
    priceRef.current = getBasePrice(pair);
    hasRealDataRef.current = false;

    setCandles([]);
    setStatus('connecting');
    setDataSource('simulated');

    // Start with cached/simulated data immediately
    const historical = getOrCreateForexCandles(pair, timeframe, 50);
    priceRef.current = historical[historical.length - 1].close;
    setCandles(historical);
    setStatus('connected');

    // Start simulated polling as fallback
    startSimulatedPolling();

    // Try to fetch real data from API
    const hasApiKey = !!getForexApiKey();
    if (hasApiKey) {
      // Initial fetch after short delay
      const initialTimeout = setTimeout(fetchRealData, 500);
      startApiPolling();
      return () => {
        clearInterval(timerRef.current);
        clearInterval(apiTimerRef.current);
        clearTimeout(initialTimeout);
      };
    }

    return () => {
      clearInterval(timerRef.current);
      clearInterval(apiTimerRef.current);
    };
  }, [pair, timeframe, enabled, startSimulatedPolling, startApiPolling, fetchRealData]);

  return {
    candles: enabled ? candles : EMPTY,
    status: enabled ? status : ('disconnected' as WsStatus),
    dataSource,
    apiStatus,
  };
}
