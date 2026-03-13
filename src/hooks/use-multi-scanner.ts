import { useState, useEffect, useRef, useCallback } from 'react';
import { getBinanceSymbol, getBinanceInterval } from '@/lib/binance-symbols';
import { analyzeMarket, type SignalAnalysis } from '@/lib/signal-engine';
import type { CandleData, Timeframe } from '@/lib/trading-types';
import { CRYPTO_PAIRS, FOREX_PAIRS } from '@/lib/trading-types';
import { getForexSnapshot } from '@/lib/forex-candle-cache';

const SCAN_INTERVAL = 15_000;
const CANDLE_FETCH_LIMIT = 50;
const MIN_CONFIDENCE = 85;

export interface ScannerOpportunity {
  asset: string;
  analysis: SignalAnalysis;
  timestamp: number;
  /** When the entry should happen (T-1s before candle close) */
  entryTimestamp: number;
  /** When the candle closes */
  closeTimestamp: number;
  /** Opportunity expires after this (close + 1 candle margin) */
  expiresAt: number;
  /** Whether user committed this opportunity (clicked ABRIR) */
  committed?: boolean;
}

async function fetchBinanceCandles(pair: string, timeframe: Timeframe): Promise<CandleData[]> {
  try {
    const symbol = getBinanceSymbol(pair).toUpperCase();
    const interval = getBinanceInterval(timeframe);
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${CANDLE_FETCH_LIMIT}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[][]).map((k): CandleData => ({
      open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5], timestamp: k[0],
    }));
  } catch { return []; }
}

export function useMultiScanner(activeAsset: string, timeframe: Timeframe) {
  const [opportunities, setOpportunities] = useState<ScannerOpportunity[]>([]);
  const [scanning, setScanning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const lastAlertRef = useRef<Record<string, number>>({});

  const intervalMs = timeframe === 'M1' ? 60_000 : 300_000;

  const scan = useCallback(async () => {
    const cryptoToScan = CRYPTO_PAIRS.filter(p => p !== activeAsset);
    const forexToScan = FOREX_PAIRS.filter(p => p !== activeAsset);
    setScanning(true);

    const results: ScannerOpportunity[] = [];
    const now = Date.now();
    const nextClose = Math.ceil(now / intervalMs) * intervalMs;
    const entryTs = nextClose - 1000;
    const expiresAt = nextClose + intervalMs; // 1 candle margin after close

    const processCandles = (asset: string, candles: CandleData[]) => {
      if (candles.length < 20) return null;
      const analysis = analyzeMarket(candles, asset);
      if (!analysis || analysis.direction === 'WAIT' || analysis.confidence < MIN_CONFIDENCE) return null;

      const key = `${asset}_${analysis.direction}`;
      const lastAlert = lastAlertRef.current[key] || 0;
      if (Date.now() - lastAlert < 60_000) return null;

      lastAlertRef.current[key] = Date.now();
      return {
        asset,
        analysis,
        timestamp: Date.now(),
        entryTimestamp: entryTs,
        closeTimestamp: nextClose,
        expiresAt,
      };
    };

    // Scan crypto in batches of 3
    for (let i = 0; i < cryptoToScan.length; i += 3) {
      const batch = cryptoToScan.slice(i, i + 3);
      const promises = batch.map(async (asset) => {
        const candles = await fetchBinanceCandles(asset, timeframe);
        return processCandles(asset, candles);
      });
      const batchResults = await Promise.all(promises);
      for (const r of batchResults) if (r) results.push(r);
    }

    // Scan forex using shared cache (deterministic, same data as chart)
    for (const asset of forexToScan) {
      const candles = getForexSnapshot(asset, timeframe, CANDLE_FETCH_LIMIT);
      const r = processCandles(asset, candles);
      if (r) results.push(r);
    }

    setOpportunities(prev => {
      const now = Date.now();
      // Filter by expiresAt instead of fixed 60s TTL
      const recent = prev.filter(o =>
        o.expiresAt > now &&
        o.asset !== activeAsset &&
        !results.some(r => r.asset === o.asset)
      );
      const merged = [...results, ...recent];
      const byAsset = new Map<string, ScannerOpportunity>();
      for (const o of merged) byAsset.set(o.asset, o);
      return Array.from(byAsset.values()).sort((a, b) => b.analysis.confidence - a.analysis.confidence);
    });

    setScanning(false);
  }, [activeAsset, timeframe, intervalMs]);

  useEffect(() => {
    const initialTimeout = setTimeout(scan, 3000);
    timerRef.current = setInterval(scan, SCAN_INTERVAL);
    return () => { clearTimeout(initialTimeout); clearInterval(timerRef.current); };
  }, [scan]);

  // Remove active asset from opportunities
  useEffect(() => {
    setOpportunities(prev => prev.filter(o => o.asset !== activeAsset));
  }, [activeAsset]);

  // Expire opportunities based on expiresAt
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setOpportunities(prev => {
        const filtered = prev.filter(o => o.expiresAt > now);
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const dismissOpportunity = useCallback((asset: string) => {
    setOpportunities(prev => prev.filter(o => o.asset !== asset));
  }, []);

  return { opportunities, scanning, dismissOpportunity };
}
