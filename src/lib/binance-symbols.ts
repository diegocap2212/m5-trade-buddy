import type { Timeframe } from './trading-types';

/** Maps NovaDexy pair (e.g. "BTC/USD") → Binance stream symbol (e.g. "btcusdt") */
const PAIR_TO_BINANCE: Record<string, string> = {
  'BTC/USD': 'btcusdt',
  'ETH/USD': 'ethusdt',
  'SOL/USD': 'solusdt',
  'BNB/USD': 'bnbusdt',
  'XRP/USD': 'xrpusdt',
  'ADA/USD': 'adausdt',
  'DOGE/USD': 'dogeusdt',
  'LTC/USD': 'ltcusdt',
  'XLM/USD': 'xlmusdt',
};

export function getBinanceSymbol(pair: string): string {
  return PAIR_TO_BINANCE[pair] ?? pair.replace('/', '').toLowerCase();
}

export function getBinanceInterval(tf: Timeframe): string {
  return tf === 'M1' ? '1m' : '5m';
}

/** Multiple WebSocket endpoints for failover — ordered by reliability */
const WS_ENDPOINTS = [
  'wss://stream.binance.com:9443/ws',
  'wss://stream.binance.com:443/ws',
  'wss://data-stream.binance.com/ws',
];

export function getBinanceStreamUrls(pair: string, tf: Timeframe): string[] {
  const symbol = getBinanceSymbol(pair);
  const interval = getBinanceInterval(tf);
  const stream = `${symbol}@kline_${interval}`;
  return WS_ENDPOINTS.map(base => `${base}/${stream}`);
}

/** Keep legacy single-URL for compatibility */
export function getBinanceStreamUrl(pair: string, tf: Timeframe): string {
  return getBinanceStreamUrls(pair, tf)[0];
}
