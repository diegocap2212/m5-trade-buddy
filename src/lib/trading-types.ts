export type SignalDirection = 'CALL' | 'PUT' | 'WAIT';
export type SignalResult = 'WIN' | 'LOSS' | 'PENDING';
export type ResultDetail = 'WIN_DIRECT' | 'WIN_MG1' | 'LOSS_MG1' | 'LOSS_DIRECT';
export type MacroBias = 'BULL' | 'BEAR' | 'NEUTRAL';
export type Timeframe = 'M1' | 'M5';

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
  payout: number; // percentage e.g. 83
  basePrice: number;
}

export const CRYPTO_ASSETS: CryptoAsset[] = [
  { pair: 'BTC/USD', label: 'Bitcoin', payout: 83, basePrice: 97224.86 },
  { pair: 'LTC/USD', label: 'Litecoin', payout: 83, basePrice: 84.55 },
  { pair: 'ADA/USD', label: 'Cardano', payout: 86, basePrice: 0.7226 },
  { pair: 'BNB/USD', label: 'BNB', payout: 83, basePrice: 601.81 },
  { pair: 'XRP/USD', label: 'Ripple', payout: 86, basePrice: 2.3064 },
  { pair: 'ETH/USD', label: 'Ethereum', payout: 83, basePrice: 1844.62 },
  { pair: 'SOL/USD', label: 'Solana', payout: 98, basePrice: 149.73 },
  { pair: 'DOGE/USD', label: 'Dogecoin', payout: 86, basePrice: 0.1985 },
  { pair: 'XLM/USD', label: 'Stellar', payout: 80, basePrice: 0.2723 },
];

export const ALL_PAIRS = CRYPTO_ASSETS.map(a => a.pair);
