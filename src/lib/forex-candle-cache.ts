/**
 * Shared Forex candle cache.
 * Both `useForexData` and `useMultiScanner` consume this single source
 * to eliminate divergence between scanner opportunities and chart data.
 */
import type { CandleData, Timeframe } from './trading-types';

export type ForexDataSource = 'simulated' | 'twelvedata';

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

// ── Cache structure ──
interface CacheEntry {
  candles: CandleData[];
  lastPrice: number;
  generatedAt: number;
  source: ForexDataSource;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(pair: string, timeframe: Timeframe) {
  return `${pair}_${timeframe}`;
}

/**
 * Generate historical candles deterministically (seeded once per session per pair/tf).
 */
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
    const close = open + (Math.random() - 0.5) * vol * 2;
    const high = Math.max(open, close, open + Math.abs(move1) + Math.abs(move2) * 0.3);
    const low = Math.min(open, close, open - Math.abs(move2) - Math.abs(move1) * 0.3);
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

export function getOrCreateForexCandles(pair: string, timeframe: Timeframe, count = 50): CandleData[] {
  const key = cacheKey(pair, timeframe);
  const existing = cache.get(key);

  if (existing && existing.candles.length >= count) {
    return existing.candles.slice(-count);
  }

  const candles = generateHistoricalCandles(pair, timeframe, count);
  const lastPrice = candles[candles.length - 1].close;
  cache.set(key, { candles, lastPrice, generatedAt: Date.now(), source: 'simulated' });
  return candles;
}

export function getForexSnapshot(pair: string, timeframe: Timeframe, count = 50): CandleData[] {
  return getOrCreateForexCandles(pair, timeframe, count);
}

export function getForexCacheSource(pair: string, timeframe: Timeframe): ForexDataSource {
  const key = cacheKey(pair, timeframe);
  return cache.get(key)?.source ?? 'simulated';
}

export function setForexCacheSource(pair: string, timeframe: Timeframe, source: ForexDataSource) {
  const key = cacheKey(pair, timeframe);
  const existing = cache.get(key);
  if (existing) {
    existing.source = source;
  }
}

export function updateForexCache(pair: string, timeframe: Timeframe, candles: CandleData[]) {
  const key = cacheKey(pair, timeframe);
  const existing = cache.get(key);
  const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : (FOREX_BASE_PRICES[pair] ?? 1);
  cache.set(key, {
    candles: [...candles],
    lastPrice,
    generatedAt: Date.now(),
    source: existing?.source ?? 'simulated',
  });
}

export function getCachedLastPrice(pair: string, timeframe: Timeframe): number | null {
  const key = cacheKey(pair, timeframe);
  return cache.get(key)?.lastPrice ?? null;
}

export function getBasePrice(pair: string): number {
  return FOREX_BASE_PRICES[pair] ?? 1;
}

export { FOREX_BASE_PRICES, getVolatility };
