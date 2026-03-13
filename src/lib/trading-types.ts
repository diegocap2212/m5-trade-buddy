export type SignalDirection = 'CALL' | 'PUT' | 'WAIT';
export type SignalResult = 'WIN' | 'LOSS' | 'PENDING';
export type ResultDetail = 'WIN_DIRECT' | 'WIN_MG1' | 'LOSS_MG1' | 'LOSS_DIRECT';
export type MacroBias = 'BULL' | 'BEAR' | 'NEUTRAL';
export type Timeframe = 'M1' | 'M5';
export type DataSource = 'binance' | 'forex-api';
export type AssetCategory = 'crypto' | 'forex';

export interface TradingSignal {
  id: string;
  asset: string;
  direction: SignalDirection;
  confidence: number;
  price: number;
  support: number;
  resistance: number;
  pattern: string;
  timestamp: Date;
  result: SignalResult;
  ema200Bias?: MacroBias;
  rsi?: number;
  stochK?: number;
  stochD?: number;
  confluences?: string[];
  resultDetail?: ResultDetail;
  resolvedTimestamp?: Date;
}

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
  volume: number;
}

export interface CryptoAsset {
  pair: string;
  label: string;
  payout: number;
  basePrice: number;
  source: DataSource;
  category: AssetCategory;
}

