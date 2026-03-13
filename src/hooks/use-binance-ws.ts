import { useState, useEffect, useRef, useCallback } from 'react';
import type { CandleData, Timeframe } from '@/lib/trading-types';
import { getBinanceStreamUrls, getBinanceSymbol, getBinanceInterval } from '@/lib/binance-symbols';

const CANDLE_BUFFER = 200;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 15000;
const HEALTH_CHECK_INTERVAL = 20000; // 20s — Binance sends frames ~every second
const STALE_THRESHOLD = 30000; // 30s without data → reconnect

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface BinanceKline {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
  x: boolean;
}

function klineToCandle(k: BinanceKline): CandleData {
  return {
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
    volume: parseFloat(k.v),
    timestamp: k.t,
  };
}

export function useBinanceWebSocket(pair: string, timeframe: Timeframe) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [status, setStatus] = useState<WsStatus>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const shouldConnect = useRef(true);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const healthTimer = useRef<ReturnType<typeof setInterval>>();
  const lastMessageTime = useRef<number>(0);
  const endpointIndex = useRef(0);
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY);
  const consecutiveFailures = useRef(0);

  // Fetch initial candles via REST (very stable)
  const fetchInitialCandles = useCallback(async () => {
    try {
      const symbol = getBinanceSymbol(pair).toUpperCase();
      const interval = getBinanceInterval(timeframe);
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${CANDLE_BUFFER}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data as any[][]).map((k): CandleData => ({
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        timestamp: k[0],
      }));
    } catch {
      return [];
    }
  }, [pair, timeframe]);

  const cleanup = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    clearInterval(healthTimer.current);
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!shouldConnect.current) return;
    cleanup();

    const urls = getBinanceStreamUrls(pair, timeframe);
    const url = urls[endpointIndex.current % urls.length];

    console.log(`[WS] Connecting to endpoint ${endpointIndex.current % urls.length}: ${url}`);
    setStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.log('[WS] Connection timeout, trying next endpoint');
        ws.close();
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('[WS] Connected successfully');
      setStatus('connected');
      reconnectDelay.current = INITIAL_RECONNECT_DELAY;
      consecutiveFailures.current = 0;
      lastMessageTime.current = Date.now();

      // Health check: detect stale connections
      clearInterval(healthTimer.current);
      healthTimer.current = setInterval(() => {
        const elapsed = Date.now() - lastMessageTime.current;
        if (elapsed > STALE_THRESHOLD && wsRef.current?.readyState === WebSocket.OPEN) {
          console.log(`[WS] No data for ${elapsed}ms, reconnecting...`);
          wsRef.current.close();
        }
      }, HEALTH_CHECK_INTERVAL);
    };

    ws.onmessage = (event) => {
      lastMessageTime.current = Date.now();
      try {
        const msg = JSON.parse(event.data);
        if (!msg.k) return;
        const kline: BinanceKline = msg.k;
        const candle = klineToCandle(kline);

        setCandles((prev) => {
          if (kline.x) {
            const updated = [...prev, candle];
            return updated.slice(-CANDLE_BUFFER);
          }
          if (prev.length === 0) return [candle];
          const last = prev[prev.length - 1];
          if (last.timestamp === candle.timestamp) {
            return [...prev.slice(0, -1), candle];
          }
          return [...prev, candle].slice(-CANDLE_BUFFER);
        });
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      clearTimeout(connectionTimeout);
      clearInterval(healthTimer.current);
      wsRef.current = null;

      if (!shouldConnect.current) {
        setStatus('disconnected');
        return;
      }

      consecutiveFailures.current++;
      setStatus('reconnecting');

      // Rotate endpoint after every 2 failures on same endpoint
      if (consecutiveFailures.current % 2 === 0) {
        endpointIndex.current++;
        console.log(`[WS] Switching to endpoint ${endpointIndex.current % urls.length}`);
      }

      const delay = Math.min(
        reconnectDelay.current * (1 + Math.random() * 0.3), // jitter
        MAX_RECONNECT_DELAY
      );
      console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${consecutiveFailures.current})`);

      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, MAX_RECONNECT_DELAY);
        connect();
      }, delay);
    };

    ws.onerror = () => {
      clearTimeout(connectionTimeout);
      ws.close();
    };
  }, [pair, timeframe, cleanup]);

  useEffect(() => {
    shouldConnect.current = true;
    endpointIndex.current = 0;
    consecutiveFailures.current = 0;
    reconnectDelay.current = INITIAL_RECONNECT_DELAY;

    fetchInitialCandles().then((initial) => {
      if (initial.length > 0) setCandles(initial);
      connect();
    });

    return () => {
      shouldConnect.current = false;
      cleanup();
    };
  }, [pair, timeframe, connect, fetchInitialCandles, cleanup]);

  return { candles, status };
}
