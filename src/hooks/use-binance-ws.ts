import { useState, useEffect, useRef, useCallback } from 'react';
import type { CandleData, Timeframe } from '@/lib/trading-types';
import { getBinanceStreamUrl, getBinanceSymbol, getBinanceInterval } from '@/lib/binance-symbols';

const CANDLE_BUFFER = 200;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface BinanceKline {
  t: number; // open time
  o: string; // open
  h: string; // high
  l: string; // low
  c: string; // close
  v: string; // volume
  x: boolean; // is closed
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
  const reconnectDelay = useRef(RECONNECT_DELAY);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const shouldConnect = useRef(true);

  // Fetch initial candles via REST
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

  const connect = useCallback(() => {
    if (!shouldConnect.current) return;

    const url = getBinanceStreamUrl(pair, timeframe);
    setStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      reconnectDelay.current = RECONNECT_DELAY;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg.k) return;
        const kline: BinanceKline = msg.k;
        const candle = klineToCandle(kline);

        setCandles((prev) => {
          // If candle is closed, push new; otherwise update last
          if (kline.x) {
            const updated = [...prev, candle];
            return updated.slice(-CANDLE_BUFFER);
          }
          // Update the current (last) candle in-place
          if (prev.length === 0) return [candle];
          const last = prev[prev.length - 1];
          if (last.timestamp === candle.timestamp) {
            return [...prev.slice(0, -1), candle];
          }
          // New candle started but not closed yet
          return [...prev, candle].slice(-CANDLE_BUFFER);
        });
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!shouldConnect.current) {
        setStatus('disconnected');
        return;
      }
      setStatus('reconnecting');
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, MAX_RECONNECT_DELAY);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [pair, timeframe]);

  useEffect(() => {
    shouldConnect.current = true;

    // Load historical candles, then open stream
    fetchInitialCandles().then((initial) => {
      if (initial.length > 0) setCandles(initial);
      connect();
    });

    return () => {
      shouldConnect.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [pair, timeframe, connect, fetchInitialCandles]);

  return { candles, status };
}
