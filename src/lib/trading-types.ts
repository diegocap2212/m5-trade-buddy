export type SignalDirection = 'CALL' | 'PUT' | 'WAIT';
export type SignalResult = 'WIN' | 'LOSS' | 'PENDING';

export interface TradingSignal {
  id: string;
  asset: string;
  direction: SignalDirection;
  confidence: number; // 0-100
  price: number;
  support: number;
  resistance: number;
  pattern: string;
  timestamp: Date;
  result: SignalResult;
}

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

export const FOREX_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'NZD/USD', 'USD/CHF',
] as const;

export const OTC_PAIRS = [
  'EUR/USD (OTC)', 'GBP/USD (OTC)', 'USD/JPY (OTC)',
  'AUD/USD (OTC)', 'EUR/GBP (OTC)', 'GBP/JPY (OTC)',
] as const;

export const ALL_PAIRS = [...FOREX_PAIRS, ...OTC_PAIRS] as const;
