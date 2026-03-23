export type SignalDirection = 'CALL' | 'PUT' | 'WAIT';
export type SignalResult = 'WIN' | 'LOSS' | 'PENDING';
export type ResultDetail = 'WIN_DIRECT' | 'WIN_MG1' | 'WIN_MG2' | 'LOSS_MG1' | 'LOSS_MG2' | 'LOSS_DIRECT';
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
