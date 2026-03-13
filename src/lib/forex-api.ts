/**
 * Twelve Data API client for real Forex OHLC candle data.
 * Free tier: 8 requests/min, 800/day.
 * We only fetch the ACTIVE pair in real-time; scanner uses cached snapshots.
 */
import type { CandleData, Timeframe } from './trading-types';

const API_BASE = 'https://api.twelvedata.com';

// Rate-limit tracker
let requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 7; // leave 1 margin

function canMakeRequest(): boolean {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(t => now - t < 60_000);
  return requestTimestamps.length < MAX_REQUESTS_PER_MINUTE;
}

function recordRequest() {
  requestTimestamps.push(Date.now());
}

/** Convert pair format: "EUR/JPY" → "EUR/JPY" (Twelve Data uses same format) */
function toTwelveDataSymbol(pair: string): string {
  return pair; // Already in correct format
}

function toInterval(timeframe: Timeframe): string {
  return timeframe === 'M1' ? '1min' : '5min';
}

export type ForexApiStatus = 'ok' | 'rate_limited' | 'error' | 'no_key';

let cachedApiKey: string | null = null;

export function setForexApiKey(key: string) {
  cachedApiKey = key;
}

export function getForexApiKey(): string | null {
  // Check for key set programmatically first, then env
  if (cachedApiKey) return cachedApiKey;
  
  // Try import.meta.env (Vite)
  const envKey = (import.meta as any).env?.VITE_TWELVEDATA_API_KEY;
  if (envKey) return envKey;
  
  return null;
}

export interface ForexApiResult {
  candles: CandleData[];
  status: ForexApiStatus;
}

/**
 * Fetch OHLC candles from Twelve Data API.
 * Returns empty array + status if rate limited or error.
 */
export async function fetchForexCandles(
  pair: string,
  timeframe: Timeframe,
  count = 50
): Promise<ForexApiResult> {
  const apiKey = getForexApiKey();
  if (!apiKey) {
    return { candles: [], status: 'no_key' };
  }

  if (!canMakeRequest()) {
    console.warn('[ForexAPI] Rate limited, skipping request for', pair);
    return { candles: [], status: 'rate_limited' };
  }

  try {
    recordRequest();
    const symbol = toTwelveDataSymbol(pair);
    const interval = toInterval(timeframe);
    const url = `${API_BASE}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${count}&apikey=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[ForexAPI] HTTP error', res.status, 'for', pair);
      return { candles: [], status: 'error' };
    }

    const data = await res.json();
    
    // Check for API error responses
    if (data.status === 'error') {
      console.warn('[ForexAPI] API error:', data.message);
      return { candles: [], status: 'error' };
    }

    if (!data.values || !Array.isArray(data.values)) {
      console.warn('[ForexAPI] No values in response for', pair);
      return { candles: [], status: 'error' };
    }

    // Twelve Data returns newest first, we need oldest first
    const candles: CandleData[] = data.values
      .map((v: any): CandleData => ({
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: 0, // Forex spot doesn't have real volume in Twelve Data free tier
        timestamp: new Date(v.datetime).getTime(),
      }))
      .reverse();

    return { candles, status: 'ok' };
  } catch (err) {
    console.warn('[ForexAPI] Fetch error for', pair, err);
    return { candles: [], status: 'error' };
  }
}

/**
 * Get remaining requests in current minute window.
 */
export function getRemainingRequests(): number {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(t => now - t < 60_000);
  return Math.max(0, MAX_REQUESTS_PER_MINUTE - requestTimestamps.length);
}