export const CRYPTO_ASSETS: CryptoAsset[] = [
  // ── Crypto (Binance) ──
  { pair: 'BTC/USD', label: 'Bitcoin', payout: 83, basePrice: 97224.86, source: 'binance', category: 'crypto' },
  { pair: 'ETH/USD', label: 'Ethereum', payout: 83, basePrice: 1844.62, source: 'binance', category: 'crypto' },
  { pair: 'SOL/USD', label: 'Solana', payout: 98, basePrice: 149.73, source: 'binance', category: 'crypto' },
  { pair: 'BNB/USD', label: 'BNB', payout: 83, basePrice: 601.81, source: 'binance', category: 'crypto' },
  { pair: 'XRP/USD', label: 'Ripple', payout: 86, basePrice: 2.3064, source: 'binance', category: 'crypto' },
  { pair: 'ADA/USD', label: 'Cardano', payout: 86, basePrice: 0.7226, source: 'binance', category: 'crypto' },
  { pair: 'DOGE/USD', label: 'Dogecoin', payout: 86, basePrice: 0.1985, source: 'binance', category: 'crypto' },
  { pair: 'LTC/USD', label: 'Litecoin', payout: 83, basePrice: 84.55, source: 'binance', category: 'crypto' },
  { pair: 'XLM/USD', label: 'Stellar', payout: 80, basePrice: 0.2723, source: 'binance', category: 'crypto' },

  // ── Forex ──
  { pair: 'EUR/USD', label: 'Euro/Dólar', payout: 86, basePrice: 1.0850, source: 'forex-api', category: 'forex' },
  { pair: 'EUR/GBP', label: 'Euro/Libra', payout: 86, basePrice: 0.8580, source: 'forex-api', category: 'forex' },
  { pair: 'AUD/JPY', label: 'Aussie/Iene', payout: 86, basePrice: 97.50, source: 'forex-api', category: 'forex' },
  { pair: 'NZD/USD', label: 'Kiwi/Dólar', payout: 86, basePrice: 0.5920, source: 'forex-api', category: 'forex' },
  { pair: 'EUR/JPY', label: 'Euro/Iene', payout: 82, basePrice: 162.50, source: 'forex-api', category: 'forex' },
  { pair: 'GBP/USD', label: 'Libra/Dólar', payout: 82, basePrice: 1.2650, source: 'forex-api', category: 'forex' },
  { pair: 'AUD/CAD', label: 'Aussie/CAD', payout: 82, basePrice: 0.8950, source: 'forex-api', category: 'forex' },
  { pair: 'USD/CAD', label: 'Dólar/CAD', payout: 82, basePrice: 1.3650, source: 'forex-api', category: 'forex' },
  { pair: 'USD/JPY', label: 'Dólar/Iene', payout: 82, basePrice: 149.80, source: 'forex-api', category: 'forex' },
  { pair: 'CAD/JPY', label: 'CAD/Iene', payout: 82, basePrice: 109.70, source: 'forex-api', category: 'forex' },
  { pair: 'CHF/JPY', label: 'Franco/Iene', payout: 82, basePrice: 170.20, source: 'forex-api', category: 'forex' },
  { pair: 'EUR/NZD', label: 'Euro/Kiwi', payout: 80, basePrice: 1.8320, source: 'forex-api', category: 'forex' },
  { pair: 'AUD/CHF', label: 'Aussie/Franco', payout: 80, basePrice: 0.5730, source: 'forex-api', category: 'forex' },
  { pair: 'EUR/AUD', label: 'Euro/Aussie', payout: 80, basePrice: 1.6580, source: 'forex-api', category: 'forex' },
  { pair: 'GBP/CHF', label: 'Libra/Franco', payout: 80, basePrice: 1.1250, source: 'forex-api', category: 'forex' },
  { pair: 'GBP/AUD', label: 'Libra/Aussie', payout: 80, basePrice: 1.9320, source: 'forex-api', category: 'forex' },
  { pair: 'GBP/JPY', label: 'Libra/Iene', payout: 80, basePrice: 189.50, source: 'forex-api', category: 'forex' },
  { pair: 'USD/CHF', label: 'Dólar/Franco', payout: 80, basePrice: 0.8780, source: 'forex-api', category: 'forex' },
  { pair: 'NZD/JPY', label: 'Kiwi/Iene', payout: 80, basePrice: 88.60, source: 'forex-api', category: 'forex' },
  { pair: 'EUR/CHF', label: 'Euro/Franco', payout: 80, basePrice: 0.9530, source: 'forex-api', category: 'forex' },
  { pair: 'CAD/CHF', label: 'CAD/Franco', payout: 80, basePrice: 0.6430, source: 'forex-api', category: 'forex' },
  { pair: 'EUR/CAD', label: 'Euro/CAD', payout: 80, basePrice: 1.4820, source: 'forex-api', category: 'forex' },
  { pair: 'AUD/NZD', label: 'Aussie/Kiwi', payout: 80, basePrice: 1.0950, source: 'forex-api', category: 'forex' },
  { pair: 'AUD/USD', label: 'Aussie/Dólar', payout: 80, basePrice: 0.6540, source: 'forex-api', category: 'forex' },
  { pair: 'NZD/CHF', label: 'Kiwi/Franco', payout: 80, basePrice: 0.5230, source: 'forex-api', category: 'forex' },
  { pair: 'GBP/CAD', label: 'Libra/CAD', payout: 80, basePrice: 1.7280, source: 'forex-api', category: 'forex' },
  { pair: 'GBP/NZD', label: 'Libra/Kiwi', payout: 80, basePrice: 2.1380, source: 'forex-api', category: 'forex' },
  { pair: 'NZD/CAD', label: 'Kiwi/CAD', payout: 80, basePrice: 0.8090, source: 'forex-api', category: 'forex' },
];

export const ALL_PAIRS = CRYPTO_ASSETS.map(a => a.pair);
export const CRYPTO_PAIRS = CRYPTO_ASSETS.filter(a => a.category === 'crypto').map(a => a.pair);
export const FOREX_PAIRS = CRYPTO_ASSETS.filter(a => a.category === 'forex').map(a => a.pair);

export function getAssetSource(pair: string): DataSource {
  const asset = CRYPTO_ASSETS.find(a => a.pair === pair);
  return asset?.source ?? 'binance';
}

export function getAssetCategory(pair: string): AssetCategory {
  const asset = CRYPTO_ASSETS.find(a => a.pair === pair);
  return asset?.category ?? 'crypto';
}
