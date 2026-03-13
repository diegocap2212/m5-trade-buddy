import { useState, useEffect, useRef, useCallback } from 'react';
import type { CandleData, Timeframe } from '@/lib/trading-types';
import { getBinanceStreamUrls, getBinanceSymbol, getBinanceInterval } from '@/lib/binance-symbols';

const CANDLE_BUFFER = 200;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 15000;
const HEALTH_CHECK_INTERVAL = 20000;
const STALE_THRESHOLD = 30000;

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface BinanceKline {
  t: number; o: string; h: string; l: string; c: string; v: string; x: boolean;
}

const EMPTY: CandleData[] = [];

export function useBinanceWebSocket(pair: string, timeframe: Timeframe, enabled = true) {
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
  const currentPairRef = useRef(pair);
  const currentTfRef = useRef(timeframe);

  const parseKline = useCallback((data: string): { candle: CandleData; isClosed: boolean } | null => {
    try {
      const msg = JSON.parse(data);
      const k = msg.k;
      if (!k) return null;
      return {
        candle: { open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v, timestamp: k.t },
        isClosed: k.x,
      };
    } catch { return null; }
  }, []);

  const fetchInitialCandles = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      const symbol = getBinanceSymbol(pair).toUpperCase();
      const interval = getBinanceInterval(timeframe);
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${CANDLE_BUFFER}`,
        { signal: abortSignal }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data as any[][]).map((k): CandleData => ({
        open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5], timestamp: k[0],
      }));
    } catch { return []; }
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
    setStatus('connecting');

    const connPair = pair;
    const connTf = timeframe;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) ws.close();
    }, 5000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      setStatus('connected');
      reconnectDelay.current = INITIAL_RECONNECT_DELAY;
      consecutiveFailures.current = 0;
      lastMessageTime.current = Date.now();

      clearInterval(healthTimer.current);
      healthTimer.current = setInterval(() => {
        const elapsed = Date.now() - lastMessageTime.current;
        if (elapsed > STALE_THRESHOLD && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      }, HEALTH_CHECK_INTERVAL);
    };

    ws.onmessage = (event) => {
      if (currentPairRef.current !== connPair || currentTfRef.current !== connTf) {
        ws.close();
        return;
      }
      lastMessageTime.current = Date.now();
      const parsed = parseKline(event.data);
      if (!parsed) return;

      const { candle, isClosed } = parsed;
      setCandles((prev) => {
        const len = prev.length;
        if (isClosed) {
          if (len >= CANDLE_BUFFER) { const next = prev.slice(len - CANDLE_BUFFER + 1); next.push(candle); return next; }
          return [...prev, candle];
        }
        if (len === 0) return [candle];
        const last = prev[len - 1];
        if (last.timestamp === candle.timestamp) { const next = prev.slice(0, -1); next.push(candle); return next; }
        if (len >= CANDLE_BUFFER) { const next = prev.slice(len - CANDLE_BUFFER + 1); next.push(candle); return next; }
        return [...prev, candle];
      });
    };

    ws.onclose = () => {
      clearTimeout(connectionTimeout);
      clearInterval(healthTimer.current);
      wsRef.current = null;
      if (!shouldConnect.current) { setStatus('disconnected'); return; }
      if (currentPairRef.current !== connPair || currentTfRef.current !== connTf) return;

      consecutiveFailures.current++;
      setStatus('reconnecting');
      if (consecutiveFailures.current % 2 === 0) endpointIndex.current++;

      const delay = Math.min(reconnectDelay.current * (1 + Math.random() * 0.3), MAX_RECONNECT_DELAY);
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, MAX_RECONNECT_DELAY);
        connect();
      }, delay);
    };

    ws.onerror = () => { clearTimeout(connectionTimeout); ws.close(); };
  }, [pair, timeframe, cleanup, parseKline]);

  useEffect(() => {
    // ── DISABLED: return idle state ──
    if (!enabled) {
      cleanup();
      setCandles([]);
      setStatus('disconnected');
      return;
    }

    currentPairRef.current = pair;
    currentTfRef.current = timeframe;
    setCandles([]);
    shouldConnect.current = true;
    endpointIndex.current = 0;
    consecutiveFailures.current = 0;
    reconnectDelay.current = INITIAL_RECONNECT_DELAY;

    const abortController = new AbortController();
    fetchInitialCandles(abortController.signal).then((initial) => {
      if (currentPairRef.current === pair && currentTfRef.current === timeframe) {
        if (initial.length > 0) setCandles(initial);
        connect();
      }
    });

    return () => {
      shouldConnect.current = false;
      abortController.abort();
      cleanup();
    };
  }, [pair, timeframe, enabled, connect, fetchInitialCandles, cleanup]);

  return { candles: enabled ? candles : EMPTY, status: enabled ? status : ('disconnected' as WsStatus) };
}
